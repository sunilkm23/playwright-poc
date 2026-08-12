/* eslint-disable @typescript-eslint/no-explicit-any */
import * as path from 'node:path';
import type { TestCase } from '@playwright/test/reporter';

export type SuiteStrategy = 'file' | 'describe' | 'project' | 'fixed';

/**
 * Derive the qTest Test Suite name for a Playwright test, mirroring the JUnit
 * `testsuite` concept.
 *
 * Strategies (set via QTEST_SUITE_STRATEGY):
 *   - 'file'     → the spec file basename, e.g. "agreement-search.spec.ts"
 *                  (closest equivalent to a JUnit <testsuite>; default)
 *   - 'describe' → the top-level describe title, falling back to the file name
 *   - 'project'  → the Playwright project name (e.g. "chromium")
 *   - 'fixed'    → a single fixed suite name (QTEST_SUITE_NAME)
 *
 * When `includeProject` is true (multi-browser runs), the project name is
 * prefixed so suites don't collide across browsers, e.g.
 * "chromium / agreement-search.spec.ts".
 */
export function resolveSuiteName(
  test: TestCase,
  strategy: SuiteStrategy,
  fixedName: string,
  includeProject: boolean,
): string {
  if (strategy === 'fixed') return fixedName;

  const projectName = test.parent?.project()?.name ?? '';

  let base: string;
  switch (strategy) {
    case 'project':
      base = projectName || 'Playwright';
      break;
    case 'describe':
      base = topLevelDescribe(test) ?? specFileName(test);
      break;
    case 'file':
    default:
      base = specFileName(test);
      break;
  }

  if (includeProject && strategy !== 'project' && projectName) {
    return `${projectName} / ${base}`;
  }
  return base;
}

/** The spec file basename (the natural JUnit testsuite name). */
function specFileName(test: TestCase): string {
  const loc = test.location?.file;
  if (loc) return path.basename(loc);
  // Walk up to the file-level suite as a fallback.
  let s: any = test.parent;
  while (s?.parent?.parent) s = s.parent;
  return s?.title ? path.basename(String(s.title)) : 'Playwright';
}

/** The outermost describe() title, if the test is inside one. */
function topLevelDescribe(test: TestCase): string | null {
  // Suite chain: project → file → describe(s) → test.
  const titles: string[] = [];
  let s: any = test.parent;
  while (s) {
    if (s.title) titles.unshift(String(s.title));
    s = s.parent;
  }
  // titles[0] is usually the project, titles[1] the file; the first describe
  // is whatever comes after the file-level suite.
  const describe = titles.slice(2).find((t) => t && !t.endsWith('.ts') && !t.endsWith('.js'));
  return describe ?? null;
}
