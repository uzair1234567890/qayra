import { test, expect } from '@playwright/test';

test.describe('ops panel — auth gates', () => {
  const opsRoutes = [
    '/ops/returns',
    '/ops/inventory',
    '/ops/delivered',
    '/ops/orders/FAKE-CODE',
  ];

  for (const route of opsRoutes) {
    test(`${route} redirects anonymous to sign-in`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/auth\/sign-in/);
    });
  }
});
