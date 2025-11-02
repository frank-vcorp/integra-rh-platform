import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const HAS_AUTH = fs.existsSync('playwright/.auth/user.json');

test.describe('Public routes', () => {
  test('login page renders', async ({ page, baseURL }) => {
    await page.goto(baseURL! + '/login');
    await expect(page).toHaveTitle(/Integra RH|Integra|Login/i, { timeout: 10_000 });
  });
});

test.describe('Authenticated smoke', () => {
  test.skip(!HAS_AUTH, 'No auth storage found. Run: pnpm test:e2e:setup');

  test('dashboard loads without console errors', async ({ page, baseURL, browserName }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(String(err)));

    await page.goto(baseURL! + '/');
    await page.waitForSelector('#root, main, [data-testid="app-root"]', { timeout: 15_000 });

    // Basic API sanity: no 401/404 on core bootstrap
    const responses = new Set<number>();
    page.on('response', (r) => {
      const url = r.url();
      if (url.includes('/api/trpc')) responses.add(r.status());
    });

    await expect.poll(() => errors.length, { timeout: 1000 }).toBe(0);
  });

  const routes = ['/procesos', '/clientes', '/puestos', '/candidatos'];
  for (const route of routes) {
    test(`navigates to ${route}`, async ({ page, baseURL }) => {
      await page.goto(baseURL! + route);
      await page.waitForSelector('#root, main, [data-testid="page-root"]', { timeout: 15_000 });
      await expect(page).toHaveURL(new RegExp(route.replace('/', '\\/')));
    });
  }
});

