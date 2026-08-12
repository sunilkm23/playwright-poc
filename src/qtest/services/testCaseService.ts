/* eslint-disable @typescript-eslint/no-explicit-any */
import type { QTestClient } from '../client/qtestClient.js';
import type { QTestCase } from '../models/qtestResult.js';
import type { QTestCache } from '../utils/cache.js';
import type { FieldService, AutomationFieldIds } from './fieldService.js';

export interface TestCaseLookup {
  id: number;
  /** True when this Test Case was created by the reporter during this run. */
  created: boolean;
  /** Non-fatal warnings surfaced during lookup/creation. */
  warnings: string[];
}

/**
 * Finds existing Test Cases and creates missing ones.
 *
 * Flow:
 *   1. Return the cached id if already resolved this run.
 *   2. Search qTest by "Automation Content" (`~` operator).
 *      - If found  → reuse the existing TC and proceed to upload (no creation).
 *      - If NOT found → create a new TC under the supplied module with the
 *        correct Automation / Automation Content custom-field payload.
 *
 * Existing Test Cases are always reused — never recreated.
 */
export class TestCaseService {
  constructor(
    private readonly client: QTestClient,
    private readonly cache: QTestCache,
    private readonly fieldService: FieldService,
    private readonly autoApprove: boolean = true,
  ) {}

  async ensureTestCase(
    automationContent: string,
    tcName: string,
    moduleId: number,
  ): Promise<TestCaseLookup> {
    const warnings: string[] = [];

    // 1) Return from cache when already resolved.
    const cached = this.cache.get('testCases', automationContent);
    if (cached) {
      await this.ensureApproved(cached, warnings);
      return { id: cached, created: false, warnings };
    }

    // 2) Search by Automation Content — reuse if found.
    const bySearch = await this.searchByAutomationContent(automationContent, warnings);
    if (bySearch) {
      this.cache.set('testCases', automationContent, bySearch);
      await this.ensureApproved(bySearch, warnings);
      return { id: bySearch, created: false, warnings };
    }

    // 3) No TC found — create one under the cycle module using the full TC name.
    const created = await this.createTestCase(automationContent, tcName, moduleId);
    this.cache.set('testCases', automationContent, created);
    warnings.push(
      `Created new Test Case (id ${created}) for "${tcName}". ` +
        `Move it to the appropriate module and link requirements in qTest.`,
    );
    await this.ensureApproved(created, warnings);
    return { id: created, created: true, warnings };
  }

  private async ensureApproved(testCaseId: number, warnings: string[]): Promise<void> {
    if (!this.autoApprove) return;
    try {
      const detail = await this.client.get<any>(`/test-cases/${testCaseId}`);
      const version = String(detail.body?.version ?? '');
      if (/^[1-9][0-9]*\.0$/.test(version)) return;

      const approve = await this.client.put(`/test-cases/${testCaseId}/approve`, {});
      if (approve.ok) {
        warnings.push(
          `Test Case ${testCaseId} (version ${version || 'unknown'}) was force-approved. ` +
            `Verify its contents are correct in qTest.`,
        );
      } else {
        warnings.push(
          `Failed to approve Test Case ${testCaseId}: HTTP ${approve.statusCode}.`,
        );
      }
    } catch (e) {
      warnings.push(`Approval check failed for Test Case ${testCaseId}: ${(e as Error).message}`);
    }
  }

  private async searchByAutomationContent(
    automationContent: string,
    warnings: string[],
  ): Promise<number | null> {
    const search = await this.client.post<any>('/search', {
      object_type: 'test-cases',
      fields: ['id', 'name'],
      query: `'Automation Content' ~ '${automationContent}'`,
    });
    const items: any[] = Array.isArray(search.body?.items) ? search.body.items : [];
    if (items.length > 1) {
      warnings.push(
        `More than one Test Case matched Automation Content "${automationContent}". ` +
          `Merge duplicate test cases in qTest.`,
      );
    }
    return items.length > 0 ? items[0].id : null;
  }

  private async createTestCase(
    automationContent: string,
    tcName: string,
    moduleId: number,
  ): Promise<number> {
    const fields: AutomationFieldIds = await this.fieldService.getAutomationFieldIds();

    const properties: any[] = [];
    if (fields.automationFieldId) {
      properties.push({
        field_id: fields.automationFieldId,
        field_name: 'Automation',
        field_value: fields.automationYesValue ?? '711',
        field_value_name: 'Yes',
      });
    }
    if (fields.automationContentFieldId) {
      properties.push({
        field_id: fields.automationContentFieldId,
        field_name: 'Automation Content',
        field_value: automationContent,
      });
    }

    const body: any = { name: tcName, parent_id: moduleId };
    if (properties.length) body.properties = properties;
    body.automation_content = automationContent;

    const resp = await this.client.post<QTestCase>('/test-cases', body);
    if (!resp.ok || !resp.body?.id) {
      throw new Error(
        `[qTest] Failed to create test case "${tcName}": HTTP ${resp.statusCode} ${resp.raw.slice(0, 200)}`,
      );
    }
    return resp.body.id;
  }
}
