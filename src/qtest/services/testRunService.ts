/* eslint-disable @typescript-eslint/no-explicit-any */
import type { QTestClient } from '../client/qtestClient.js';
import type { QTestRun } from '../models/qtestResult.js';
import type { QTestCache } from '../utils/cache.js';

export interface TestRunLookup {
  id: number;
  /** True when this Test Run was created during this run. */
  created: boolean;
}

/**
 * Finds or creates the Test Run that links a Test Case into the suite. Each
 * Test Run is the target for the final execution status (Test Log).
 */
export class TestRunService {
  constructor(
    private readonly client: QTestClient,
    private readonly cache: QTestCache,
  ) {}

  /**
   * Ensure a Test Run exists under `suiteId` for `testCaseId`.
   * `cacheKey` uniquely scopes the run to a suite + automation content.
   */
  async ensureTestRun(
    suiteId: number,
    testCaseId: number,
    name: string,
    cacheKey: string,
  ): Promise<TestRunLookup> {
    const cached = this.cache.get('testRuns', cacheKey);
    if (cached) {
      // Verify the cached run still exists — stale ids cause 404 on log upload.
      const resp = await this.client.get<any>(`/test-runs/${cached}`);
      if (resp.ok && resp.body?.id) {
        return { id: cached, created: false };
      }
      // Stale — remove from cache and re-resolve below.
      this.cache.clearKey('testRuns', cacheKey);
    }

    const existing = await this.findRun(suiteId, testCaseId, name);
    if (existing) {
      this.cache.set('testRuns', cacheKey, existing.id);
      return { id: existing.id, created: false };
    }

    const resp = await this.client.post<QTestRun>('/test-runs', {
      parentId: suiteId,
      parentType: 'test-suite',
      name,
      automation: 'Yes',
      properties: [],
      test_case: { id: testCaseId },
    });
    if (!resp.ok || !resp.body?.id) {
      throw new Error(
        `[qTest] Failed to create test run "${name}": HTTP ${resp.statusCode} ${resp.raw.slice(0, 200)}`,
      );
    }
    this.cache.set('testRuns', cacheKey, resp.body.id);
    return { id: resp.body.id, created: true };
  }

  private async findRun(
    suiteId: number,
    testCaseId: number,
    name: string,
  ): Promise<QTestRun | null> {
    const resp = await this.client.get<any>(
      `/test-runs?parentId=${suiteId}&parentType=test-suite`,
    );
    // qTest may return either a bare array or a paged { items: [...] } shape.
    const list: QTestRun[] = Array.isArray(resp.body)
      ? resp.body
      : Array.isArray(resp.body?.items)
        ? resp.body.items
        : [];
    return (
      list.find((r) => r.name === name || r.test_case?.id === testCaseId) ?? null
    );
  }
}
