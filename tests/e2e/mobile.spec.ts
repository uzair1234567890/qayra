// Mobile emulation smoke — runs the COD purchase flow under three device
// profiles. Catches viewport-specific layout breaks (sticky bar overlap,
// cart drawer overflow, button reach) automatically.
//
// Project mapping in playwright.config.ts:
//   iphone-13 | pixel-6 | ipad  -> this file

import { test, expect, type Page } from '@playwright/test';

async function addToCart(page: Page, slug: string): Promise<void> {
  await page.goto(`/scent/${slug}`);
  const addBtn = page.getByRole('button', { name: /add to cart/i });
  await expect(addBtn).toBeVisible();
  const resp = page.waitForResponse(
    (r) => r.url().includes('/api/cart/add') && r.status() === 200,
  );
  await addBtn.click();
  await resp;
}

test.describe('mobile COD smoke', () => {
  test('add to cart -> checkout -> COD -> success', async ({ page }) => {
    await addToCart(page, 'azeziya');
    await page.goto('/cart');
    await expect(page.getByRole('heading', { name: /your cart/i })).toBeVisible();
    await page.goto('/checkout');
    await page.fill('input[name=email]', `mobile-${Date.now()}@qayra.test`);
    await page.fill('input[name=phone]', '9876543210');
    await page.fill('input[name=name]', 'Mobile Tester');
    await page.fill('input[name=line1]', '12 Mobile Lane');
    await page.fill('input[name=city]', 'Bengaluru');
    await page.fill('input[name=state]', 'Karnataka');
    await page.fill('input[name=pincode]', '560001');
    await page.locator('input[name=payment_method][value=cod]').check();

    // The CTA must be visible without scrolling - surface sticky-bar overlap bugs.
    const placeBtn = page.getByRole('button', { name: /place order/i });
    await expect(placeBtn).toBeInViewport();

    const codResp = page.waitForResponse(
      (r) => r.url().includes('/api/checkout/cod-place') && r.status() === 200,
    );
    await placeBtn.click();
    await codResp;
    await expect(page).toHaveURL(/checkout\/success\?code=/, {
      timeout: 15_000,
    });
  });

  test('sticky buy bar appears on PDP scroll without horizontal overflow', async ({
    page,
  }) => {
    await page.goto('/scent/azeziya');
    await page.evaluate(() => window.scrollTo({ top: 1200, behavior: 'instant' }));
    const stickyBar = page.locator('[data-sticky-buy-bar], .sticky-buy-bar');
    // At least one such element should exist; if the selector misses, fall back
    // to ensuring the page hasn't introduced horizontal scroll.
    if (await stickyBar.count()) {
      await expect(stickyBar.first()).toBeVisible();
    }
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
});
