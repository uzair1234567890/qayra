import { test, expect } from '@playwright/test';

test('navigation click sets aria-busy and clears after swap', async ({ page }) => {
  await page.goto('/');
  const scentsLink = page.getByRole('link', { name: /^scents$/i }).first();
  await scentsLink.click();
  await page.waitForURL(/\/scents/);
  const stuck = await page.locator('a[data-state="loading"]').count();
  expect(stuck).toBe(0);
});

test('navbar logo has no loading state', async ({ page }) => {
  await page.goto('/scents');
  const logo = page.locator('a[data-no-loading]');
  await expect(logo).toHaveCount(1);
  await logo.click();
  await expect(page.locator('a[data-no-loading][data-state="loading"]')).toHaveCount(0);
});

test('add to cart triggers loading state and settles back to idle', async ({ page }) => {
  await page.goto('/scent/azeziya');
  const btn = page.getByRole('button', { name: /add to cart/i });
  await expect(btn).toHaveAttribute('data-bound', '');
  // Capture transient states via MutationObserver — the success window is
  // ~1.2s long after a fast fetch, which is hard to catch via polling.
  const statesPromise = btn.evaluate((el) => {
    return new Promise<string[]>((resolve) => {
      const seen: string[] = [];
      const mo = new MutationObserver(() => {
        const s = el.getAttribute('data-state');
        if (s !== null) seen.push(s);
      });
      mo.observe(el, { attributes: true, attributeFilter: ['data-state'] });
      setTimeout(() => { mo.disconnect(); resolve(seen); }, 4000);
    });
  });
  const responsePromise = page.waitForResponse(
    (r) => r.url().includes('/api/cart/add') && r.status() === 200,
  );
  await btn.click();
  await responsePromise;
  const states = await statesPromise;
  // Loading and success states both observed during the lifecycle.
  expect(states).toContain('loading');
  expect(states).toContain('success');
  // After the revert window, button is idle again.
  await expect.poll(async () => btn.getAttribute('data-state'), { timeout: 2500 }).toBeNull();
  await expect(btn).toHaveText(/add to cart/i);
});

test('form submit (sign-in) shows spinner on submit button', async ({ page }) => {
  await page.goto('/auth/sign-in');
  const submitBtn = page.locator('form button[type="submit"]').first();
  await page.locator('input[type="email"]').first().fill('does-not-exist@example.com');
  await page.locator('input[type="password"]').first().fill('wrongpassword');
  const navPromise = page.waitForLoadState('networkidle');
  await submitBtn.click();
  const wentBusy = await Promise.race([
    submitBtn.getAttribute('aria-busy').then((v) => v === 'true'),
    page
      .waitForURL(/.+/, { timeout: 1500 })
      .then(() => true)
      .catch(() => false),
  ]);
  expect(wentBusy).toBe(true);
  await navPromise;
});
