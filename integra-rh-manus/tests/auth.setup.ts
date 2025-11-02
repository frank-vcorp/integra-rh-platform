import { test as setup, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const authFile = path.resolve('playwright/.auth/user.json');

setup('authenticate and save storage', async ({ page, context, baseURL }) => {
  // Give plenty of time for phone approval/2FA
  setup.setTimeout(300_000);

  // Try using existing session; if it still redirects to /login, re-authenticate
  await page.goto(baseURL! + '/');
  if (fs.existsSync(authFile)) {
    const onLogin = await page.evaluate(() => location.pathname.startsWith('/login'));
    if (!onLogin) {
      await context.storageState({ path: authFile });
      return;
    }
  }

  await page.goto(baseURL! + '/login');

  // Try to click the Google button if visible; otherwise let the user complete manually in headed mode.
  const button = page.getByRole('button', { name: /google/i });
  if (await button.isVisible().catch(() => false)) {
    await Promise.all([
      // Firebase may open a popup; capture it to avoid blocking
      context.waitForEvent('page').catch(() => null),
      button.click(),
    ]);
  }

  // Wait until redirected to the app (not /login)
  await page.waitForFunction(() => !location.pathname.startsWith('/login'), { timeout: 300_000 });
  await expect(page).not.toHaveURL(/\/login/);

  // Save authenticated storage state
  await context.storageState({ path: authFile });
});
