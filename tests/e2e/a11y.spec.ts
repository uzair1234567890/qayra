import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTES = [
  '/',
  '/scents',
  '/cart',
  '/auth/sign-in',
  '/auth/sign-up',
  '/auth/forgot-password',
];

for (const route of ROUTES) {
  test(`a11y: ${route} has no critical violations`, async ({ page }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const critical = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    if (critical.length) console.log(JSON.stringify(critical, null, 2));
    expect(critical).toEqual([]);
  });
}
