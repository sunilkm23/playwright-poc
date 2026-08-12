/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  Reporter,
  TestCase,
  TestResult,
  FullResult,
} from '@playwright/test/reporter';

import { loadQTestConfig, type QTestConfig } from '../qtest/config/qtestConfig.js';
import { QTestClient } from '../qtest/client/qtestClient.js';
import { QTestCache } from '../qtest/utils/cache.js';
import { mapStatus } from '../qtest/utils/statusMapper.js';
import { extractAutomationContent } from '../qtest/utils/automationContentParser.js';
import { resolveSuiteName } from '../qtest/utils/suiteNameResolver.js';
import { writeUploadSummary } from '../qtest/utils/summaryWriter.js';
import { ModuleService } from '../qtest/services/moduleService.js';
import { CycleService } from '../qtest/services/cycleService.js';
import { SuiteService } from '../qtest/services/suiteService.js';
import { TestCaseService } from '../qtest/services/testCaseService.js';
import { TestRunService } from '../qtest/services/testRunService.js';
import { TestLogService } from '../qtest/services/testLogService.js';
import { FieldService } from '../qtest/services/fieldService.js';
import type { ExecutionResult } from '../qtest/models/executionResult.js';
import type { UploadSummary } from '../qtest/models/qtestResult.js';

export default class QTestReporter implements Reporter {
  private cfg!: QTestConfig;
  private active = false;
  private readonly results: ExecutionResult[] = [];

  onBegin(): void {
    try {
      this.cfg = loadQTestConfig();
    } catch (e) {
      console.error(`❌ ${(e as Error).message}`);
      throw e;
    }
    this.active = this.cfg.enabled;
    if (this.active) {
      console.log(`📤 qTest reporter enabled → cycle ${this.cfg.cycleId}`);
    }
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    if (!this.active) return;

    const { automationContent, tcName } = extractAutomationContent(test);

    const endMs = Date.now();
    const startMs = endMs - result.duration;

    this.results.push({
      automationContent,
      tcName,
      testName: test.title,
      status: mapStatus(result.status),
      rawStatus: result.status,
      durationMs: result.duration,
      startTime: new Date(startMs).toISOString(),
      endTime: new Date(endMs).toISOString(),
      suiteName: resolveSuiteName(
        test,
        this.cfg.suiteStrategy,
        this.cfg.suiteName,
        this.cfg.includeProjectInSuite,
      ),
      note: buildNote(test, result),
    });
  }

  async onEnd(_: FullResult): Promise<void> {
    if (!this.active) return;

    if (this.results.length === 0) {
      console.log('ℹ️  qTest reporter: no test results to upload.');
      return;
    }

    const cache = new QTestCache(this.cfg.cacheFile);
    const client = new QTestClient(this.cfg);

    const moduleService = new ModuleService(client, cache);
    const cycleService = new CycleService(client, cache);
    const suiteService = new SuiteService(client, cache);
    const fieldService = new FieldService(client);
    const testCaseService = new TestCaseService(client, cache, fieldService, this.cfg.autoApprove);
    const testRunService = new TestRunService(client, cache);
    const testLogService = new TestLogService(client);

    const summary: UploadSummary = {
      cycleId: this.cfg.cycleId,
      totalTests: this.results.length,
      existingTestCases: 0,
      newTestCases: 0,
      testRunsCreated: 0,
      logsUploaded: 0,
      passed: 0,
      failed: 0,
      blocked: 0,
      result: 'SUCCESS',
      warnings: [],
    };
    const warnings = summary.warnings;

    try {
      const cycleId = await cycleService.resolveCycleId(this.cfg.cycleId);
      const moduleId = await moduleService.ensureCycleModule(
        this.cfg.orphanedModuleName,
        this.cfg.rootModuleName,
        this.cfg.cycleId,
      );

      const suiteIdByName = new Map<string, number>();
      const resolveSuite = async (name: string): Promise<number> => {
        const cached = suiteIdByName.get(name);
        if (cached !== undefined) return cached;
        const id = await suiteService.ensureSuite(name, cycleId);
        suiteIdByName.set(name, id);
        return id;
      };

      for (const r of this.results) {
        try {
          const suiteId = await resolveSuite(r.suiteName);

          const tc = await testCaseService.ensureTestCase(r.automationContent, r.tcName, moduleId);
          if (tc.created) summary.newTestCases++;
          else summary.existingTestCases++;

          for (const w of tc.warnings) {
            warnings.push(w);
            console.log(`⚠️  [qTest] ${w}`);
          }

          const runKey = `${r.suiteName}::${r.automationContent}`;
          const run = await testRunService.ensureTestRun(
            suiteId,
            tc.id,
            r.automationContent,
            runKey,
          );
          if (run.created) summary.testRunsCreated++;

          const ok = await testLogService.uploadStatus(run.id, r);
          if (ok) {
            summary.logsUploaded++;
            countStatus(summary, r.status);
          } else {
            summary.result = 'PARTIAL';
          }
        } catch (e) {
          summary.result = 'PARTIAL';
          console.log(`⚠️  [qTest] ${r.automationContent}: ${(e as Error).message}`);
        }
      }
    } catch (e) {
      summary.result = 'FAILED';
      console.error(`❌ [qTest] upload aborted: ${(e as Error).message}`);
    } finally {
      cache.save();
    }

    writeUploadSummary(summary);
  }
}

function countStatus(summary: UploadSummary, status: ExecutionResult['status']): void {
  if (status === 'PASSED') summary.passed++;
  else if (status === 'FAILED') summary.failed++;
  else if (status === 'BLOCKED') summary.blocked++;
}

function buildNote(test: TestCase, result: TestResult): string {
  const lines: string[] = [
    `Test: ${test.title}`,
    `Project: ${test.parent.project()?.name ?? 'default'}`,
    `Status: ${result.status}`,
    `Duration: ${result.duration}ms`,
  ];
  if (result.error?.message) {
    lines.push('', 'Error:', result.error.message.slice(0, 2000));
  }
  return lines.join('\n');
}
