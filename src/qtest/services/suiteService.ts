/* eslint-disable @typescript-eslint/no-explicit-any */
import type { QTestClient } from '../client/qtestClient.js';
import type { QTestSuite } from '../models/qtestResult.js';
import type { QTestCache } from '../utils/cache.js';

/**
 * Manages the Test Suite that holds the Playwright Test Runs, created under
 * the resolved Test Cycle:
 *
 *   CL-125 (cycle)
 *    └── Playwright_CL-125 (suite)
 */
export class SuiteService {
  constructor(
    private readonly client: QTestClient,
    private readonly cache: QTestCache,
  ) {}

  /** Find the suite under the given cycle by name, or create it. */
  async ensureSuite(suiteName: string, cycleId: number): Promise<number> {
    const cached = this.cache.get('suites', suiteName);
    if (cached) return cached;

    const existing = await this.findSuite(suiteName, cycleId);
    if (existing) {
      this.cache.set('suites', suiteName, existing.id);
      return existing.id;
    }

    const resp = await this.client.post<QTestSuite>(
      `/test-suites?parentId=${cycleId}&parentType=test-cycle`,
      { name: suiteName },
    );
    if (!resp.ok || !resp.body?.id) {
      throw new Error(
        `[qTest] Failed to create test suite "${suiteName}": HTTP ${resp.statusCode} ${resp.raw.slice(0, 200)}`,
      );
    }
    this.cache.set('suites', suiteName, resp.body.id);
    return resp.body.id;
  }

  private async findSuite(suiteName: string, cycleId: number): Promise<QTestSuite | null> {
    const resp = await this.client.get<QTestSuite[]>(
      `/test-suites?parentId=${cycleId}&parentType=test-cycle`,
    );
    const list = Array.isArray(resp.body) ? resp.body : [];
    return list.find((s) => s.name === suiteName) ?? null;
  }
}
