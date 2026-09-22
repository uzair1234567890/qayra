# Button loading & navigation feedback — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a single consistent loading pattern across the site: clicking any button or link-button (except the navbar logo) replaces its label with an inline spinner; action buttons follow up with a brief success/error label then revert; navigation buttons stay spinning until the new page renders.

**Architecture:** One global client script + one CSS file + a `data-loading` opt-in convention. Centered on `src/components/ui/Button.astro` (opts in by default) plus three event paths handled by the script (navigation, form submit, async action via `withButtonState`). Cleanup is driven by Astro ClientRouter's `astro:after-swap` and `pageshow` / `pagehide`, with an 8s safety net.

**Tech Stack:** Astro 6 (SSR + ClientRouter), Tailwind 4, TypeScript, Vitest (Node env) for pure helpers, Playwright for browser behavior.

**Spec:** `docs/superpowers/specs/2026-05-18-button-loading-and-navigation-feedback-design.md`

---

## File map

**New files**
- `src/lib/ui/loading.ts` — pure helpers (link classifier), unit-testable in Node.
- `src/scripts/button-loading.client.ts` — DOM state machine, delegated event handlers, `withButtonState`.
- `src/styles/button-loading.css` — spinner keyframes + reduced-motion fallback.
- `tests/unit/loading.test.ts` — vitest unit tests for the classifier.
- `tests/e2e/button-loading.spec.ts` — Playwright e2e for the full behavior.

**Modified files**
- `src/styles/globals.css` — `@import` the new CSS.
- `src/components/ui/Button.astro` — add `excludeLoading?: boolean` prop; emit `data-loading` unless excluded.
- `src/components/layout/SiteHeader.astro` — add `data-no-loading` to the logo link.
- `src/layouts/PublicLayout.astro` — import the script once.
- `src/layouts/AdminLayout.astro` — import the script once.
- `src/layouts/AuthLayout.astro` — import the script once.
- `src/layouts/OpsLayout.astro` — import the script once.
- `src/components/product/StickyBuyBar.astro` — refactor handler to use `window.qaButton.withState`.
- `src/pages/cart.astro` — refactor inline cart-line handler to use `window.qaButton.withState`.

---

## Task 1: Pure link classifier (TDD)

**Files:**
- Create: `src/lib/ui/loading.ts`
- Test: `tests/unit/loading.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/loading.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { isInternalNavLink, type LinkInfo } from '../../src/lib/ui/loading';

const SITE = 'https://qayra.in';

function link(partial: Partial<LinkInfo>): LinkInfo {
  return {
    href: 'https://qayra.in/scents',
    target: '',
    download: false,
    protocol: 'https:',
    origin: 'https://qayra.in',
    ...partial,
  };
}

describe('isInternalNavLink', () => {
  it('returns true for same-origin http(s) link', () => {
    expect(isInternalNavLink(link({}), SITE)).toBe(true);
  });
  it('returns false for cross-origin link', () => {
    expect(isInternalNavLink(link({ origin: 'https://other.com' }), SITE)).toBe(false);
  });
  it('returns false for target=_blank', () => {
    expect(isInternalNavLink(link({ target: '_blank' }), SITE)).toBe(false);
  });
  it('treats target=_self as internal', () => {
    expect(isInternalNavLink(link({ target: '_self' }), SITE)).toBe(true);
  });
  it('returns false for download attribute', () => {
    expect(isInternalNavLink(link({ download: true }), SITE)).toBe(false);
  });
  it('returns false for mailto:', () => {
    expect(isInternalNavLink(link({ protocol: 'mailto:', origin: '' }), SITE)).toBe(false);
  });
  it('returns false for tel:', () => {
    expect(isInternalNavLink(link({ protocol: 'tel:', origin: '' }), SITE)).toBe(false);
  });
  it('returns false when href is empty', () => {
    expect(isInternalNavLink(link({ href: '' }), SITE)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm run test:unit -- loading`
Expected: FAIL — `Cannot find module '../../src/lib/ui/loading'`.

- [ ] **Step 3: Implement `src/lib/ui/loading.ts`**

Create `src/lib/ui/loading.ts`:

