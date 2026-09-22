# Checkout: require login + guarantee empty bag after success

**Date:** 2026-05-18
**Status:** Approved
**Scope:** Small (4 files modified, 1 file added)

## Goals

1. **Login required at checkout.** A user cannot place an order — COD or prepaid — without being signed in. Anonymous browsing of `/cart` is still allowed.
2. **Bag empty after successful order.** Once a COD order is placed or a Razorpay payment is verified, the user's cart contains zero items.

## Current state

- `src/pages/checkout/index.astro` reads the session but does not redirect anonymous visitors. The checkout form collects email/phone/name from the user as if they could be a guest.
- `src/lib/checkout.ts::buildPendingOrder` has a guest-checkout branch: if there is no session, it calls `supabase.auth.admin.createUser(email)` (or falls back to `get_auth_uid_by_email` for existing emails) and assigns the order to that profile.
- The three checkout API routes (`/api/checkout/cod-place`, `create-order`, `verify`) all accept anonymous callers.
- Cart clearing **already works** for the authenticated case:
  - COD: `emptyCart(request, cookies, locals.cartToken)` runs at the end of `/api/checkout/cod-place`.
  - Prepaid: `emptyCartByProfileId(result.profile_id)` runs at the end of `/api/checkout/verify` after the Razorpay signature passes.

Goal 2 is therefore implied by Goal 1 — once every checkout goes through an authenticated user, the existing clearing paths suffice.

## Changes

1. **`src/pages/checkout/index.astro`** — at the top of the frontmatter, if no session: `return Astro.redirect('/auth/sign-in?next=/checkout', 302)`. Pass `session.userEmail` into the form and render the email input as read-only.
2. **`src/pages/api/checkout/cod-place.ts`, `create-order.ts`, `verify.ts`** — call `getSession()` at the start; return `401` if absent. (Note: `verify.ts` is called from the Razorpay client-side handler after payment, so the session must still be live — that's fine because the user reached `/checkout` while authenticated.)
3. **`src/lib/checkout.ts`** — `buildPendingOrder` requires `session.userId`; throw if absent. Delete the `admin.createUser` + `get_auth_uid_by_email` fallback. Remove `email` from `CheckoutInput` since it is now derived from `session.userEmail`.
4. **`tests/e2e/mobile.spec.ts`** — add a sign-in step before the COD flow, mirroring the helper in `full-purchase-flow.spec.ts`.

## New tests

5. **`tests/e2e/checkout-auth.spec.ts`** — three checks:
   - Anonymous GET `/checkout` returns 302 to `/auth/sign-in?next=/checkout`.
   - Anonymous POST to each of the 3 checkout APIs returns 401.
   - Logged-in user places a COD order; afterwards, querying `cart_items` for that user returns 0 rows.

## Non-goals

- Do not gate `/cart` itself. Anonymous shoppers can still build a cart and see totals.
- Do not change the auth flow itself (sign-in, sign-up, OAuth callback are untouched).
- Do not change the cart-clearing implementation. `emptyCart` and `emptyCartByProfileId` already do the right thing.

## Risk + rollout

- Single-PR change. Existing `full-purchase-flow.spec.ts` already signs in, so it keeps passing. `mobile.spec.ts` is the only test that needs an auth step added.
- No DB migration. No new dependencies.
- Backwards-incompatible for any in-flight guest checkout — but guest checkout was already broken in subtle ways (cart split between anon-cookie cart and newly-created profile cart), so this is a cleanup as much as a tightening.
