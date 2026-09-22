import { test, expect, type Page } from "@playwright/test";
import { makeUser, dropUser, type TestUser } from "../fixtures/users";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const BASE_URL = process.env.BASE_URL ?? "http://localhost:4321";
void BASE_URL;

/** Scent slug that must exist in the seeded catalogue. */
const SCENT_SLUG = "velvet-midnight";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Navigate to a PDP, click Add to cart, await the /api/cart/add 200 response. */
async function addScentToCart(page: Page, slug: string = SCENT_SLUG): Promise<void> {
  await page.goto("/scent/" + slug);
  const addBtn = page.getByRole("button", { name: /add to cart/i });
  await expect(addBtn).toBeVisible();
  const responsePromise = page.waitForResponse(
    (r) => r.url().includes("/api/cart/add") && r.status() === 200,
  );
  await addBtn.click();
  await responsePromise;
}

/** Fill the checkout contact and shipping form fields. */
async function fillCheckoutForm(
  page: Page,
  opts: { email?: string; phone?: string; name?: string } = {},
): Promise<void> {
  await page.fill("input[name=email]", opts.email ?? ("e2e+" + Date.now() + "@qayra.test"));
  await page.fill("input[name=phone]", opts.phone ?? "9876543210");
  await page.fill("input[name=name]", opts.name ?? "QA Buyer");
  await page.fill("input[name=line1]", "42 Test Street");
  await page.fill("input[name=city]", "Mumbai");
  await page.fill("input[name=state]", "Maharashtra");
  await page.fill("input[name=pincode]", "400001");
}

/** Sign in via the email/password sign-in form. */
async function signInAs(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/auth/sign-in");
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", password);
  await page.getByRole("button", { name: /^sign in/i }).click();
  await expect(page).not.toHaveURL(/auth\/sign-in/, { timeout: 10_000 });
}

// ---------------------------------------------------------------------------
// Test suite 1: COD (Cash on Delivery) flow — anonymous guest
// ---------------------------------------------------------------------------

test.describe("COD purchase flow", () => {
  test(
    "anonymous browse scents add to cart checkout COD success page shows order code",
    async ({ page }) => {
      // 1. Browse the scents listing page.
      await page.goto("/scents");
      await expect(page.locator("main a[href^='/scent/']").first()).toBeVisible();
      // 2. Add the target scent via its PDP.
      await addScentToCart(page, SCENT_SLUG);
      // 3. Confirm /cart shows the added line item.
      await page.goto("/cart");
      await expect(
        page.getByRole("heading", { name: /your cart/i }),
      ).toBeVisible({ timeout: 8_000 });
      // 4. Navigate to checkout.
      await page.goto("/checkout");
      await expect(page.getByRole("heading", { name: /checkout/i })).toBeVisible();
      // 5. Fill contact and shipping fields.
      const testEmail = "cod-" + Date.now() + "@qayra.test";
      await fillCheckoutForm(page, { email: testEmail, name: "COD Tester" });
      // 6. Select COD radio (prepaid is the default).
      await page.locator("input[name=payment_method][value=cod]").check();
      await expect(page.locator("input[name=payment_method][value=cod]")).toBeChecked();
      // 7. Submit the order.
      const codRespPromise = page.waitForResponse(
        (r) => r.url().includes("/api/checkout/cod-place") && r.status() === 200,
      );
      await page.getByRole("button", { name: /place order/i }).click();
      await codRespPromise;
      // 8. Assert redirect to /checkout/success?code=.
      await expect(page).toHaveURL(/checkout\/success\?code=/, { timeout: 15_000 });
      // 9. Verify heading and non-empty order code.
      await expect(page.getByRole("heading", { name: /order placed/i })).toBeVisible();
      const codeEl = page.locator("span.font-mono").first();
      await expect(codeEl).toBeVisible();
      const codeText = await codeEl.textContent();
      expect(codeText?.trim().length).toBeGreaterThan(0);
    },
  );
});

// ---------------------------------------------------------------------------
// Test suite 2: Razorpay prepaid flow
// ---------------------------------------------------------------------------