```ts
export interface LinkInfo {
  href: string;
  target: string;
  download: boolean;
  protocol: string;
  origin: string;
}

export function isInternalNavLink(info: LinkInfo, currentOrigin: string): boolean {
  if (!info.href) return false;
  if (info.target && info.target !== '_self') return false;
  if (info.download) return false;
  if (info.protocol !== 'http:' && info.protocol !== 'https:') return false;
  return info.origin === currentOrigin;
}

export function readLinkInfo(a: HTMLAnchorElement): LinkInfo {
  return {
    href: a.getAttribute('href') ?? '',
    target: a.target ?? '',
    download: a.hasAttribute('download'),
    protocol: a.protocol,
    origin: a.origin,
  };
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npm run test:unit -- loading`
Expected: PASS — 8/8 tests pass.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/ui/loading.ts tests/unit/loading.test.ts
git commit -m "feat(ui): add pure link classifier for loading state opt-in"
```

---

## Task 2: Spinner CSS

**Files:**
- Create: `src/styles/button-loading.css`
- Modify: `src/styles/globals.css`

- [ ] **Step 1: Create `src/styles/button-loading.css`**

```css
.qa-spinner {
  width: 1em;
  height: 1em;
  display: inline-block;
  transform-origin: center;
  animation: qa-spin 800ms linear infinite;
}

@keyframes qa-spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .qa-spinner {
    animation: qa-dots 1500ms steps(3, end) infinite;
    transform: none;
  }
  @keyframes qa-dots {
    0%, 100% { opacity: 0.25; }
    50%      { opacity: 1; }
  }
}

/* While loading, prevent any flex/grid alignment surprises */
[data-state='loading'] > * { vertical-align: middle; }
```

- [ ] **Step 2: Import it from `src/styles/globals.css`**

Open `src/styles/globals.css` and add at the top (after any existing imports):

```css
@import './button-loading.css';
```

If you cannot tell where existing imports are, run:

```powershell
Get-Content src/styles/globals.css -TotalCount 10
```

Place the `@import` after the last `@import` line (or at line 1 if there are none).

- [ ] **Step 3: Sanity build**

Run: `npm run build`
Expected: build succeeds, no CSS parse errors.

- [ ] **Step 4: Commit**

```powershell
git add src/styles/button-loading.css src/styles/globals.css
git commit -m "feat(ui): add spinner css with reduced-motion fallback"
```

---

## Task 3: Client script — state machine core

**Files:**
- Create: `src/scripts/button-loading.client.ts`

This task lands the full script in one shot because the file is small (~150 LOC) and each section depends on shared private helpers. End-to-end behavior is verified by the Playwright suite in Task 8.

- [ ] **Step 1: Create `src/scripts/button-loading.client.ts`**

```ts
import { isInternalNavLink, readLinkInfo } from '../lib/ui/loading';

type ButtonLike = HTMLButtonElement | HTMLAnchorElement;

const SPINNER_SVG =
  '<svg class="qa-spinner" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
  '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.4" ' +
  'stroke-linecap="round" stroke-dasharray="42 100" />' +
  '</svg>';

const NAV_SAFETY_MS = 8000;
const SUCCESS_REVERT_MS = 1200;
const ERROR_REVERT_MS = 1500;

interface StoredState {
  children: Node[];
  minWidth: string;
  minHeight: string;
  ariaBusy: string | null;
  ariaDisabled: string | null;
  disabled: boolean;
  pointerEvents: string;
  timer?: number;
}

const STATE = new WeakMap<ButtonLike, StoredState>();

function isExcluded(el: Element): boolean {
  return el.closest('[data-no-loading]') !== null;
}

function isOptedIn(el: Element): el is ButtonLike {
  if (!(el instanceof HTMLButtonElement) && !(el instanceof HTMLAnchorElement)) return false;
  if (isExcluded(el)) return false;
  if (el.hasAttribute('data-loading')) return true;
  if (el instanceof HTMLButtonElement && el.type === 'submit' && el.form) return true;
  return false;
}

