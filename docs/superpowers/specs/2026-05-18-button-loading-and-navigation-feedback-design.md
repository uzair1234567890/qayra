# Button loading & navigation feedback — design

**Date:** 2026-05-18
**Status:** Draft, awaiting review

## Problem

The site renders pages correctly but gives no feedback while a click is in flight. Two symptoms:

1. **Navigation feels unresponsive.** Clicking a link or a button that redirects produces no visible reaction until the next page swaps in. ClientRouter is enabled (`src/layouts/PublicLayout.astro`), so there is a real delay between click and DOM update, with nothing shown during it.
2. **Action buttons (Add to bag, submit review, admin CRUD, auth forms) give inconsistent feedback.** Some have bespoke `textContent = '…✓'` swaps, most have nothing. No standard error state.

## Goal

A single consistent loading pattern: on click, the button's label is replaced by an inline spinner; for actions, the spinner is followed by a brief success or error label (~1.2–1.5s) then a revert to the original; for navigation, the spinner persists until the new page renders. Applied to every button and link-button across the site, except the navbar logo.

## Non-goals

- No changes to API routes or server-side actions.
- No new toast system, no new global error UI.
- No CSS framework changes.
- No design system overhaul beyond the loading state.

## User-facing behavior

- Click a navigation link → label is replaced by a spinner → next page renders → spinner is gone (the element is unmounted with the old DOM).
- Click an action button (e.g. Add to bag) → spinner → success label (`Added ✓`) for 1.2s → original label returns.
- Action fails → spinner → error label (`Failed` or per-button override) for 1.5s → original label returns.
- Submit a form with a `<button type="submit">` → submit button shows spinner until the form's response renders.
- During loading, the button is non-interactive (further clicks ignored) and announces `aria-busy="true"`.

## Scope (which buttons get the treatment)

A button is **opted in** if any of the following holds:

- It is rendered via `src/components/ui/Button.astro` (component opts in by default).
- It carries `data-loading` (raw `<button>` / `<a>` that opt in manually).
- It is a `<button type="submit">` inside a `<form>` (auto-included).

A button is **opted out** if:

- It carries `data-no-loading` (used by the navbar logo).
- It has an external href (different origin), `target="_blank"`, `mailto:`, `tel:`, or `download`.
- It is not a `<button>` / `<a>` (plain divs styled as toggles are not in scope).

`Button.astro` gains one new prop: `excludeLoading?: boolean` for future exemptions.

The navbar links (`Scents`, `Bundles`, `Story`, `Account`, `Bag`) are **not** exempt — they get the spinner on click. Only the `qayra.` logo `<a href="/">` is exempt.

## State machine

```
idle ──click──▶ loading ──┬─▶ success (1.2s) ─▶ idle
                           ├─▶ error   (1.5s) ─▶ idle
                           └─▶ (navigation) ─▶ new page renders
                                                (old node is unmounted by ClientRouter)
```

While in `loading`:

- `data-state="loading"` set on the element.
- `aria-busy="true"`.
- `<button>` → `disabled`. `<a>` → `aria-disabled="true"` + `pointer-events: none` + a capture-phase click handler that `preventDefault`s while loading.
- Inner content is detached (stored on the element, not stringified) and replaced with the spinner template.
- `style.minWidth` / `minHeight` locked to the entry-time `offsetWidth` / `offsetHeight` so the button does not collapse around the spinner.
- The original child nodes are restored on exit; styles and ARIA attrs are removed.

A safety timer reverts navigation/form-submit loading state to `idle` after **8 seconds** if no swap or `pagehide` event has fired. Action buttons have no timer — they spin for as long as the promise takes.

## Trigger types

### 1. Navigation (`<a href>` or `Button.astro` with `href`)

- On click (after exclusion checks): enter `loading`.
- Listen once for Astro's `astro:before-preparation` and `astro:after-swap`. On `astro:after-swap`, the old node is gone — no cleanup needed.
- Also clean up on `pagehide` (covers full reloads and back/forward) and `pageshow` (covers bfcache restore).
- Safety net: 8s timeout to revert if no event fires.

### 2. Form submit (`<button type="submit">` inside a `<form>`)