test.describe("Razorpay prepaid flow", () => {
  // The Razorpay iframe interaction and payment network round-trip need extra time.
  test.setTimeout(60_000);

  test.skip(
    !process.env.RAZORPAY_KEY_ID?.startsWith("rzp_"),
    "no Razorpay key configured — prepaid spec disabled",
  );

  test(
    "add to cart checkout prepaid Razorpay iframe test card success page",
    async ({ page }) => {
      // 1. Add item to cart.
      await addScentToCart(page, SCENT_SLUG);
      // 2. Navigate to checkout.
      await page.goto("/checkout");
      await expect(page.getByRole("heading", { name: /checkout/i })).toBeVisible();
      // 3. Fill contact and shipping form.
      const testEmail = "rzp-" + Date.now() + "@qayra.test";
      await fillCheckoutForm(page, { email: testEmail, name: "QA Prepaid" });
      // 4. Ensure prepaid is selected (it is the default; be explicit).
      await page.locator("input[name=payment_method][value=prepaid]").check();
      await expect(
        page.locator("input[name=payment_method][value=prepaid]"),
      ).toBeChecked();
      // 5. Submit — triggers /api/checkout/create-order then opens Razorpay modal.
      const createOrderRespPromise = page.waitForResponse(
        (r) => r.url().includes("/api/checkout/create-order") && r.status() === 200,
        { timeout: 15_000 },
      );
      await page.getByRole("button", { name: /place order/i }).click();
      await createOrderRespPromise;
      // 6. Wait for the Razorpay checkout iframe to mount.
      const rzpFrame = page.frameLocator("iframe[name=razorpay-checkout-frame]");
      await expect(
        rzpFrame.getByRole("radio", { name: /card/i }).first(),
      ).toBeVisible({ timeout: 20_000 });
      await rzpFrame.getByRole("radio", { name: /card/i }).first().click();
      // 7. Fill Razorpay test card details.
      const cardNumber = rzpFrame.locator("input[name='card[number]'], #card_number").first();
      await expect(cardNumber).toBeVisible({ timeout: 10_000 });
      await cardNumber.fill("4111 1111 1111 1111");
      await rzpFrame.locator("input[name='card[expiry]'], #card_expiry").first().fill("12/30");
      await rzpFrame.locator("input[name='card[cvv]'], #card_cvv").first().fill("123");
      await rzpFrame.locator("input[name='card[name]'], #card_name").first().fill("QA Prepaid");
      // 8. Submit payment inside the Razorpay iframe.
      const payButton = rzpFrame.getByRole("button", { name: /pay/i }).last();
      await expect(payButton).toBeEnabled({ timeout: 5_000 });
      await payButton.click();
      // 9. Wait for /api/checkout/verify to confirm the payment.
      await page.waitForResponse(
        (r) => r.url().includes("/api/checkout/verify") && r.status() === 200,
        { timeout: 30_000 },
      );
      // 10. Assert success page.
      await expect(page).toHaveURL(/checkout\/success\?code=/, { timeout: 20_000 });
      await expect(page.getByRole("heading", { name: /order placed/i })).toBeVisible();
      const codeEl = page.locator("span.font-mono").first();
      await expect(codeEl).toBeVisible();
      const codeText = await codeEl.textContent();
      expect(codeText?.trim().length).toBeGreaterThan(0);
    },
  );
});

// ---------------------------------------------------------------------------
// Test suite 3: post-order — signed-in customer views and reorders
// ---------------------------------------------------------------------------

test.describe("post-order customer account", () => {
  let customer: TestUser;

  test.beforeAll(async () => {
    customer = await makeUser("customer");
  });

  test.afterAll(async () => {
    await dropUser(customer.id);
  });

  test(
    "sign in place COD order account orders shows order reorder cart has items",
    async ({ page }) => {
      // 1. Sign in as the seeded customer.
      await signInAs(page, customer.email, customer.password);
      // 2. Add a scent to the cart.
      await addScentToCart(page, SCENT_SLUG);
      // 3. Navigate to checkout and place a COD order.
      await page.goto("/checkout");
      await expect(page.getByRole("heading", { name: /checkout/i })).toBeVisible();
      await fillCheckoutForm(page, { email: customer.email, name: "QA Customer" });
      await page.locator("input[name=payment_method][value=cod]").check();
      const codRespPromise = page.waitForResponse(
        (r) => r.url().includes("/api/checkout/cod-place") && r.status() === 200,
      );
      await page.getByRole("button", { name: /place order/i }).click();
      const codResponse = await codRespPromise;
      // Extract the order code from the API JSON response.
      const { code: orderCode } = (await codResponse.json()) as { code: string };
      expect(orderCode).toBeTruthy();
      // 4. Assert the success page.
      await expect(page).toHaveURL(/checkout\/success\?code=/, { timeout: 15_000 });
      await expect(page.getByRole("heading", { name: /order placed/i })).toBeVisible();
      // 5. Navigate to /account/orders — order must appear in the table.
      await page.goto("/account/orders");
      await expect(
        page.getByRole("heading", { name: /my orders/i }),
      ).toBeVisible({ timeout: 10_000 });
      await expect(page.locator("td.font-mono", { hasText: orderCode })).toBeVisible();
      // 6. Open the order detail page via the View link.
      await page.locator("a[href='/account/orders/" + orderCode + "']").click();
      await expect(page).toHaveURL("/account/orders/" + orderCode);
      await expect(page.locator("p.font-mono", { hasText: orderCode })).toBeVisible();
      // 7. Click Reorder this and await the API call.
      const reorderRespPromise = page.waitForResponse(
        (r) => r.url().includes("/api/account/reorder") && r.status() === 200,
      );
      await page.getByRole("button", { name: /reorder this/i }).click();
      await reorderRespPromise;
      // 8. Confirm the cart was repopulated.
      await page.goto("/cart");
      await expect(page.locator("[data-qty]").first()).toBeVisible({ timeout: 10_000 });
    },
  );
});
