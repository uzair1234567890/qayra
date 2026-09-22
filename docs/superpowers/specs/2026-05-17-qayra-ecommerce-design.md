# qayra.in — Design Spec

**Date:** 2026-05-17
**Owner:** Uzair (`khaledtumbi@gmail.com`)
**Scope:** Full custom e-commerce platform for qayra car air freshener brand (12-week v1 build).
**Status:** Brainstorming approved → ready for implementation plan.

---

## 1. Project context

qayra is a new direct-to-consumer car air freshener brand launching at qayra.in (domain owned). The brand sits in the **modern lifestyle / mid-market** segment (₹250–₹700 per unit). Brand voice is **calm**. Initial catalog is **one product format with four scents**: Azeziya, Velvet Midnight, Blue Lotus Mist, Imperial Musk. Solo founder. Pan-India shipping. No physical retail.

The site must serve three distinct user types with completely different interfaces:

- **Customers** — browse, buy, manage own orders.
- **Operations manager** — process orders fast (pack → enter AWB → ship → deliver → returns).
- **Admin** — manage the business (products, marketing, customers, reports, team).

Customer storefront, admin panel, and operations panel all live in **one Astro project** with route-group separation and Supabase Row-Level Security enforcing role boundaries.

## 2. Build approach

**Single big v1 build, no phased launch.** Estimated 12 weeks (3 months) for one developer working ~35–40 hours/week. The site does not go live until the full v1 is complete. Operations manager role is built day-one but the founder operates both admin and ops until volume justifies separating.

## 3. Brand system

### 3.1 Color palette — "Midnight Velvet"

| Token        | Hex       | Use                                               |
| ------------ | --------- | ------------------------------------------------- |
| `cream`      | `#F2EDE4` | Page background (light surfaces)                  |
| `champagne`  | `#D4B97A` | Primary accent, links, gold details               |
| `aubergine`  | `#5C3A6E` | Secondary accent, hover states, mid-tone surfaces |
| `navy`       | `#231840` | Buttons, brand-mark, deep surfaces                |
| `near-black` | `#0E0820` | Hero backgrounds, ops dashboard background        |

### 3.2 Typography

- **Display serif:** Fraunces (variable, weights 300–500, SOFT axis 50–100). Used for scent names, hero headlines, brand wordmark.
- **Body sans:** Manrope (variable, weights 300–600). Used for body copy, navigation, buttons, UI in storefront.
- **Admin/Ops sans:** Inter (weights 400–700) + JetBrains Mono (for numeric data). Storefront fonts NOT used in admin/ops — the dashboards intentionally feel different.

### 3.3 Logo

**Direction B — Wordmark + scent curl.** A hand-drawn wisp (representing fragrance/smoke) sits above the wordmark. The curl alone works as a standalone mark for favicon, social avatar, packaging stamp. Final logo refinement in build Week 1.

### 3.4 Photography & imagery

**Critical risk:** No product photography exists at start of build. Photoshoot scheduled for Week 4. Until photoshoot, the storefront uses placeholder gradient cards (Midnight Velvet tones) so the rest of the system can be built. If photoshoot slips, fallback is AI-generated product mockups (Midjourney/Flux). Real photography swap-in is decoupled and non-blocking.

## 4. Animation language

Motion system designed around "calm — like a slow exhale":

- Default duration **400ms**; hover **200ms**; cart **300ms**.
- Easing: `ease-out` for entrances; `ease-in-out` for transitions; never `linear`.
- Movement distances: 8–12px. Opacity always 0→1, never partial.
- Brand signature: the logo's scent curl gently breathes — 4s loop, 0.85↔1.0 opacity + 1px vertical drift.

### 4.1 Animation inventory (full list)

