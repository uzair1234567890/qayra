/**
 * Admin CRUD smoke tests
 *
 * Covers: Scents, Bundles, Discounts, Offers, Banners
 *
 * Pattern per resource (where a delete endpoint exists):
 *   create -> list shows it -> edit -> delete -> list no longer shows it
 *
 * Scents: no scent-delete API exists; test covers create -> list -> edit -> verify.
 *
 * Notes on form structure (discovered by reading source pages):
 *  - Admin form labels lack for/id attributes so getByLabel() cannot match them.
 *    All inputs are located by name: locator('input[name="field"]').
 *  - Sign-in form HAS id=email / id=password, so getByLabel works there.
 *  - Banner field: name=headline  (task spec says heading — same thing).
 *  - Offer form uses structured kind-select + conditional numeric fields
 *    (task spec says fill rule JSON — form has no raw JSON textarea).
 *  - Discount codes must match [A-Z0-9_-]{3,40}.
 */

import { test, expect, type Page } from '@playwright/test';
import { makeUser, dropUser, type TestUser } from '../fixtures/users';

test.setTimeout(30_000);

// ---------------------------------------------------------------------------
// Helper: sign in via /auth/sign-in form
// ---------------------------------------------------------------------------

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

let adminUser: TestUser;

test.beforeAll(async () => {
  adminUser = await makeUser('admin');
});

test.afterAll(async () => {
  await dropUser(adminUser.id);
});

// ---------------------------------------------------------------------------
// 1. Scents — create -> list -> edit  (no delete endpoint available)
// ---------------------------------------------------------------------------

