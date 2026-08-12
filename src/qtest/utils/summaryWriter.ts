/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { UploadSummary } from '../models/qtestResult.js';

/** Render the upload summary to the console and persist it to disk. */
export function writeUploadSummary(summary: UploadSummary): void {
  const lines = [
    '',
    '─────────────────────────────────────────',
    '   qTest Upload Summary',
    '─────────────────────────────────────────',
    `   Cycle:                ${summary.cycleId}`,
    `   Total Tests:          ${summary.totalTests}`,
    `   Existing TCs:         ${summary.existingTestCases}`,
    `   New TCs Created:      ${summary.newTestCases}`,
    `   Test Runs Created:    ${summary.testRunsCreated}`,
    `   Execution Logs:       ${summary.logsUploaded}`,
    `   Passed:               ${summary.passed}`,
    `   Failed:               ${summary.failed}`,
    `   Blocked:              ${summary.blocked}`,
    `   Warnings:             ${summary.warnings.length}`,
    `   Upload Result:        ${summary.result}`,
    '─────────────────────────────────────────',
    '',
  ];
  console.log(lines.join('\n'));

  try {
    const out = path.join('playwright-report', 'qtest-upload-summary.json');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(summary, null, 2), 'utf-8');
  } catch {
    /* best-effort */
  }
}
