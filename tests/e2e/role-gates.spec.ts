import { test, expect } from '@playwright/test';

test.describe('role gates', () => {
  test('anonymous user visiting /admin redirects to /auth/sign-in', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/auth\/sign-in\?next=/);
    expect(page.url()).toContain('next=%2Fadmin');
  });

  test('anonymous user visiting /ops redirects to /auth/sign-in', async ({ page }) => {
    await page.goto('/ops');
    await expect(page).toHaveURL(/auth\/sign-in\?next=/);
    expect(page.url()).toContain('next=%2Fops');
  });

  test('anonymous user visiting /admin/orders redirects with full next path', async ({ page }) => {
    await page.goto('/admin/orders');
    await expect(page).toHaveURL(/auth\/sign-in\?next=/);
    expect(page.url()).toContain('next=%2Fadmin%2Forders');
  });

  test('home page accessible to anonymous users', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/in the making/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
  });
});
