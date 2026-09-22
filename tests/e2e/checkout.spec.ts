import { test, expect } from '@playwright/test';

test('COD order end-to-end places successfully', async ({ page }) => {
  await page.goto('/scent/azeziya');
  await page.getByRole('button', { name: /add to cart/i }).click();
  await page.waitForTimeout(800);

  await page.goto('/checkout');
  await page.fill('input[name="email"]', `e2e+${Date.now()}@qayra.test`);
  await page.fill('input[name="phone"]', '9999999999');
  await page.fill('input[name="name"]', 'E2E Buyer');
  await page.fill('input[name="line1"]', '12 Test Lane');
  await page.fill('input[name="city"]', 'Bengaluru');
  await page.fill('input[name="state"]', 'Karnataka');
  await page.fill('input[name="pincode"]', '560001');
  await page.locator('input[value="cod"]').check();
  await page.getByRole('button', { name: /place order/i }).click();

  await expect(page).toHaveURL(/checkout\/success/, { timeout: 10000 });
  await expect(page.getByText(/Order placed/i)).toBeVisible();
});

// Prepaid Razorpay E2E requires Razorpay iframe interaction — deferred to Week 11.
// Manually verify the prepaid path in dev with test cards.