function enterLoading(el: ButtonLike): void {
  if (STATE.has(el)) return;
  const stored: StoredState = {
    children: Array.from(el.childNodes),
    minWidth: el.style.minWidth,
    minHeight: el.style.minHeight,
    ariaBusy: el.getAttribute('aria-busy'),
    ariaDisabled: el.getAttribute('aria-disabled'),
    disabled: el instanceof HTMLButtonElement ? el.disabled : false,
    pointerEvents: el.style.pointerEvents,
  };
  const rect = el.getBoundingClientRect();
  el.style.minWidth = `${Math.round(rect.width)}px`;
  el.style.minHeight = `${Math.round(rect.height)}px`;
  el.dataset.state = 'loading';
  el.setAttribute('aria-busy', 'true');
  if (el instanceof HTMLButtonElement) el.disabled = true;
  else {
    el.setAttribute('aria-disabled', 'true');
    el.style.pointerEvents = 'none';
  }
  el.replaceChildren();
  const sr = document.createElement('span');
  sr.className = 'sr-only';
  sr.dataset.stateLabel = '';
  sr.textContent = 'Loading';
  const wrap = document.createElement('span');
  wrap.innerHTML = SPINNER_SVG;
  el.append(sr, wrap.firstElementChild as Element);
  STATE.set(el, stored);
}

function showTerminal(
  el: ButtonLike,
  text: string,
  finalState: 'success' | 'error',
  revertMs: number,
): void {
  const stored = STATE.get(el);
  if (!stored) return;
  el.dataset.state = finalState;
  el.replaceChildren();
  const sr = document.createElement('span');
  sr.className = 'sr-only';
  sr.dataset.stateLabel = '';
  sr.textContent = finalState === 'success' ? 'Success' : 'Failed';
  const visible = document.createElement('span');
  visible.textContent = text;
  el.append(sr, visible);
  stored.timer = window.setTimeout(() => revert(el), revertMs);
}

function revert(el: ButtonLike): void {
  const stored = STATE.get(el);
  if (!stored) return;
  if (stored.timer) clearTimeout(stored.timer);
  el.replaceChildren(...stored.children);
  delete el.dataset.state;
  if (stored.ariaBusy === null) el.removeAttribute('aria-busy');
  else el.setAttribute('aria-busy', stored.ariaBusy);
  if (el instanceof HTMLButtonElement) el.disabled = stored.disabled;
  else {
    if (stored.ariaDisabled === null) el.removeAttribute('aria-disabled');
    else el.setAttribute('aria-disabled', stored.ariaDisabled);
    el.style.pointerEvents = stored.pointerEvents;
  }
  el.style.minWidth = stored.minWidth;
  el.style.minHeight = stored.minHeight;
  STATE.delete(el);
}

async function withButtonState<T>(
  btn: HTMLButtonElement,
  fn: () => Promise<T>,
): Promise<T | undefined> {
  if (STATE.has(btn)) return undefined;
  enterLoading(btn);
  try {
    const result = await fn();
    showTerminal(btn, btn.dataset.successLabel ?? '✓', 'success', SUCCESS_REVERT_MS);
    return result;
  } catch (err) {
    showTerminal(btn, btn.dataset.errorLabel ?? 'Failed', 'error', ERROR_REVERT_MS);
    throw err;
  }
}

async function fetchOk(input: RequestInfo, init?: RequestInit): Promise<Response> {
  const r = await fetch(input, init);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r;
}

let navTimer: number | undefined;

function armNavSafety(): void {
  if (navTimer) clearTimeout(navTimer);
  navTimer = window.setTimeout(() => {
    document.querySelectorAll<HTMLAnchorElement>('a[data-state="loading"]').forEach(revert);
  }, NAV_SAFETY_MS);
}

function handleClick(e: MouseEvent): void {
  if (e.defaultPrevented) return;
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
  const target = (e.target as Element | null)?.closest<ButtonLike>('a,button');
  if (!target) return;
  if (target.dataset.state === 'loading') {
    if (target instanceof HTMLAnchorElement) e.preventDefault();
    return;
  }
  if (!isOptedIn(target)) return;
  if (target instanceof HTMLAnchorElement) {
    if (!isInternalNavLink(readLinkInfo(target), location.origin)) return;
    enterLoading(target);
    armNavSafety();
  }
}

function handleSubmit(e: SubmitEvent): void {
  const form = e.target as HTMLFormElement;
  if (!(form instanceof HTMLFormElement)) return;
  const submitter = e.submitter;
  let btn: HTMLButtonElement | null = null;
  if (submitter instanceof HTMLButtonElement && submitter.type === 'submit') btn = submitter;
  else btn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (!btn) return;
  if (isExcluded(btn)) return;
  enterLoading(btn);
  armNavSafety();
}

