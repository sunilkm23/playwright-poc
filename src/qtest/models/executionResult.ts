/**
 * Normalised representation of a single Playwright test outcome that the
 * reporter collects during execution and processes in `onEnd()`.
 */
export interface ExecutionResult {
  /** Stable qTest lookup key extracted from the test (tag or full path). */
  automationContent: string;
  /** Human-readable TC name — full "Describe > Test title" path. */
  tcName: string;
  /** Human-readable test title. */
  testName: string;
  /** Mapped qTest status name (PASSED / FAILED / BLOCKED). */
  status: QTestStatus;
  /** Raw Playwright status, kept for diagnostics. */
  rawStatus: string;
  /** Duration in milliseconds. */
  durationMs: number;
  /** ISO start time. */
  startTime: string;
  /** ISO end time. */
  endTime: string;
  /** Derived qTest Test Suite name for this test (JUnit testsuite equivalent). */
  suiteName: string;
  /** Optional note (error message / project name). */
  note?: string;
}

/** qTest execution status names accepted by the test-log endpoint. */
export type QTestStatus = 'PASSED' | 'FAILED' | 'BLOCKED';