test.describe('Admin CRUD - Scents', () => {
  const ts = Date.now();
  const SCENT_NAME = `QA Scent ${ts}`;
  const SCENT_SLUG  = `qa-scent-${ts}`;
  const EDITED_NAME = `QA Scent ${ts} edited`;

  test('create scent', async ({ page }) => {
    await signIn(page, adminUser);
    await page.goto('/admin/scents/new');
    await expect(page.getByRole('button', { name: /create scent/i })).toBeVisible();
    await page.locator('input[name="name"]').fill(SCENT_NAME);
    await page.locator('input[name="slug"]').fill(SCENT_SLUG);
    await page.locator('textarea[name="description"]').fill('Automated QA scent description');
    await page.getByRole('button', { name: /create scent/i }).click();
    await page.waitForURL(/\/admin\/scents/, { timeout: 15_000 });
  });

  test('list page shows new scent', async ({ page }) => {
    await signIn(page, adminUser);
    await page.goto('/admin/scents');
    await expect(page.getByText(SCENT_NAME)).toBeVisible();
  });

  test('edit scent and verify saved', async ({ page }) => {
    await signIn(page, adminUser);
    await page.goto('/admin/scents');
    const row = page.locator('tr', { hasText: SCENT_NAME });
    await row.getByRole('link', { name: /edit/i }).click();
    await page.waitForURL(/\/admin\/scents\/[^\/]+$/, { timeout: 10_000 });
    await page.locator('input[name="name"]').fill(EDITED_NAME);
    await page.getByRole('button', { name: /save changes/i }).click();
    await page.waitForURL(/\/admin\/scents\//, { timeout: 15_000 });
    await expect(
      page.getByText(/saved/i).or(page.locator('input[name="name"]'))
    ).toBeVisible({ timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// 2. Bundles — create -> list -> edit -> delete
// ---------------------------------------------------------------------------

test.describe('Admin CRUD - Bundles', () => {
  const ts = Date.now();
  const BUNDLE_NAME = `QA Bundle ${ts}`;
  const BUNDLE_SLUG = `qa-bundle-${ts}`;
  const EDITED_NAME = `QA Bundle ${ts} edited`;

  test('create bundle', async ({ page }) => {
    await signIn(page, adminUser);
    await page.goto('/admin/bundles/new');
    await expect(page.getByRole('button', { name: /create bundle/i })).toBeVisible();
    await page.locator('input[name="name"]').fill(BUNDLE_NAME);
    await page.locator('input[name="slug"]').fill(BUNDLE_SLUG);
    await page.locator('textarea[name="description"]').fill('Automated QA bundle description');
    await page.locator('input[name="price_rupees"]').fill('999');
    await page.getByRole('button', { name: /create bundle/i }).click();
    await page.waitForURL(/\/admin\/bundles/, { timeout: 15_000 });
  });

  test('list page shows new bundle', async ({ page }) => {
    await signIn(page, adminUser);
    await page.goto('/admin/bundles');
    await expect(page.getByText(BUNDLE_NAME)).toBeVisible();
  });

  test('edit bundle', async ({ page }) => {
    await signIn(page, adminUser);
    await page.goto('/admin/bundles');
    const row = page.locator('tr', { hasText: BUNDLE_NAME });
    await row.getByRole('link', { name: /edit/i }).click();
    await page.waitForURL(/\/admin\/bundles\/[^\/]+$/, { timeout: 10_000 });
    await page.locator('input[name="name"]').fill(EDITED_NAME);
    await page.getByRole('button', { name: /^save$/i }).click();
    await page.waitForURL(/\/admin\/bundles\//, { timeout: 15_000 });
  });

  test('delete bundle and list no longer shows it', async ({ page }) => {
    await signIn(page, adminUser);
    await page.goto('/admin/bundles');
    const row = page.locator('tr', { hasText: EDITED_NAME });
    await row.getByRole('link', { name: /edit/i }).click();
    await page.waitForURL(/\/admin\/bundles\/[^\/]+$/, { timeout: 10_000 });
    page.on('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: /delete bundle/i }).click();
    await page.waitForURL(/\/admin\/bundles$/, { timeout: 15_000 });
    await expect(page.getByText(EDITED_NAME)).toBeHidden();
  });
});

// ---------------------------------------------------------------------------
// 3. Discounts — create -> list -> edit -> delete (route key is code string)
// ---------------------------------------------------------------------------

test.describe('Admin CRUD - Discounts', () => {
  const ts = String(Date.now());
  // Must match [A-Z0-9_-]{3,40}
  const CODE        = `QATST${ts}`.slice(0, 20);
  const EDITED_CODE = `QAEDITED${ts}`.slice(0, 20);

  test('create discount code', async ({ page }) => {
    await signIn(page, adminUser);
    await page.goto('/admin/discounts/new');
    await expect(page.getByRole('button', { name: /create discount/i })).toBeVisible();
    await page.locator('input[name="code"]').fill(CODE);
    await page.locator('select[name="type"]').selectOption('percent');
    await page.locator('input[name="value_input"]').fill('10');
    await page.locator('input[name="min_subtotal_rupees"]').fill('0');
    await page.getByRole('button', { name: /create discount/i }).click();
    await page.waitForURL(/\/admin\/discounts/, { timeout: 15_000 });
  });

  test('list page shows new discount code', async ({ page }) => {
    await signIn(page, adminUser);
    await page.goto('/admin/discounts');
    await expect(page.getByText(CODE)).toBeVisible();
  });

  test('edit discount code', async ({ page }) => {
    await signIn(page, adminUser);
    await page.goto('/admin/discounts');
    const row = page.locator('tr', { hasText: CODE });
    await row.getByRole('link', { name: /edit/i }).click();
    await page.waitForURL(new RegExp(`/admin/discounts/${CODE}`), { timeout: 10_000 });
    await page.locator('input[name="code"]').fill(EDITED_CODE);
    await page.getByRole('button', { name: /save changes/i }).click();
    await page.waitForURL(/\/admin\/discounts/, { timeout: 15_000 });
  });

  test('delete discount code and list no longer shows it', async ({ page }) => {
    await signIn(page, adminUser);
    await page.goto('/admin/discounts');
    const row = page.locator('tr', { hasText: EDITED_CODE });
    await row.getByRole('link', { name: /edit/i }).click();
    await page.waitForURL(new RegExp(`/admin/discounts/${EDITED_CODE}`), { timeout: 10_000 });
    page.on('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: /delete discount/i }).click();
    await page.waitForURL(/\/admin\/discounts$/, { timeout: 15_000 });
    await expect(page.getByText(EDITED_CODE)).toBeHidden();
  });
});

// ---------------------------------------------------------------------------
// 4. Offers — create -> list -> edit -> delete
//    Form has structured kind-select + conditional numeric fields,
//    not a raw JSON textarea (task spec says fill rule JSON).
// ---------------------------------------------------------------------------

test.describe('Admin CRUD - Offers', () => {
  const ts = Date.now();
  const OFFER_NAME  = `QA Offer ${ts}`;
  const EDITED_NAME = `QA Offer ${ts} edited`;

  test('create offer', async ({ page }) => {
    await signIn(page, adminUser);
    await page.goto('/admin/offers/new');
    await expect(page.getByRole('button', { name: /create offer/i })).toBeVisible();
    await page.locator('input[name="name"]').fill(OFFER_NAME);
    await page.locator('select[name="kind"]').selectOption('free_shipping');
    await page.locator('input[name="min_subtotal_rupees"]').fill('500');
    await page.getByRole('button', { name: /create offer/i }).click();
    await page.waitForURL(/\/admin\/offers/, { timeout: 15_000 });
  });

  test('list page shows new offer', async ({ page }) => {
    await signIn(page, adminUser);
    await page.goto('/admin/offers');
    await expect(page.getByText(OFFER_NAME)).toBeVisible();
  });

  test('edit offer', async ({ page }) => {
    await signIn(page, adminUser);
    await page.goto('/admin/offers');
    const row = page.locator('tr', { hasText: OFFER_NAME });
    await row.getByRole('link', { name: /edit/i }).click();
    await page.waitForURL(/\/admin\/offers\/[^\/]+$/, { timeout: 10_000 });
    await page.locator('input[name="name"]').fill(EDITED_NAME);
    await page.getByRole('button', { name: /save changes/i }).click();
    await page.waitForURL(/\/admin\/offers/, { timeout: 15_000 });
  });

  test('delete offer and list no longer shows it', async ({ page }) => {
    await signIn(page, adminUser);
    await page.goto('/admin/offers');
    const row = page.locator('tr', { hasText: EDITED_NAME });
    await row.getByRole('link', { name: /edit/i }).click();
    await page.waitForURL(/\/admin\/offers\/[^\/]+$/, { timeout: 10_000 });
    page.on('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: /delete offer/i }).click();
    await page.waitForURL(/\/admin\/offers$/, { timeout: 15_000 });
    await expect(page.getByText(EDITED_NAME)).toBeHidden();
  });
});

// ---------------------------------------------------------------------------
// 5. Banners — create -> list -> edit -> delete
//    Task spec says heading + CTA; actual form field names:
//      name=headline  (label: Headline optional)
//      name=cta_text  (label: CTA text optional)
// ---------------------------------------------------------------------------

test.describe('Admin CRUD - Banners', () => {
  const ts = Date.now();
  const HEADLINE        = `QA Banner ${ts}`;
  const CTA_TEXT        = 'Shop now QA';
  const EDITED_HEADLINE = `QA Banner ${ts} edited`;

  test('create banner', async ({ page }) => {
    await signIn(page, adminUser);
    await page.goto('/admin/banners/new');
    await expect(page.getByRole('button', { name: /create banner/i })).toBeVisible();
    await page.locator('input[name="headline"]').fill(HEADLINE);
    await page.locator('input[name="cta_text"]').fill(CTA_TEXT);
    await page.getByRole('button', { name: /create banner/i }).click();
    await page.waitForURL(/\/admin\/banners/, { timeout: 15_000 });
  });

  test('list page shows new banner headline', async ({ page }) => {
    await signIn(page, adminUser);
    await page.goto('/admin/banners');
    await expect(page.getByText(HEADLINE)).toBeVisible();
  });

  test('edit banner', async ({ page }) => {
    await signIn(page, adminUser);
    await page.goto('/admin/banners');
    const row = page.locator('tr', { hasText: HEADLINE });
    await row.getByRole('link', { name: /edit/i }).click();
    await page.waitForURL(/\/admin\/banners\/[^\/]+$/, { timeout: 10_000 });
    await page.locator('input[name="headline"]').fill(EDITED_HEADLINE);
    await page.getByRole('button', { name: /save changes/i }).click();
    await page.waitForURL(/\/admin\/banners/, { timeout: 15_000 });
  });

  test('delete banner and list no longer shows it', async ({ page }) => {
    await signIn(page, adminUser);
    await page.goto('/admin/banners');
    const row = page.locator('tr', { hasText: EDITED_HEADLINE });
    await row.getByRole('link', { name: /edit/i }).click();
    await page.waitForURL(/\/admin\/banners\/[^\/]+$/, { timeout: 10_000 });
    page.on('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: /delete banner/i }).click();
    await page.waitForURL(/\/admin\/banners$/, { timeout: 15_000 });
    await expect(page.getByText(EDITED_HEADLINE)).toBeHidden();
  });
});