function clearAllLoading(): void {
  document
    .querySelectorAll<ButtonLike>('a[data-state="loading"],button[data-state="loading"]')
    .forEach(revert);
  if (navTimer) {
    clearTimeout(navTimer);
    navTimer = undefined;
  }
}

document.addEventListener('click', handleClick, true);
document.addEventListener('submit', handleSubmit, true);
document.addEventListener('astro:after-swap', clearAllLoading);
window.addEventListener('pageshow', clearAllLoading);
window.addEventListener('pagehide', clearAllLoading);

declare global {
  interface Window {
    qaButton: {
      withState: typeof withButtonState;
      fetchOk: typeof fetchOk;
    };
  }
}

window.qaButton = { withState: withButtonState, fetchOk };
```

- [ ] **Step 2: Type-check the file**

Run: `npx astro check`
Expected: no errors in `src/scripts/button-loading.client.ts`. If there are unrelated pre-existing errors elsewhere in the project, ignore them; if there are errors in the new file, fix them before continuing.

- [ ] **Step 3: Commit**

```powershell
git add src/scripts/button-loading.client.ts
git commit -m "feat(ui): add button loading client script with state machine"
```

---

## Task 4: Wire the script into all four layouts

**Files:**
- Modify: `src/layouts/PublicLayout.astro`
- Modify: `src/layouts/AdminLayout.astro`
- Modify: `src/layouts/AuthLayout.astro`
- Modify: `src/layouts/OpsLayout.astro`

- [ ] **Step 1: Add the import to `PublicLayout.astro`**

Find the existing `<script src="../scripts/reveal.client.ts"></script>` line near the bottom of `src/layouts/PublicLayout.astro` and add a second `<script>` tag directly below it:

```astro
    <script src="../scripts/reveal.client.ts"></script>
    <script src="../scripts/button-loading.client.ts"></script>
```

- [ ] **Step 2: Add the same `<script>` tag to the other three layouts**

For each of `src/layouts/AdminLayout.astro`, `src/layouts/AuthLayout.astro`, `src/layouts/OpsLayout.astro`:

1. Open the file.
2. Find the `</body>` tag.
3. Insert immediately before it:

```astro
    <script src="../scripts/button-loading.client.ts"></script>
```

If the layout already has other `<script src="...">` tags near `</body>`, place this new one beside them so the ordering convention is preserved.

- [ ] **Step 3: Build to confirm the import resolves**

Run: `npm run build`
Expected: build succeeds. The script appears as a bundled asset for every page.

- [ ] **Step 4: Commit**

```powershell
git add src/layouts/PublicLayout.astro src/layouts/AdminLayout.astro src/layouts/AuthLayout.astro src/layouts/OpsLayout.astro
git commit -m "feat(ui): wire button loading script into all layouts"
```

---

## Task 5: Make `Button.astro` opt in by default

**Files:**
- Modify: `src/components/ui/Button.astro`

- [ ] **Step 1: Update the `Props` interface and destructure**

Open `src/components/ui/Button.astro`. Replace the `interface Props` block and the `const { ... } = Astro.props;` line with:

```astro
interface Props {
  variant?: 'primary' | 'secondary' | 'ghost';
  href?: string;
  type?: 'button' | 'submit';
  class?: string;
  disabled?: boolean;
  ariaBusy?: boolean;
  excludeLoading?: boolean;
  successLabel?: string;
  errorLabel?: string;
}

