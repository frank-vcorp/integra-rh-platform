import { test as setup } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const authFile = path.resolve('playwright/.auth/user.json');

setup('authenticate and save storage', async ({ page, context, baseURL }) => {
  // If we already have a session, skip login
  if (fs.existsSync(authFile)) return;

  await page.goto(baseURL! + '/login');

  // Try to click the Google button if visible; otherwise let the user complete manually in headed mode.
  const button = page.getByRole('button', { name: /google/i });
  if (await button.isVisible().catch(() => false)) {
    await button.click();
  }

  // Wait until redirected to the app (not /login)
  await page.waitForFunction(() => !location.pathname.startsWith('/login'), { timeout: 120_000 });

  // Save authenticated storage state
  await context.storageState({ path: authFile });
});

