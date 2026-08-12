import type { QTestStatus } from '../models/executionResult.js';

/**
 * Map a Playwright test status to a qTest execution status name.
 *
 *   passed       -> PASSED
 *   failed       -> FAILED
 *   timedOut     -> FAILED
 *   interrupted  -> FAILED
 *   skipped      -> BLOCKED
 */
export function mapStatus(playwrightStatus: string): QTestStatus {
  switch (playwrightStatus) {
    case 'passed':
      return 'PASSED';
    case 'skipped':
      return 'BLOCKED';
    case 'failed':
    case 'timedOut':
    case 'interrupted':
    default:
      return 'FAILED';
  }
}