const {
  variant = 'primary',
  href,
  type = 'button',
  class: className = '',
  disabled,
  ariaBusy,
  excludeLoading = false,
  successLabel,
  errorLabel,
} = Astro.props;
```

- [ ] **Step 2: Emit `data-loading` and label attributes**

Replace the `<a>` / `<button>` block at the bottom of the file with:

```astro
{
  href ? (
    <a
      href={href}
      class={cls}
      aria-busy={ariaBusy ? 'true' : undefined}
      data-loading={excludeLoading ? undefined : ''}
      data-no-loading={excludeLoading ? '' : undefined}
      data-success-label={successLabel}
      data-error-label={errorLabel}
    >
      <span style="position: relative; z-index: 1;"><slot /></span>
    </a>
  ) : (
    <button
      type={type}
      class={cls}
      disabled={disabled}
      aria-busy={ariaBusy ? 'true' : undefined}
      data-loading={excludeLoading ? undefined : ''}
      data-no-loading={excludeLoading ? '' : undefined}
      data-success-label={successLabel}
      data-error-label={errorLabel}
    >
      <span style="position: relative; z-index: 1;"><slot /></span>
    </button>
  )
}
```

Leave the existing `<style>` block and `arm()` `<script>` (which handles the navy→champagne ripple) unchanged. The ripple is decorative and independent of the loading state.

- [ ] **Step 3: Type-check**

Run: `npx astro check`
Expected: no new errors.

- [ ] **Step 4: Commit**

```powershell
git add src/components/ui/Button.astro
git commit -m "feat(ui): opt Button.astro into loading state by default"
```

---

## Task 6: Exempt the navbar logo

**Files:**
- Modify: `src/components/layout/SiteHeader.astro`

- [ ] **Step 1: Mark the logo link**

Open `src/components/layout/SiteHeader.astro`. Find the line:

```astro
    <a href="/" class="font-display text-navy text-2xl tracking-tight"
```

Add `data-no-loading=""`:

```astro
    <a href="/" data-no-loading class="font-display text-navy text-2xl tracking-tight"
```

(The `data-no-loading` attribute has no value — Astro renders the bare attribute, which the script's `closest('[data-no-loading]')` check picks up.)

The other navbar links (`/scents`, `/bundles/starter-set`, `/story`, `/account`, `/auth/sign-in`, `/cart`) are left as-is. They will pick up the loading state via the delegated click handler. Per the user's decision, only the logo is exempt.

- [ ] **Step 2: Verify in dev**

Run: `npm run dev` (in a separate terminal) and open `http://localhost:4321/`. Click the `qayra.` logo and confirm no spinner appears; click "Scents" and confirm the link gets the spinner during navigation. Stop dev when satisfied.

- [ ] **Step 3: Commit**

```powershell
git add src/components/layout/SiteHeader.astro
git commit -m "feat(ui): exempt navbar logo from loading state"
```

---

## Task 7: Refactor existing handlers to use `withButtonState`

**Files:**
- Modify: `src/components/product/StickyBuyBar.astro`
- Modify: `src/pages/cart.astro`

### 7a — StickyBuyBar Add-to-bag

- [ ] **Step 1: Add `data-loading` to the button + replace the inline handler**

In `src/components/product/StickyBuyBar.astro`, find the `<button data-add-to-bag ...>` element and add `data-loading` plus a success label:

```astro
  <button
    type="button"
    data-add-to-bag
    data-loading
    data-success-label="Added ✓"
    data-scent-id={scent.id}
    disabled={!inStock}
    class="bg-champagne text-near-black px-5 py-2.5 text-xs font-semibold tracking-widest uppercase disabled:opacity-50"
  >
    Add to bag
  </button>
```

Then replace the first `<script>` block (the one defining `armBuyButton`) with:

```astro
<script>
  function armBuyButton(): void {
    const btn = document.querySelector<HTMLButtonElement>('[data-add-to-bag]');
    if (!btn || btn.dataset.bound) return;
    btn.dataset.bound = '';
    btn.addEventListener('click', async () => {
      await window.qaButton.withState(btn, async () => {
        const scentId = btn.dataset.scentId;
        const r = await window.qaButton.fetchOk('/api/cart/add', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ scent_id: scentId, quantity: 1 }),
        });
        const { bagCount } = await r.json();
        const counter = document.querySelector('[data-bag-count]');
        if (counter && typeof bagCount === 'number') counter.textContent = String(bagCount);
      }).catch(() => {});
    });
  }
  document.addEventListener('astro:page-load', armBuyButton);
</script>
```

The trailing `.catch(() => {})` swallows the error after the button has already shown the "Failed" label — no extra error UI needed.

- [ ] **Step 2: Build to verify no type errors**

Run: `npx astro check`
Expected: no new errors.

- [ ] **Step 3: Commit**

```powershell
git add src/components/product/StickyBuyBar.astro
git commit -m "refactor(ui): use withButtonState for add-to-bag"
```

### 7b — Cart line item handlers

