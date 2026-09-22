import { test, expect } from '@playwright/test';

test.describe('auth flows', () => {
  test('sign-up renders form', async ({ page }) => {
    await page.goto('/auth/sign-up');
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible();
    await expect(page.getByLabel(/name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('sign-in renders form', async ({ page }) => {
    await page.goto('/auth/sign-in');
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
  });

  test('forgot-password renders form', async ({ page }) => {
    await page.goto('/auth/forgot-password');
    await expect(page.getByRole('heading', { name: /reset your password/i })).toBeVisible();
  });

  test('sign-in with wrong credentials shows error', async ({ page }) => {
    await page.goto('/auth/sign-in');
    await page.getByLabel(/email/i).fill('nobody@qayra.test');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /^sign in$/i }).click();
    await expect(page).toHaveURL(/auth\/sign-in.*error=/, { timeout: 10_000 });
  });

  // Requires "Confirm email" disabled in the test Supabase project. Same
  // assumption as tests/e2e/account.spec.ts:signUpAndSignIn.
  test('sign-out from /account redirects to sign-in on next protected request', async ({ page }) => {
    const email = `e2e-logout+${Date.now()}@qayra.test`;
    await page.goto('/auth/sign-up');
    await page.fill('input[name="full_name"]', 'Logout Tester');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', 'testtest12');
    await page.getByRole('button', { name: /create account/i }).click();
    await page.goto('/auth/sign-in');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', 'testtest12');
    await page.getByRole('button', { name: /^sign in$/i }).click();
    await page.goto('/account');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

    // Click the sign-out form button rendered inside AccountNav.
    const signOutForm = page.locator('form[action="/api/auth/sign-out"]').first();
    await signOutForm.locator('button').click();

    // After sign-out, /account should redirect to sign-in.
    await page.goto('/account');
    await expect(page).toHaveURL(/\/auth\/sign-in/);
  });
});
