import { test, expect } from '@playwright/test';

test('add to cart from PDP → /cart shows the line', async ({ page }) => {
  await page.goto('/scent/azeziya');
  const addBtn = page.getByRole('button', { name: /add to cart/i });
  const responsePromise = page.waitForResponse((r) => r.url().includes('/api/cart/add') && r.status() === 200);
  await addBtn.click();
  await responsePromise;
  await page.goto('/cart');
  await expect(page.getByText(/Azeziya/i)).toBeVisible();
});

test('quantity increment updates line count', async ({ page }) => {
  await page.goto('/scent/azeziya');
  const addBtn = page.getByRole('button', { name: /add to cart/i });
  const addResponse = page.waitForResponse((r) => r.url().includes('/api/cart/add') && r.status() === 200);
  await addBtn.click();
  await addResponse;
  await page.goto('/cart');
  const incBtn = page.locator('[data-qty-inc]').first();
  const incResponse = page.waitForResponse((r) => r.url().includes('/api/cart/') && r.status() === 200);
  await incBtn.click();
  await incResponse;
  const qtyEl = page.locator('[data-qty]').first();
  await expect(qtyEl).toHaveText('2');
});

test('remove item from cart', async ({ page }) => {
  await page.goto('/scent/azeziya');
  const addBtn = page.getByRole('button', { name: /add to cart/i });
  const addResponse = page.waitForResponse((r) => r.url().includes('/api/cart/add') && r.status() === 200);
  await addBtn.click();
  await addResponse;
  await page.goto('/cart');
  await expect(page.getByText(/Azeziya/i)).toBeVisible();
  const removeBtn = page.locator('[data-remove]').first();
  const removeResponse = page.waitForResponse(
    (r) => r.url().includes('/api/cart/remove') && r.status() === 200,
  );
  await removeBtn.click();
  await removeResponse;
  // After removal the line is gone; the cart shows the empty state.
  await expect(page.getByText(/Azeziya/i)).toHaveCount(0);
});
