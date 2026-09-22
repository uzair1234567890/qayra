import { test, expect } from '@playwright/test';

test.describe('storefront public pages', () => {
  test('home renders 4 scent cards', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /quiet scents/i })).toBeVisible();
    const cards = page.locator('main a[href^="/scent/"]');
    await expect(cards).toHaveCount(4);
  });

  test('collection page lists all 4 scents', async ({ page }) => {
    await page.goto('/scents');
    const cards = page.locator('main a[href^="/scent/"]');
    await expect(cards).toHaveCount(4);
  });

  test('each PDP renders with name, switcher, sticky buy bar', async ({ page }) => {
    for (const slug of ['azeziya', 'velvet-midnight', 'blue-lotus-mist', 'imperial-musk']) {
      await page.goto(`/scent/${slug}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByText(/choose scent/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /add to cart/i })).toBeVisible();
    }
  });

  test('unknown scent slug 404s', async ({ page }) => {
    const r = await page.goto('/scent/does-not-exist');
    expect(r?.status()).toBeGreaterThanOrEqual(400);
  });

  test('story, contact, policy pages render', async ({ page }) => {
    for (const url of [
      '/story',
      '/contact',
      '/policies/shipping',
      '/policies/returns',
      '/policies/privacy',
      '/policies/terms',
    ]) {
      await page.goto(url);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    }
  });

  test('contact form submission persists message', async ({ page }) => {
    await page.goto('/contact');
    await page.getByLabel(/name/i).fill('E2E Bot');
    await page.getByLabel(/email/i).fill('e2e@qayra.test');
    await page.getByLabel(/message/i).fill('test message');
    await page.getByRole('button', { name: /send/i }).click();
    await expect(page).toHaveURL(/contact\?sent=1/);
  });
});