- Capture-phase `submit` listener on the form. Identifies the submit button (the one that triggered submission, or the form's first `<button type="submit">`).
- Sets the submit button to `loading`. The browser then posts the form; whether the server returns a redirect or re-renders the page, the old DOM is replaced and the state goes away with it.
- Validation errors that re-render the same page → full reload; spinner naturally disappears with the old DOM.

### 3. Action button (`<button>` with a JS handler doing `fetch()`)

- Handler wraps its async work in `withButtonState(btn, asyncFn)`:
  - sets `loading`
  - awaits `asyncFn`
  - on resolve → `success` for 1.2s → `idle`
  - on reject (or thrown error) → `error` for 1.5s → `idle`
- Default success label: `✓`. Default error label: `Failed`. Override via `data-success-label` / `data-error-label` on the button.
- A `withButtonState` default fetch helper treats non-2xx responses as thrown errors so callers do not have to remember to check `response.ok`.
- While `loading`, further clicks are ignored.

## Spinner visual & accessibility

**Spinner.** Inline SVG, 1em × 1em, `currentColor` stroke (works against every existing variant — primary navy-on-cream, secondary champagne, ghost, white-on-navy admin). 270° arc, stroke ~10% of viewBox, rotated by a CSS `@keyframes` animation at 800ms linear infinite.

**Markup during loading:**

```html
<span class="sr-only" data-state-label>Loading</span>
<svg class="qa-spinner" viewBox="0 0 24 24" aria-hidden="true">…</svg>
```

The `sr-only` label updates to `Success` / `Failed` during those terminal states; the SVG itself is `aria-hidden`.

**Reduced motion.** Under `prefers-reduced-motion: reduce`, the spinner does not rotate — three dots blink (`opacity` animation, 1.5s) instead. State machine is identical.

**Where it lives.**

- `src/scripts/button-loading.client.ts` — state machine, SVG template, helpers, listeners.
- `src/styles/button-loading.css` — keyframes, reduced-motion fallback, `[data-state]` styling. Imported from `globals.css`.

## File changes

### New files

- `src/scripts/button-loading.client.ts`
- `src/styles/button-loading.css`

### Edited files (small touches)

- `src/components/ui/Button.astro` — add `excludeLoading?: boolean`; always emit `data-loading` unless excluded.
- `src/styles/globals.css` — `@import './button-loading.css';`.
- `src/layouts/PublicLayout.astro` — import `button-loading.client.ts` once.
- `src/layouts/AdminLayout.astro` — same.
- `src/layouts/AuthLayout.astro` — same.
- `src/layouts/OpsLayout.astro` — same.
- `src/components/layout/SiteHeader.astro` — add `data-no-loading` to the logo `<a href="/">`.

### Refactored handlers (existing bespoke text-swaps → `withButtonState`)

- `src/components/product/StickyBuyBar.astro` — replace `btn.textContent = 'Added ✓'; setTimeout(...)` with `withButtonState(btn, () => fetch('/api/cart/add', …))` and `data-success-label="Added ✓"`.
- `src/components/product/ReviewForm.astro` — inherits the form-submit path automatically; no JS changes, just verify the submit button picks up the spinner.
- `src/components/cart/CartLineItem.astro` — quantity/remove buttons get `data-loading` and their handlers go through `withButtonState`. Exact handler shape to be verified during planning.

### Untouched

All admin / auth / account / checkout pages with raw `<button>` and `<form>`. Once the global script is loaded by their layout, form submits and `data-loading`-tagged buttons just work. Per-page edits only happen if a page does custom fetch without `withButtonState`; those get one-line wrapper edits during planning.

## Edge cases

| Case | Handling |
| --- | --- |
| Multiple clicks while loading | Ignored. `disabled` on `<button>`, capture-phase `preventDefault` on `<a>`. |
| Same-URL navigation | ClientRouter still fires `astro:after-swap`. 8s safety net otherwise. |
| External link / `target="_blank"` / `download` / `mailto:` / `tel:` | Not opted in. No loading state. |
| ClientRouter disabled or `astro:before-preparation` never fires | 8s safety timer reverts. Also `pagehide` cleans up form submits. |
| Browser back/forward | `astro:after-swap` (history) and `pageshow` (bfcache) clean up. |
| Slow API | No cap. Honest latency. |
| API returns non-2xx | Default fetch helper throws → error label runs. |
| Form rejected without redirect (validation error, 422 with same page) | Full reload replaces the DOM. State goes with it. |
| Dynamic content (ClientRouter swaps in new buttons) | Delegated `click` / `submit` listener at `document` level — no rebinding needed. |
| Buttons in React islands | Same delegated handlers work. To verify during implementation that React re-renders do not wipe the spinner wrapper mid-loading. |
| `StickyBuyBar` scroll-hide animation | Independent (`translate-y-full`); no collision. |

## Testing strategy

- **Unit (vitest):** state-machine behavior of `withButtonState` against a fake button (success, throw, non-2xx).
- **Component / DOM:** spinner swap, label restore, `aria-busy` toggling, width lock.
- **E2E (Playwright):** add-to-bag shows spinner → `Added ✓` → revert; review submit shows spinner across redirect; auth sign-in failure case shows spinner during POST and clears on the re-rendered page; navbar logo never spins; reduced-motion media query swaps the visual.

## Open questions

None outstanding at design time. Implementation plan will confirm:

- Exact handler shape in `CartLineItem.astro` (quantity/remove).
- Whether any React island buttons need the wrapper re-anchored after a React re-render.
