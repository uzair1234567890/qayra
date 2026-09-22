import { test, expect } from '@playwright/test';

async function signUpAndSignIn(page: import('@playwright/test').Page) {
  const email = `e2e+${Date.now()}@qayra.test`;
  await page.goto('/auth/sign-up');
  await page.fill('input[name="full_name"]', 'E2E User');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', 'testtest12');
  await page.getByRole('button', { name: /create account/i }).click();
  // Requires "Confirm email" disabled in Supabase dashboard for test env.
  await page.goto('/auth/sign-in');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', 'testtest12');
  await page.getByRole('button', { name: /^sign in$/i }).click();
  return email;
}

test('account dashboard loads after sign-in', async ({ page }) => {
  await signUpAndSignIn(page);
  await page.goto('/account');
  await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
});

test('unauthenticated access redirects to sign-in', async ({ page }) => {
  await page.goto('/account');
  await expect(page).toHaveURL(/\/auth\/sign-in/);
});

test('unauthenticated access to orders redirects to sign-in', async ({ page }) => {
  await page.goto('/account/orders');
  await expect(page).toHaveURL(/\/auth\/sign-in/);
});

test('profile save shows saved confirmation', async ({ page }) => {
  await signUpAndSignIn(page);
  await page.goto('/account/profile');
  await page.fill('input[name="full_name"]', 'Updated Name');
  await page.getByRole('button', { name: /save/i }).click();
  await expect(page).toHaveURL(/info=Saved/);
  await expect(page.getByText(/saved/i)).toBeVisible();
});

test('address create / list', async ({ page }) => {
  await signUpAndSignIn(page);
  await page.goto('/account/addresses/new');
  await page.fill('input[name="name"]', 'Test User');
  await page.fill('input[name="line1"]', '123 Test Lane');
  await page.fill('input[name="city"]', 'Bengaluru');
  await page.fill('input[name="state"]', 'Karnataka');
  await page.fill('input[name="pincode"]', '560001');
  await page.fill('input[name="phone"]', '9999999999');
  await page.getByRole('button', { name: /save/i }).click();
  await expect(page).toHaveURL('/account/addresses');
  await expect(page.getByText('123 Test Lane')).toBeVisible();
});

test('address set as default', async ({ page }) => {
  await signUpAndSignIn(page);

  // Create two addresses
  for (const line of ['1 First Street', '2 Second Avenue']) {
    await page.goto('/account/addresses/new');
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="line1"]', line);
    await page.fill('input[name="city"]', 'Bengaluru');
    await page.fill('input[name="state"]', 'Karnataka');
    await page.fill('input[name="pincode"]', '560001');
    await page.fill('input[name="phone"]', '9000000001');
    await page.getByRole('button', { name: /save/i }).click();
    await expect(page).toHaveURL('/account/addresses');
  }

  // Set the second address as default
  const cards = page.locator('[data-address-card]');
  const setDefaultForms = page.locator('form[action="/api/account/address-default"]');
  await setDefaultForms.last().locator('button').click();
  await expect(page).toHaveURL('/account/addresses');
  // After setting default, page reloads with the chosen address marked default
  await expect(page.getByText('2 Second Avenue')).toBeVisible();
});
