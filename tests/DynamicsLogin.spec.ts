import { test, expect } from '@playwright/test';
import { fillSensitive } from '../src/keyvault/azure/keyVault.js';

const DYNAMICS_BASE_URL = 'https://dynamicsd365fando.operations.dynamics.com/?cmp=usmf&mi=DefaultDashboard';
const DYNAMICS_HOST = 'dynamicsd365fando.operations.dynamics.com';

const USERNAME_SECRET_NAME = process.env.AZURE_KEY_VAULT_USERNAME_SECRET_NAME ?? 'D365-USERNAME';
const PASSWORD_SECRET_NAME = process.env.AZURE_KEY_VAULT_PASSWORD_SECRET_NAME ?? 'D365-PASSWORD';

async function clickFirst(locator: any): Promise<boolean> {
  if ((await locator.count()) === 0) return false;
  try {
    await locator.first().click();
    return true;
  } catch {
    return false;
  }
}

async function clickMenuItem(page: any, label: string): Promise<void> {
  const textMatcher = new RegExp(label, 'i');

  const tryClickInContext = async (ctx: any) => {
    const locators = [
      ctx.getByRole('button', { name: textMatcher }),
      ctx.getByRole('link', { name: textMatcher }),
      ctx.getByRole('treeitem', { name: textMatcher }),
      ctx.locator(`text=${label}`),
    ];

    for (const locator of locators) {
      if (await clickFirst(locator)) {
        return true;
      }
    }

    return false;
  };

  if (await tryClickInContext(page)) return;

  for (const frame of page.frames()) {
    if (frame === page.mainFrame()) continue;
    if (await tryClickInContext(frame)) return;
  }

  throw new Error(`Menu item '${label}' not found in any frame`);
}

async function expandTreeItem(page: any, label: string): Promise<void> {
  const treeItem = page.getByRole('treeitem', { name: new RegExp(label, 'i') }).first();
  if (await treeItem.count() > 0) {
    await treeItem.press('ArrowRight');
  }
}

/**
 * Dynamics 365 login test.
 * - Retrieves credentials from Azure Key Vault.
 * - Avoids storing page HTML on disk.
 * - Uses Playwright artifact paths for diagnostics.
 */
test('Dynamics 365 login and navigate to All purchase orders', { tag: ["@Regression"] }, async ({ page }, testInfo) => {
  await page.goto(DYNAMICS_BASE_URL);

  const usernameTextbox = page.locator('input[name="loginfmt"]');
  await fillSensitive(usernameTextbox, USERNAME_SECRET_NAME);
  await page.getByRole('button', { name: /Next/i }).click();

  const passwordTextbox = page.locator('input[name="passwd"]');
  await fillSensitive(passwordTextbox, PASSWORD_SECRET_NAME);
  await page.getByRole('button', { name: /Sign in/i }).click();

  const staySignedIn = page.getByRole('button', { name: /Yes/i });
  if ((await staySignedIn.count()) > 0 && await staySignedIn.isVisible()) {
    await staySignedIn.click();
  }

  try {
    await page.waitForURL(url => url.includes(DYNAMICS_HOST), { timeout: 60000 });
  } catch {
    await page.goto(DYNAMICS_BASE_URL, { waitUntil: 'networkidle' });
  }

  await page.screenshot({ path: testInfo.outputPath('post-login.png'), fullPage: true });

  await page.waitForTimeout(40 * 1000);
  await clickMenuItem(page, 'Modules');
  await expandTreeItem(page, 'Modules');

  await clickMenuItem(page, 'Procurement and sourcing');
  await expandTreeItem(page, 'Procurement and sourcing');

  const allPO = page.locator('text=All purchase orders').first();
  await allPO.waitFor({ state: 'visible', timeout: 20000 });
  await allPO.click();

  await expect(page).toHaveURL(/PurchTableListPage/i);
  await expect(page.getByRole('heading', { name: /All purchase orders/i })).toBeVisible();
});
