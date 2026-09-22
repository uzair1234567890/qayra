import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { makeUser, dropUser, type TestUser } from '../fixtures/users';

const FIXTURE = resolve('tests/fixtures/test-image.png');

async function signIn(page: Page, user: TestUser): Promise<void> {
  await page.goto('/auth/sign-in');
  await page.getByLabel(/email/i).fill(user.email);
  await page.getByLabel(/password/i).fill(user.password);
  await page.getByRole('button', { name: /^sign in$/i }).click();
  await page.waitForURL(
    (url) => !url.pathname.startsWith('/auth/sign-in'),
    { timeout: 15_000 },
  );
}

test.describe('admin image upload', () => {
  test.skip(
    !process.env.PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY,
    'Supabase env not configured',
  );

  let adminUser: TestUser;
  const ts = Date.now();
  const SCENT_NAME = `QA Photo ${ts}`;
  const SCENT_SLUG = `qa-photo-${ts}`;

  test.beforeAll(async () => {
    adminUser = await makeUser('admin');
  });

  test.afterAll(async () => {
    await dropUser(adminUser.id);
  });

  test('upload a main photo to a new scent and see it on the PDP', async ({ page }) => {
    await signIn(page, adminUser);

    // Create a fresh scent so we have a clean target
    await page.goto('/admin/scents/new');
    await page.locator('input[name="name"]').fill(SCENT_NAME);
    await page.locator('input[name="slug"]').fill(SCENT_SLUG);
    await page.locator('textarea[name="description"]').fill('QA photo upload smoke test');

    // Upload to the main-photo slot (single-mode ImageUploadField).
    const singleInput = page
      .locator('[data-image-field-mode="single"] input[type="file"]')
      .first();
    await singleInput.setInputFiles({
      name: 'test-image.png',
      mimeType: 'image/png',
      buffer: readFileSync(FIXTURE),
    });

    // Wait for the tile preview to render (upload completed and tile inserted).
    await expect(
      page.locator('[data-image-field-mode="single"] [data-image-field-tile] img'),
    ).toBeVisible({ timeout: 30_000 });

    // Save the form
    await page.getByRole('button', { name: /create scent/i }).click();
    await page.waitForURL(/\/admin\/scents/, { timeout: 15_000 });

    // Visit the public PDP and confirm an image with a catalog-images URL is rendered.
    await page.goto(`/scent/${SCENT_SLUG}`);
    const img = page.locator('img').first();
    await expect(img).toBeVisible();
    const src = await img.getAttribute('src');
    expect(src).toMatch(/catalog-images\/scents\//);
  });
});