| Surface                   | Animation                                                           | Trigger          |
| ------------------------- | ------------------------------------------------------------------- | ---------------- |
| Page navigation           | View Transitions API soft cross-fade                                | route change     |
| Homepage hero             | Title fades up 12px (600ms), subtitle (+200ms), CTA (+400ms)        | page load        |
| Scent grid cards          | Fade up 8px, staggered 80ms each                                    | scroll into view |
| Scent card hover          | Image scales 1.03, gold underline slides in                         | hover            |
| Add-to-bag button         | BG fills L→R + checkmark fade-in + label swap to "Added ✓" for 1.2s | click            |
| Cart drawer               | Slide-in from right 300ms ease-out, backdrop fade 200ms             | open             |
| Cart line item add/remove | Fade + 8px slide + height collapse                                  | item change      |
| PDP scent switcher        | Chip BG fills with gold; image cross-fades to new variant           | scent click      |
| Sticky buy bar            | Slides up on load; hides on scroll-down, shows on scroll-up         | scroll direction |
| Checkout step transitions | Step content fades+slides 300ms                                     | step advance     |
| Toast notifications       | Slide down from top 300ms, dismiss 4s                               | event            |
| Loading states            | Skeleton shimmer 1.5s loop                                          | data fetch       |
| Logo scent curl           | Continuous 4s breathe loop                                          | always           |

### 4.2 Explicitly NOT used

- No video backgrounds, custom cursors, 3D rotations, parallax beyond minimal hero offset, marquee scrollers, confetti, or scroll-jacking.
- `prefers-reduced-motion` honored: all animations become instant.

### 4.3 Implementation

- Astro built-in View Transitions for page navigation.
- Tailwind animation utilities + ~4 custom `@keyframes` (logo breathe, hero stagger, button fill, cart slide).
- Vanilla Intersection Observer (~30 LOC) for scroll reveals.
- **No Framer Motion, no GSAP** — motion needs are too small to justify a 50kb library on a static-first Astro site.

## 5. Architecture

### 5.1 Approach

**One Astro project, three route groups, shared codebase.**

```
/                    customer storefront (SSG + island hydration where needed)
/admin/*             admin dashboard      (SSR, role='admin'    in JWT)
/ops/*               operations dashboard (SSR, role='operations' in JWT)
```

Role separation enforced two ways:

1. **Astro middleware** — checks `auth.jwt()->>'role'` on every `/admin` and `/ops` request, redirects unauthorized.
2. **Supabase RLS** — database refuses access at the row level even if middleware is bypassed.

### 5.2 Tech stack

| Layer            | Choice                                                              | Reason                                                                          |
| ---------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Framework        | Astro 4.x                                                           | Static-first SEO + islands where needed, View Transitions built-in              |
| Styling          | Tailwind CSS 3.x                                                    | Custom Midnight Velvet theme tokens                                             |
| Types            | TypeScript 5.x + Zod                                                | Runtime validation at API boundaries                                            |
| Fonts            | Fraunces + Manrope (storefront), Inter + JetBrains Mono (admin/ops) | Free Google Fonts, variable                                                     |
| Icons            | Lucide (inline SVG)                                                 | Tree-shakable, no React dep                                                     |
| Database         | Supabase Postgres 15 with RLS                                       | Free tier, managed, RLS native                                                  |
| Auth             | Supabase Auth — email/password + Google OAuth                       | (Mobile OTP rejected; cost-conscious)                                           |
| Storage          | Supabase Storage                                                    | Product images, scent imagery, review photos                                    |
| Realtime         | Supabase Realtime                                                   | Admin/ops dashboards subscribe to new orders                                    |
| Payments         | Razorpay Standard Checkout                                          | UPI / cards / netbanking / wallets / EMI                                        |
| Email            | **None**                                                            | Founder sends emails manually; Razorpay payment receipt is only automated email |
| Analytics        | **None**                                                            | Founder accepts flying blind in v1                                              |
| Hosting          | Vercel                                                              | Astro SSR, edge functions, preview deploys                                      |
| DNS              | Cloudflare                                                          | Free, fast                                                                      |
| Error monitoring | Sentry (free tier)                                                  | Production error visibility                                                     |
| CI/CD            | GitHub Actions                                                      | Lint/typecheck/build on PR, auto-deploy main                                    |
| Testing          | Vitest (unit) + Playwright (E2E for checkout)                       | Standard                                                                        |

**Estimated monthly fixed cost: ~₹70** (domain amortization only). Razorpay charges 2% + GST on transactions.

## 6. Sitemap

### 6.1 Customer storefront

