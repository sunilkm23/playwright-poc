import type { TestCase } from '@playwright/test/reporter';

/**
 * Derives the qTest "Automation Content" identifier AND human-readable TC name
 * for a Playwright test.
 *
 * Each individual test() is treated as its own qTest Test Case — describe()
 * blocks are NOT collapsed into a single TC. The full path (all ancestor
 * describe titles + the test title) is used as both the stable lookup key
 * (automation content) and the TC name when creating a new TC.
 *
 * Priority order for the automation content key:
 *   1. Tag      – test('…', { tag: ['TC-001'] }, …)
 *   2. Annotation – annotations.push({ type: 'qtest', description: 'TC-001' })
 *   3. Legacy token – {qtest=TC-001} anywhere in the title
 *   4. Full path – "Describe title > … > Test title"  ← always resolves
 *
 * The TC name is always the full path, regardless of which strategy supplied
 * the automation content key, so qTest displays a meaningful name.
 */

export interface AutomationIdentifier {
  /** Stable lookup key used to search / create the TC in qTest. */
  automationContent: string;
  /** Human-readable name used as the TC name when creating a new TC. */
  tcName: string;
}

export function extractAutomationContent(test: TestCase): AutomationIdentifier {
  // Strip Playwright @tag tokens from a title segment.
  const stripTags = (s: string) => s.replace(/@[\w-]+/g, '').replace(/\s{2,}/g, ' ').trim();

  // Walk up the suite tree, collecting describe-block titles.
  // Skip the root file-level node (it has no meaningful title — it IS the
  // project/browser node that Playwright inserts) and the project node itself.
  const parts: string[] = [];
  let node: any = test.parent;
  while (node) {
    // Skip the top-most node which is the Playwright project (e.g. "chromium")
    // — it has no parent, so node.parent === null/undefined.
    if (node.title && node.parent) {
      parts.unshift(stripTags(node.title));
    }
    node = node.parent;
  }
  parts.push(stripTags(test.title));

  // Remove empty segments.
  const cleanParts = parts.filter(Boolean);

  // Join with " > " and sanitise for qTest:
  // - Keep letters, digits, spaces, > : ( ) - – . and common punctuation.
  // - Do NOT strip dots — they are needed for file names like "internal-dealer.spec.ts".
  // - Collapse multiple spaces.
  const fullPath = cleanParts
    .join(' > ')
    .replace(/[^\w\s>:.()\-–→]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 255);

  // 1) Tag — look for a tag that looks like an explicit TC id.
  const idTag = (test.tags ?? [])
    .map((t) => t.replace(/^@/, ''))
    .find((t) => /^[A-Za-z][A-Za-z0-9]*_TC_?\d+$/i.test(t) || /^TC[-_]\d+$/i.test(t));
  if (idTag) return { automationContent: idTag, tcName: fullPath };

  // 2) Annotation (type 'qtest' | 'qtestcaseid' | 'automationcontent').
  const ann = test.annotations?.find((a) =>
    ['qtest', 'qtestcaseid', 'automationcontent'].includes(a.type.toLowerCase()),
  );
  if (ann?.description) return { automationContent: ann.description.trim(), tcName: fullPath };

  // 3) Legacy {qtest=...} token.
  const legacy = test.title.match(/\{qtest\s*=\s*([A-Za-z0-9_-]+)\s*\}/i);
  if (legacy) return { automationContent: legacy[1], tcName: fullPath };

  // 4) Fallback — use the full path as both the automation content and TC name.
  return { automationContent: fullPath, tcName: fullPath };
}