- [ ] **Step 1: Add `data-loading` to the line-item buttons**

Open `src/components/cart/CartLineItem.astro` and add `data-loading` to each of the three buttons:

```astro
      <button data-qty-dec data-loading class="border-navy/30 h-7 w-7 border" aria-label={`Decrease quantity of ${line.name}`}>−</button>
      <span data-qty class="min-w-[1.5rem] text-center" aria-label={`Quantity of ${line.name}`}>{line.quantity}</span>
      <button data-qty-inc data-loading class="border-navy/30 h-7 w-7 border" aria-label={`Increase quantity of ${line.name}`}>+</button>
      <button data-remove data-loading class="text-navy/60 hover:text-navy ml-3 underline" aria-label={`Remove ${line.name} from bag`}>Remove</button>
```

- [ ] **Step 2: Replace the inline script in `src/pages/cart.astro`**

Find the existing `<script>` block at the bottom of `src/pages/cart.astro` (the one that iterates over `[data-line-id]`) and replace it with:

```astro
<script>
  document.querySelectorAll('[data-line-id]').forEach((el) => {
    const id = (el as HTMLElement).dataset.lineId!;
    const qtyEl = el.querySelector('[data-qty]') as HTMLElement | null;
    const decBtn = el.querySelector('[data-qty-dec]') as HTMLButtonElement | null;
    const incBtn = el.querySelector('[data-qty-inc]') as HTMLButtonElement | null;
    const removeBtn = el.querySelector('[data-remove]') as HTMLButtonElement | null;
    if (!qtyEl || !decBtn || !incBtn || !removeBtn) return;

    const submit = (btn: HTMLButtonElement, quantity: number): void => {
      void window.qaButton
        .withState(btn, async () => {
          await window.qaButton.fetchOk('/api/cart/update', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ id, quantity }),
          });
          location.reload();
        })
        .catch(() => {});
    };

    decBtn.addEventListener('click', () =>
      submit(decBtn, Math.max(0, parseInt(qtyEl.textContent ?? '1', 10) - 1)),
    );
    incBtn.addEventListener('click', () =>
      submit(incBtn, parseInt(qtyEl.textContent ?? '1', 10) + 1),
    );
    removeBtn.addEventListener('click', () => submit(removeBtn, 0));
  });
</script>
```

Notes:
- The previous handler disabled all three buttons together via a manual `setDisabled`. With `withButtonState`, the clicked button alone gets disabled while loading. The other buttons remain clickable but the next click will land on the freshly-reloaded page anyway.
- `location.reload()` triggers a full reload, so the loading state on the clicked button is wiped with the old DOM (handled by `pagehide`).

- [ ] **Step 3: Type-check**

Run: `npx astro check`
Expected: no new errors.

- [ ] **Step 4: Commit**

```powershell
git add src/components/cart/CartLineItem.astro src/pages/cart.astro
git commit -m "refactor(ui): use withButtonState for cart line item actions"
```

---

## Task 8: Playwright e2e suite

**Files:**
- Create: `tests/e2e/button-loading.spec.ts`

- [ ] **Step 1: Write the e2e spec**