```
/                              home (shop-forward layout)
/scents                        collection — all 4 scents
/scent/azeziya                 PDP — Azeziya
/scent/velvet-midnight         PDP — Velvet Midnight
/scent/blue-lotus-mist         PDP — Blue Lotus Mist
/scent/imperial-musk           PDP — Imperial Musk
/bundles/starter-set           bundle PDP
/story                         brand story
/contact                       contact form
/cart                          cart page
/checkout                      checkout (address + payment)
/checkout/success              thank you page
/auth/sign-in                  email/password + Google
/auth/sign-up                  email/password + Google
/auth/forgot-password          reset flow
/account                       account dashboard
/account/orders                order history
/account/orders/[id]           order detail + reorder button
/account/addresses             saved addresses
/account/profile               email/password/profile
/account/reviews               "leave a review" prompts
/policies/shipping             shipping policy
/policies/returns              return policy
/policies/privacy              privacy
/policies/terms                terms
/404, /500                     error pages
```

### 6.2 Admin panel (role=`admin`)

```
/admin                         dashboard (KPIs, latest orders, low stock)
/admin/orders                  all orders, filterable
/admin/orders/[id]             order detail + edit
/admin/products                products
/admin/products/[id]           edit product + variants
/admin/scents                  manage 4 scents (notes, images, stock)
/admin/bundles                 manage bundles
/admin/inventory               stock-on-hand per scent
/admin/discounts               discount codes (FLAT100, etc.)
/admin/offers                  auto-applied rules (free ship >499)
/admin/banners                 hero banner / announcement bar CMS
/admin/reviews                 moderate reviews
/admin/customers               customer list
/admin/customers/[id]          customer detail + order history
/admin/reports                 revenue, top scents, COD vs prepaid split
/admin/team                    manage admin/ops user accounts
/admin/settings                store settings
```

### 6.3 Operations panel (role=`operations`)

```
/ops                           Kanban dashboard (queue)
/ops/to-pack                   paid/confirmed orders ready to pack
/ops/to-dispatch               packed orders awaiting AWB entry
/ops/in-transit                shipped orders (manual status update)
/ops/delivered                 closed orders (read-only)
/ops/returns                   return/refund requests
/ops/orders/[id]               order detail with action buttons:
                               - mark packed
                               - enter AWB # + courier name (free text)
                               - mark shipped
                               - mark delivered
                               - log return / refund
/ops/inventory                 low-stock alerts
```

### 6.4 Out of scope for v1

- `/journal` blog — Phase 2
- Wishlist — Phase 2
- Search bar — only 4 scents, browse is faster
- Live chat — too operationally heavy
- Gift cards / gift wrap — Phase 2
- Subscriptions — Phase 2
- Multi-currency / multi-language — INR-only
- Mobile OTP auth — explicitly rejected (founder picked email/password despite conversion tradeoff)
- COD verification queue (`/ops/cod-confirmations`) — explicitly dropped

## 7. Customer-facing UX

### 7.1 Homepage layout — shop-forward

Compact hero (text left, gradient image right) → free-shipping banner → all 4 scents in 2×2 grid above the fold (each with "+ Add to bag") → reviews section → footer. Optimized for fast paid-traffic conversion. Less moody than editorial alternatives.

### 7.2 PDP layout — mobile-first with sticky buy bar

Big square image at top (swipeable on mobile) → scent name, tagline, reviews → 4-pill scent switcher (chip layout, gold accent when active) → description → scent notes card (top/heart/base) → "Pairs well with" cross-sell → **persistent "Add to bag" bar pinned to viewport bottom** with current scent + price. Strongest mobile conversion because Add-to-bag is always one tap away.

### 7.3 Cart — slide-out drawer + dedicated `/cart` page

Drawer triggers from "Bag (n)" button in header. Line items with thumbnail, name, scent, quantity, price, remove. Subtotal + "Free shipping unlocked at ₹499 — you're ₹X away" progress indicator. "Checkout" button → `/checkout`.

### 7.4 Checkout flow

Single page, four sequential sections (no multi-page wizard):

1. **Contact** — email + phone
2. **Shipping address** — full Indian address with pincode (auto-fill city/state via free pincode API)
3. **Payment** — Prepaid (Razorpay) | COD (+₹50 surcharge shown clearly)
4. **Review** — final totals, place order

Address book (logged-in customers) lets them pick from saved addresses. Guest checkout supported — account auto-created at order completion using their email; they claim it later via password reset.

