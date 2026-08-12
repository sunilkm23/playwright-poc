/**
 * Lightweight shapes for the subset of the qTest REST API the reporter uses.
 * Only the fields we read are typed; everything else is intentionally omitted.
 */

export interface QTestModule {
  id: number;
  name: string;
  parent_id?: number;
}

export interface QTestSuite {
  id: number;
  name: string;
}

export interface QTestCase {
  id: number;
  name: string;
  automation_content?: string;
}

export interface QTestRun {
  id: number;
  name: string;
  test_case?: { id: number };
}

export interface QTestStatusField {
  id: number;
  name: string;
  value?: string;
}

/** Aggregate counters produced for the end-of-run upload summary. */
export interface UploadSummary {
  cycleId: string;
  totalTests: number;
  existingTestCases: number;
  newTestCases: number;
  testRunsCreated: number;
  logsUploaded: number;
  passed: number;
  failed: number;
  blocked: number;
  result: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  /** Non-fatal warnings (orphaned test cases, duplicates, etc.). */
  warnings: string[];
}
