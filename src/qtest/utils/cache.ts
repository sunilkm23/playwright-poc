/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Local id-mapping cache to reduce qTest API calls across runs.
 *
 * Stored at `.cache/qtestCache.json`:
 *   {
 *     "modules":   { "CL-125": 112233 },
 *     "suites":    { "Playwright_CL-125": 67890 },
 *     "testCases": { "Login_TC_001": 23456 },
 *     "testRuns":  { "Playwright_CL-125::Login_TC_001": 99887 }
 *   }
 */
export interface QTestCacheData {
  modules: Record<string, number>;
  suites: Record<string, number>;
  testCases: Record<string, number>;
  testRuns: Record<string, number>;
}

const EMPTY: QTestCacheData = { modules: {}, suites: {}, testCases: {}, testRuns: {} };

export class QTestCache {
  private data: QTestCacheData = { ...EMPTY };

  constructor(private readonly filePath: string) {
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
        this.data = { ...EMPTY, ...parsed };
        for (const k of Object.keys(EMPTY) as (keyof QTestCacheData)[]) {
          this.data[k] = { ...EMPTY[k], ...(parsed[k] ?? {}) };
        }
      }
    } catch {
      this.data = { ...EMPTY };
    }
  }

  save(): void {
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch {
      /* best-effort */
    }
  }

  get(kind: keyof QTestCacheData, key: string): number | undefined {
    return this.data[kind][key];
  }

  set(kind: keyof QTestCacheData, key: string, value: number): void {
    this.data[kind][key] = value;
  }

  /** Wipe all entries for a cache category (e.g. after a module change). */
  clearKind(kind: keyof QTestCacheData): void {
    this.data[kind] = {};
  }

  /** Remove a single entry from a cache category. */
  clearKey(kind: keyof QTestCacheData, key: string): void {
    delete this.data[kind][key];
  }
}