### 7.5 Customer account UX

`/account` is a centerpiece. Heavy emphasis on **/account/orders/[id]** since this replaces all dispatch/delivery emails. Each order page shows:

- Status timeline (Paid → Packed → Shipped → Delivered) with checkmarks
- AWB + courier name (copyable, with link to courier tracking site if pattern-matched)
- Item list with thumbnails
- **One-tap "Reorder this" button** (restores items to cart)
- "Need help with this order?" → opens email template prefilled with order number

## 8. Admin UX (role=`admin`)

Light theme, sidebar nav, data-dense.

- Left sidebar grouped: Overview / Sell / Marketing / People / Setup (17 routes total)
- Top: KPI cards row (revenue, orders, conv. rate, AOV) with day/week/month tabs
- Main: latest-orders table + revenue chart + low-stock callout
- Tables use JetBrains Mono for numeric columns
- New-order count badge in sidebar (since no email alerts) — updates via Supabase Realtime

Inspired by Stripe / Shopify Admin / Linear. Built for long working sessions at a desk.

## 9. Operations UX (role=`operations`)

Dark theme, Kanban-focused, action-first.

- Top bar: brand + role chip + logout (no sidebar)
- Banner: "Today's queue: X orders need action"
- Three Kanban columns: **To Pack** → **Add AWB** → **In Transit**
- Each card shows order code (Q-xxxx), customer, items, payment method (COD highlighted gold), amount, and **one big action button** (the next step in the flow)
- Bottom row: returns/refund queue card with action button
- Mobile-friendly (ops manager may work on a phone in a warehouse)

Inspired by Linear's triage view. Intentionally feels nothing like admin — operations is process-focused, not analytical.

## 10. Roles & permissions

Three roles, single JWT claim:

| Capability                               | Anonymous                | Customer | Operations | Admin |
| ---------------------------------------- | ------------------------ | -------- | ---------- | ----- |
| Browse storefront                        | ✓                        | ✓        | ✓          | ✓     |
| Add to cart (guest)                      | ✓                        | ✓        | —          | —     |
| Place order                              | ✓ (account auto-created) | ✓        | —          | —     |
| View own orders                          | —                        | ✓        | ✓          | ✓     |
| Reorder past order                       | —                        | ✓        | —          | —     |
| Leave review (own delivered orders only) | —                        | ✓        | —          | —     |
| View all orders                          | —                        | —        | ✓          | ✓     |
| Update order status                      | —                        | —        | ✓          | ✓     |
| Enter AWB number                         | —                        | —        | ✓          | ✓     |
| Process returns/refunds                  | —                        | —        | ✓          | ✓     |
| CRUD products / scents / bundles         | —                        | —        | —          | ✓     |
| CRUD discounts / offers / banners        | —                        | —        | —          | ✓     |
| Moderate reviews                         | —                        | —        | —          | ✓     |
| View revenue reports                     | —                        | —        | —          | ✓     |
| Edit store settings                      | —                        | —        | —          | ✓     |
| Manage team                              | —                        | —        | —          | ✓     |

Admin is a superset of operations — admin can do everything ops can plus more, so admin can cover for ops when needed.

## 11. Data model (Supabase / Postgres)

```
auth.users                   -- Supabase managed
profiles                     -- id (=auth.users.id), full_name, phone, role
addresses                    -- id, profile_id, name, line1, line2, city, state, pincode, phone, is_default

products                     -- id, slug, name, description, base_price, status
scents                       -- id, product_id, slug, name, tagline, description,
                                top_notes, heart_notes, base_notes, image_urls[],
                                stock_qty, active
bundles                      -- id, slug, name, description, price, image_url, status
bundle_items                 -- bundle_id, scent_id, quantity

carts                        -- id, profile_id (nullable), anon_token (nullable), updated_at
cart_items                   -- cart_id, scent_id|bundle_id, quantity

orders                       -- id, code (Q-2418), profile_id, status (pending|paid|packed|
                                shipped|delivered|cancelled|returned),
                                payment_method (prepaid|cod), payment_status,
                                subtotal, discount_total, shipping_total, cod_surcharge, total,
                                address_snapshot_json, created_at
order_items                  -- order_id, scent_id|bundle_id, name_snapshot, price_snapshot, quantity
order_status_history         -- order_id, status, note, actor_id, created_at
shipments                    -- order_id, courier_name (manual entry, free text),
                                awb_number, dispatched_at, delivered_at
returns                      -- order_id, reason, status, refund_amount, processed_at, actor_id

discounts                    -- code, type (percent|fixed), value, min_subtotal,
                                max_uses, used_count, active_from, active_until
offers                       -- id, name, rule_json, active   -- e.g. {min:499, gives:"free_shipping"}
banners                      -- id, image_url, headline, cta_text, cta_url,
                                position (hero|announcement), active_from, active_until

reviews                      -- id, scent_id, profile_id, order_id, rating (1-5),
                                title, body, photo_urls[], status (pending|published|hidden)

audit_log                    -- actor_id, action, target_table, target_id, payload_json, created_at
```

