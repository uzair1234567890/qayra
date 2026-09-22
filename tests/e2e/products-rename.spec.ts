import { test, expect } from '@playwright/test';

test.describe('products rename + redirects', () => {
  test('/scents → 301 → /products', async ({ page }) => {
    const response = await page.goto('/scents');
    expect(response?.status()).toBe(200);
    expect(page.url()).toMatch(/\/products$/);
  });

  test('/scent/<slug> → 301 → /product/<slug>', async ({ page }) => {
    const response = await page.goto('/scent/azeziya');
    expect(response?.status()).toBeLessThan(500);
    expect(page.url()).toMatch(/\/product\/azeziya$/);
  });

  test('/admin/scents → 301 → /admin/products (then to sign-in)', async ({ page }) => {
    // unauthenticated → redirect chain: /admin/scents → /admin/products → /auth/sign-in
    await page.goto('/admin/scents');
    expect(page.url()).toContain('/auth/sign-in');
    expect(page.url()).toContain('next=%2Fadmin%2Fproducts');
  });
});