Create `tests/e2e/button-loading.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('navigation click sets aria-busy and clears after swap', async ({ page }) => {
  await page.goto('/');
  const scentsLink = page.getByRole('link', { name: /^scents$/i }).first();
  await scentsLink.click();
  // After swap, the new page is in the DOM. The old <a> may be removed; if it
  // still exists (same nav), aria-busy must be cleared.
  await page.waitForURL(/\/scents/);
  const stuck = await page.locator('a[data-state="loading"]').count();
  expect(stuck).toBe(0);
});

test('navbar logo has no loading state', async ({ page }) => {
  await page.goto('/scents');
  const logo = page.locator('a[data-no-loading]');
  await expect(logo).toHaveCount(1);
  await logo.click();
  // Logo must never enter the loading state.
  await expect(page.locator('a[data-no-loading][data-state="loading"]')).toHaveCount(0);
});

test('add to bag shows spinner, then Added ✓, then reverts', async ({ page }) => {
  await page.goto('/scent/azeziya');
  const btn = page.getByRole('button', { name: /add to bag/i });
  const responsePromise = page.waitForResponse(
    (r) => r.url().includes('/api/cart/add') && r.status() === 200,
  );
  await btn.click();
  // While in flight, the button is busy.
  await expect(btn).toHaveAttribute('aria-busy', 'true');
  await responsePromise;
  // Success state appears.
  await expect(btn).toHaveAttribute('data-state', 'success', { timeout: 2000 });
  // Reverts within ~1.5s.
  await expect(btn).not.toHaveAttribute('data-state', /loading|success|error/, { timeout: 2500 });
  await expect(btn).toHaveText(/add to bag/i);
});

test('form submit (sign-in) shows spinner on submit button', async ({ page }) => {
  await page.goto('/auth/sign-in');
  const submitBtn = page.locator('form button[type="submit"]').first();
  await page.locator('input[type="email"]').first().fill('does-not-exist@example.com');
  await page.locator('input[type="password"]').first().fill('wrongpassword');
  // Submit the form. The page will either redirect or re-render; either way the
  // button must enter loading before the next page renders.
  const navPromise = page.waitForLoadState('networkidle');
  await submitBtn.click();
  // Check aria-busy in the brief window before navigation. If navigation already
  // happened, the original button is gone — that is also acceptable.
  const wentBusy = await Promise.race([
    submitBtn.getAttribute('aria-busy').then((v) => v === 'true'),
    page.waitForURL(/.+/, { timeout: 1500 }).then(() => true).catch(() => false),
  ]);
  expect(wentBusy).toBe(true);
  await navPromise;
});
```

- [ ] **Step 2: Run the e2e suite**

Run: `npm run test:e2e -- button-loading`
Expected: all four tests pass. If a test flakes on the success-state timing, widen the timeout once; if it flakes a second time, investigate (do not blindly widen further).

- [ ] **Step 3: Commit**

```powershell
git add tests/e2e/button-loading.spec.ts
git commit -m "test(e2e): cover button loading and navigation feedback"
```

---

## Task 9: Manual verification + final commit

- [ ] **Step 1: Run the dev server and manually exercise the site**

Run: `npm run dev` and walk through:

1. Home → click `Scents` in nav. The link gets a spinner; the next page renders; spinner is gone.
2. Home → click the `qayra.` logo. **No spinner.** Page navigates normally.
3. PDP `/scent/azeziya` → click Add to bag. Button shows spinner → `Added ✓` → reverts. Bag count increments.
4. PDP → click Add to bag while offline (devtools → Network → Offline). Button shows spinner → `Failed` → reverts.
5. `/cart` with an item → click `+`. Button shows spinner; page reloads; new quantity rendered.
6. `/auth/sign-in` → submit with invalid credentials. Submit button shows spinner during POST; page re-renders with error message; spinner gone.
7. System setting "Reduce motion" enabled → repeat step 3. The spinner blinks rather than rotates.

Each item is a checkbox the engineer ticks off as they verify. Stop dev when done.

- [ ] **Step 2: Run the full test suites**

Run:

```powershell
npm run test:unit
```

Expected: all unit tests pass.

Run:

```powershell
npm run test:e2e
```

Expected: all e2e tests pass (existing + the new button-loading suite).

- [ ] **Step 3: Final commit (only if anything was touched during verification)**

If verification surfaced a fix, commit it with a clear message. Otherwise skip.

```powershell
git status
# if clean, no commit needed
```

---

## Self-review notes

- **Spec coverage:** Section 1 scope → Task 5 (`Button.astro`) + Task 6 (logo). Section 2 state machine → Task 3. Section 3 visual/a11y → Tasks 2 and 3. Section 4 file list → Tasks 1–7. Section 5 edge cases → Task 3 (handlers cover them) + Task 8 (e2e exercises a subset). Testing strategy → Tasks 1 (unit), 8 (e2e), 9 (manual).
- **No DOM-environment unit tests** for the state machine itself; the project's vitest is `environment: 'node'` and adding `happy-dom` is out of scope. Coverage of state-machine behavior comes from the Playwright suite, which exercises the real DOM in a real browser.
- **Cart `/api/cart/update`** is preserved verbatim from the current handler. There is a pre-existing inconsistency between the cart e2e test (which waits on `/api/cart/remove`) and the current handler (which posts to `/api/cart/update` with `quantity: 0`); that is outside this plan's scope.