### 11.1 RLS policy sketch

```sql
-- profiles: users access only their own row
create policy "own profile" on profiles for all
  using (id = auth.uid());

-- orders: customers see only own, ops/admin see all
create policy "own orders or staff" on orders for select
  using (
    profile_id = auth.uid()
    OR (auth.jwt()->>'role') in ('operations','admin')
  );

create policy "staff updates orders" on orders for update
  using ((auth.jwt()->>'role') in ('operations','admin'));

-- products, discounts, offers, banners: admin only writes
create policy "admin only" on products for all
  using ((auth.jwt()->>'role') = 'admin');

-- reviews: customer inserts only for own delivered orders
create policy "review own delivered order" on reviews for insert
  with check (
    profile_id = auth.uid()
    AND exists (
      select 1 from orders
      where id = reviews.order_id
        and profile_id = auth.uid()
        and status = 'delivered'
    )
  );
```

## 12. Marketing & conversion features

### 12.1 In scope (v1)

- **Discount codes** — admin creates codes; customer enters at checkout
- **Auto-applied offers** — rule-based (e.g., "free shipping over ₹499") evaluated server-side at cart and checkout
- **Homepage banner CMS** — admin can change hero banner + announcement bar without code
- **Product bundles** — "Starter Set: all 4 scents at ₹999"
- **Cross-sell on PDP** — "Pairs well with" widget
- **Reviews & ratings** — star + photo reviews, only from customers who received the product
- **COD surcharge (₹50)** — visible at checkout, filters flaky COD buyers
- **Reorder button** — one-tap restore-to-cart from any past order

### 12.2 Explicitly NOT in v1 (founder decision: no email service)

- ❌ Abandoned cart recovery (1h / 24h / 72h emails)
- ❌ Reorder nudge day-25
- ❌ Review request 7d after delivery
- ❌ Welcome email series
- ❌ Order confirmation / dispatch / delivery emails
- ❌ Email broadcasts
- ❌ Post-purchase upsell
- ❌ Referral program
- ❌ Loyalty points

Razorpay's built-in payment receipt is the only automated email customer receives. Founder sends any other communications manually.

### 12.3 Compensating in-app patterns (since no email)

- Admin sidebar shows "New orders today: N" badge updated via Supabase Realtime
- Admin dashboard shows low-stock alerts as banner
- Customer `/account/orders/[id]` is _the_ source of truth for status; status timeline + AWB clearly shown; customer must check there rather than wait for email
- Ops Kanban already surfaces "needs action" by column

## 13. Build phases — 12 weeks

