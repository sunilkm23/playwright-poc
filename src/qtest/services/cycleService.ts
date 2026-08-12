/* eslint-disable @typescript-eslint/no-explicit-any */
import type { QTestClient } from '../client/qtestClient.js';
import type { QTestCache } from '../utils/cache.js';

/**
 * Resolves the target qTest Test Cycle id from the configured cycle key.
 *
 * Mirrors the production PowerShell `Get-ParentTestCycleID`:
 *   - paginated POST `/search` with object_type=test-cycles
 *   - match by the cycle `pid` (e.g. "CL-125")
 *
 * `QTEST_CYCLE_ID` may also be supplied as a numeric qTest cycle id, in which
 * case it is used directly without a lookup.
 */
export class CycleService {
  private static readonly PAGE_SIZE = 999;

  constructor(
    private readonly client: QTestClient,
    private readonly cache: QTestCache,
  ) {}

  /** Return the numeric test-cycle id for the configured cycle key (pid). */
  async resolveCycleId(cycleKey: string): Promise<number> {
    // Already numeric → use as-is.
    if (/^\d+$/.test(cycleKey)) return Number.parseInt(cycleKey, 10);

    const cached = this.cache.get('modules', `cycle:${cycleKey}`);
    if (cached) return cached;

    const found = await this.searchByPid(cycleKey);
    if (found) {
      this.cache.set('modules', `cycle:${cycleKey}`, found);
      return found;
    }

    throw new Error(
      `[qTest] ParentTestCycleID not found for cycle pid "${cycleKey}". ` +
        `Verify QTEST_CYCLE_ID matches an existing qTest test cycle pid.`,
    );
  }

  /** Paginate the search endpoint looking for a test cycle whose pid matches. */
  private async searchByPid(pid: string): Promise<number | null> {
    let page = 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const resp = await this.client.post<any>(
        `/search?pageSize=${CycleService.PAGE_SIZE}&page=${page}`,
        { object_type: 'test-cycles', fields: ['pid', 'id'], query: "name ~ ''" },
      );
      const items: any[] = Array.isArray(resp.body?.items) ? resp.body.items : [];
      const match = items.find((c) => c.pid === pid);
      if (match?.id) return match.id;
      if (items.length < CycleService.PAGE_SIZE) return null;
      page++;
    }
  }
}
