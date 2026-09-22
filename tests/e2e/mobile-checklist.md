# Mobile Hand-Test Checklist

The Playwright emulation in `mobile.spec.ts` catches viewport-class bugs. This
checklist is for things only a real device exposes: keyboards, gestures, dark
mode, network conditions, system browsers.

**Devices to use (pick at least 2):**

- iPhone (any model from iPhone 12 or newer) — Safari
- Android phone (any 2022+ device) — Chrome
- iPad (any model) — Safari
- Budget Android (optional but recommended) — Chrome

For each device, walk through every check below. Mark pass, fail (file
issue + commit fix). Date and device model in the result row.

---

## Checks

| # | Check | iPhone Safari | Android Chrome | iPad Safari |
|---|-------|---------------|----------------|-------------|
| 1 | Home hero renders inside 3s on cellular | | | |
| 2 | Scent listing grid: 1 col on phone, 2 col on tablet | | | |
| 3 | PDP image scrolls without horizontal overflow | | | |
| 4 | Sticky buy bar appears at correct scroll position, hides on scroll-up | | | |
| 5 | Add to cart -> cart drawer/page slides in without jank | | | |
| 6 | Cart line item quantity stepper works (tap +/-) | | | |
| 7 | Checkout pincode input shows numeric keypad | | | |
| 8 | Checkout phone input shows tel keypad | | | |
| 9 | All form CTAs reach with thumb (44px+ tap targets) | | | |
| 10 | COD: place order -> success page -> order code visible | | | |
| 11 | Razorpay modal opens, card form usable, no horizontal scroll | | | |
| 12 | View transitions: no white flash between pages | | | |
| 13 | Account orders page reads cleanly | | | |
| 14 | Account order detail shows AWB + timeline | | | |
| 15 | Reviews form appears on PDP for delivered orders | | | |
| 16 | 404 page displays correctly | | | |
| 17 | Site footer reachable, links work | | | |
| 18 | Announcement bar dismissable (if dismissable) | | | |

---

## Run log

| Date | Tester | Device | Pass / Fail | Notes |
|------|--------|--------|-------------|-------|
| | | | | |