| Week   | Focus                       | Deliverables                                                                                                                                                                                                          |
| ------ | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1**  | Foundation                  | Logo finalization, Tailwind theme tokens, Astro scaffold, Supabase project, schema migrations, RLS policies, auth (email/password + Google), middleware for role-gated routes. **Razorpay KYC submission this week.** |
| **2**  | Storefront — public pages   | Home (shop-forward), /scents collection, 4× PDP, /story, /contact, footer, 404                                                                                                                                        |
| **3**  | Cart & checkout             | Cart drawer + /cart, /checkout (address → payment → review), Razorpay integration, COD surcharge logic, order creation, /checkout/success                                                                             |
| **4**  | Customer accounts           | /account dashboard, /account/orders, order detail with reorder, addresses, profile, reviews list. **Photoshoot scheduled this week.**                                                                                 |
| **5**  | Admin — catalog & marketing | Admin shell + sidebar, /admin dashboard, /admin/products, /scents, /bundles, /inventory, /discounts, /offers, /banners                                                                                                |
| **6**  | Admin — orders & people     | /admin/orders + detail, /admin/customers + detail, /admin/reviews moderation, /admin/reports, /admin/team, /admin/settings                                                                                            |
| **7**  | Operations panel            | Ops dark shell, /ops Kanban, order detail action buttons, AWB entry, /ops/returns, /ops/inventory                                                                                                                     |
| **8**  | Realtime + reorder + bundle | Supabase Realtime subscriptions for admin/ops, reorder restore-to-cart, bundle PDP, bundle pricing logic                                                                                                              |
| **9**  | Marketing surface           | Cross-sell widget on PDP, reviews rendering on PDP, low-stock badges, banner CMS rendering on home, auto-offer rule evaluator                                                                                         |
| **10** | Polish                      | All animations (logo breathe, hero stagger, button fills, cart slide, View Transitions, scroll reveals), accessibility audit (keyboard, ARIA, prefers-reduced-motion), error states & empty states                    |
| **11** | QA & hardening              | Full E2E test of checkout (Playwright), RLS audit (try to access other users' data as each role), Razorpay test-mode end-to-end, mobile device testing, Lighthouse >90 across all routes                              |
| **12** | Launch                      | Production Razorpay activation, DNS cutover to qayra.in, sitemap submission, soft launch with friends/family (20 orders), monitor Sentry, hotfix sprint                                                               |

## 14. Risks & mitigations

| Risk                                                    | Likelihood  | Impact                        | Mitigation                                                                       |
| ------------------------------------------------------- | ----------- | ----------------------------- | -------------------------------------------------------------------------------- |
| Photoshoot slips past Week 4                            | Medium      | High (PDPs look bare)         | Lock in photographer in Week 1; AI/3D imagery as fallback                        |
| Razorpay KYC delays                                     | Medium      | High (cannot accept payments) | Submit KYC in Week 1, not Week 11                                                |
| Solo developer burnout / sick days                      | Medium      | Medium (timeline slips)       | 1-week buffer baked into Week 12; don't promise public launch date until Week 11 |
| No email service = customer support load                | High        | Medium                        | `/account/orders/[id]` page must be exceptional; status is always self-serve     |
| No analytics = no visibility                            | High        | Medium                        | Founder accepts blind launch; recommend adding free Vercel Analytics post-launch |
| Mobile-OTP rejected = checkout conversion ~15–25% lower | High        | Medium                        | Document for Phase 2 reconsideration after first 100 orders                      |
| RTO (return-to-origin) on COD orders                    | Medium-High | Medium (cost per RTO ~₹100)   | ₹50 COD surcharge applied; Phase 2 may add OTP verification queue                |

## 15. Out of scope (Phase 2+)

- `/journal` editorial blog
- Subscription / auto-replenish (recurring Razorpay payments)
- Email service (Resend) + automated flows (abandoned cart, reorder nudge, review request, welcome, dispatch/delivery)
- Analytics (Vercel Analytics or Plausible)
- Mobile OTP auth
- WhatsApp Business API notifications
- GST invoice field at checkout
- Wishlist, gift cards, gift wrap
- Loyalty points, referral program, post-purchase upsell
- Search bar (only 4 scents — browse is faster)
- Live chat
- Multi-currency, multi-language
- Courier API integration (Shiprocket/Delhivery direct) — manual AWB entry continues
- COD verification queue
- Operations panel separation from admin (founder operates both initially)

## 16. Open items for implementation

These are decisions that need to be made _during_ the build, not now:

- Final logo refinement (Week 1) — exact curl shape, kerning, lockup proportions
- Per-scent tagline + scent-notes copy (Week 4) — written collaboratively with founder
- Brand story content for `/story` (Week 2)
- Policy text for shipping/returns/privacy/terms (Week 2; founder provides drafts)
- Reviews policy — auto-publish vs admin pre-moderation (Week 6)
- Courier name dropdown choices for ops AWB entry (Week 7; based on which couriers founder actually uses)
- Razorpay webhook handling for payment failures and refunds (Week 3)
