import { test, expect, type Page } from '@playwright/test';

const ROUTES = [
  '/',
  '/scents',
  '/scent/azeziya',
  '/bundles/starter-set',
  '/story',
  '/contact',
  '/cart',
];

async function readMeta(page: Page, route: string) {
  await page.goto(route);
  const title = await page.locator('head > title').textContent();
  const description = await page
    .locator('head > meta[name="description"]')
    .getAttribute('content');
  const canonical = await page
    .locator('head > link[rel="canonical"]')
    .getAttribute('href');
  const ogTitle = await page
    .locator('head > meta[property="og:title"]')
    .getAttribute('content');
  const ogDescription = await page
    .locator('head > meta[property="og:description"]')
    .getAttribute('content');
  const ogImage = await page
    .locator('head > meta[property="og:image"]')
    .getAttribute('content');
  return { title, description, canonical, ogTitle, ogDescription, ogImage };
}

test.describe('SEO metadata', () => {
  const collected: Record<string, string | null> = {};

  for (const route of ROUTES) {
    test(`route ${route} has complete head metadata`, async ({ page }) => {
      const meta = await readMeta(page, route);
      expect(meta.title, `title on ${route}`).toBeTruthy();
      expect(
        (meta.title ?? '').length,
        `title length on ${route}`,
      ).toBeGreaterThan(0);
      expect(meta.description, `description on ${route}`).toBeTruthy();
      const descLen = (meta.description ?? '').length;
      expect(descLen, `description length on ${route}`).toBeGreaterThanOrEqual(
        30,
      );
      expect(descLen, `description length on ${route}`).toBeLessThanOrEqual(
        200,
      );
      expect(meta.canonical, `canonical on ${route}`).toBeTruthy();
      expect(meta.ogTitle, `og:title on ${route}`).toBeTruthy();
      expect(meta.ogDescription, `og:description on ${route}`).toBeTruthy();
      expect(meta.ogImage, `og:image on ${route}`).toBeTruthy();
      collected[route] = meta.title;
    });
  }

  test('titles are unique across routes', () => {
    const values = Object.values(collected).filter(Boolean) as string[];
    expect(new Set(values).size).toBe(values.length);
  });
});
