import * as dotenv from 'dotenv';
import type { SuiteStrategy } from '../utils/suiteNameResolver.js';

dotenv.config();

/**
 * Strongly-typed qTest reporter configuration, sourced entirely from `.env`.
 *
 * The reporter is a *native Playwright reporter* — it is conditionally loaded
 * by `playwright.config.ts` when `QTEST_ENABLED=true`. No qTest information is
 * ever hardcoded in source.
 *
 * Mandatory when enabled:
 *   QTEST_ENABLED=true
 *   QTEST_CYCLE_ID=CL-125          (drives module/suite naming + execution target)
 *
 * Connectivity:
 *   QTEST_PROJECT_ID=12345
 *   QTEST_BASE_URL=https://company.qtestnet.com   (with or without /api/v3)
 *   QTEST_API_TOKEN=xxxxxxxx        (alias: QTEST_TOKEN — kept for back-compat)
 *
 * Optional:
 *   QTEST_ROOT_MODULE=Playwright    (framework root folder under Test Design)
 *   QTEST_SUITE_NAME                (override suite name; default Playwright_<cycle>)
 *   QTEST_CACHE_FILE=.cache/qtestCache.json
 */
export interface QTestConfig {
  enabled: boolean;
  baseUrl: string;
  projectId: number;
  apiToken: string;
  cycleId: string;
  /** Top-level module the framework tree lives under (e.g. Orphaned Test Cases). */
  orphanedModuleName: string;
  /** Framework root module created under the orphaned module (e.g. Playwright). */
  rootModuleName: string;
  /** Fixed suite name (used when suiteStrategy = 'fixed'). */
  suiteName: string;
  /** How the qTest Test Suite name is derived from each test. */
  suiteStrategy: SuiteStrategy;
  /** Prefix the suite name with the browser/project (multi-browser runs). */
  includeProjectInSuite: boolean;
  /** Force-approve test cases whose version is not yet a major (N.0) release. */
  autoApprove: boolean;
  cacheFile: string;
}

/** Normalise the base URL so it always ends with `/api/v3` (no trailing slash). */
function normaliseBaseUrl(raw: string): string {
  const trimmed = raw.replace(/\/+$/, '');
  if (!trimmed) return '';
  return /\/api\/v\d+$/i.test(trimmed) ? trimmed : `${trimmed}/api/v3`;
}

function parseSuiteStrategy(raw: string | undefined): SuiteStrategy {
  const v = (raw ?? 'file').trim().toLowerCase();
  return (['file', 'describe', 'project', 'fixed'] as const).includes(v as SuiteStrategy)
    ? (v as SuiteStrategy)
    : 'file';
}

/**
 * Read and validate qTest configuration from the environment.
 *
 * Fails fast (throws) when `QTEST_ENABLED=true` but mandatory values are
 * missing — this surfaces misconfiguration immediately rather than silently
 * skipping the upload.
 */
export function loadQTestConfig(): QTestConfig {
  const enabled = (process.env.QTEST_ENABLED ?? '').toLowerCase() === 'true';

  const cycleId = (process.env.QTEST_CYCLE_ID ?? '').trim();
  const rawBaseUrl = (process.env.QTEST_BASE_URL ?? '').trim();
  const projectIdRaw = (process.env.QTEST_PROJECT_ID ?? '').trim();
  const apiToken = (process.env.QTEST_API_TOKEN ?? process.env.QTEST_TOKEN ?? '').trim();

  if (enabled) {
    const missing: string[] = [];
    if (!cycleId) missing.push('QTEST_CYCLE_ID');
    if (!rawBaseUrl) missing.push('QTEST_BASE_URL');
    if (!projectIdRaw) missing.push('QTEST_PROJECT_ID');
    if (!apiToken) missing.push('QTEST_API_TOKEN');
    if (missing.length) {
      throw new Error(
        `[qTest] ${missing.join(', ')} ${missing.length === 1 ? 'is' : 'are'} required when QTEST_ENABLED=true`,
      );
    }
  }

  return {
    enabled,
    baseUrl: normaliseBaseUrl(rawBaseUrl),
    projectId: Number.parseInt(projectIdRaw || '0', 10),
    apiToken,
    cycleId,
    orphanedModuleName: (process.env.QTEST_ORPHANED_MODULE ?? 'Orphaned Test Cases').trim(),
    rootModuleName: (process.env.QTEST_ROOT_MODULE ?? 'Playwright').trim(),
    suiteName: (process.env.QTEST_SUITE_NAME ?? `Playwright_${cycleId}`).trim(),
    suiteStrategy: parseSuiteStrategy(process.env.QTEST_SUITE_STRATEGY),
    includeProjectInSuite:
      (process.env.QTEST_SUITE_INCLUDE_PROJECT ?? 'false').toLowerCase() === 'true',
    autoApprove: (process.env.QTEST_AUTO_APPROVE ?? 'true').toLowerCase() === 'true',
    cacheFile: (process.env.QTEST_CACHE_FILE ?? '.cache/qtestCache.json').trim(),
  };
}
