# Codebase Review — Design

- **Date:** 2026-05-18
- **Scope:** Full qayra.in codebase (Astro 6 + React 19 + Supabase + Razorpay)
- **Goal:** Pre-launch readiness, code quality, security/compliance, and prioritized backlog — all four, in one pass.
- **Deliverable:** A findings report committed to git, followed by category PRs that apply only conservative, obvious-win fixes. Subjective items stay in the report as backlog.

## 1. Approach

Five parallel specialist subagents each review a slice of the codebase and return a structured findings report. The orchestrator (this session) verifies every P0/P1 claim against the actual code, synthesizes the verified findings into one master review doc, then executes fixes branch-by-branch in per-category PRs.

Subagents are read-only. They flag, they do not fix. Fixes happen only after the master report is written, committed, and acknowledged by the user.

## 2. Specialist agents and scope

| # | Agent | Scope |
|---|---|---|
| 1 | `security-auditor` | `src/lib/auth/*`, `src/middleware.ts`, RLS in `supabase/migrations/*`, Razorpay webhook signature verification (`src/lib/razorpay.ts` + payment-related pages/API routes), secret handling and client selection across `src/lib/supabase/{client,server,service,admin}.ts`, PII exposure in logs/error pages |
| 2 | `postgres-pro` | All 16 `supabase/migrations/*` — schema design, indexes, constraints, RLS policy correctness and performance. Also N+1 risks and unindexed lookups in `src/lib/admin/*` and `src/lib/ops/*` |
| 3 | `code-reviewer` | `src/lib/*` business logic — pricing, bundles, checkout, orders, cart, returns, queue, offers. Type safety, missing `await`s, error handling, dead code, duplication, zod usage at trust boundaries |
| 4 | `react-specialist` | `src/components/*` and `src/pages/*` — Astro island boundaries, React 19 patterns, hydration choices, accessibility (since `tests/e2e/a11y.spec.ts` exists), SEO/JSON-LD (`src/lib/seo/*`) |
| 5 | `qa-expert` | `tests/e2e/*` + vitest unit tests — coverage gaps on critical flows (checkout, Razorpay webhook, role-gating across customer/admin/ops, RLS bypass scenarios), test reliability signals |

Each agent excludes `node_modules/`, `dist/`, `.vercel/`, `.astro/`, `test-results/`.

## 3. Output contract for every agent

Every finding must match this shape:

```
- severity: P0 | P1 | P2 | P3
- category: <agent's category>
- location: <file:line>  (must reference a real file and line)
- problem: 1-2 sentence description
- impact: what breaks or is at risk
- fix: concrete, conservative recommendation
- confidence: high | medium | low
```

### Severity rubric

- **P0** — exploitable security hole, data loss/corruption risk, payment integrity, production crash. Fix before launch.
- **P1** — broken-but-survivable: auth edge case, missing validation at a trust boundary, broken flow under specific conditions, type holes that mask real bugs.
- **P2** — quality: dead code, duplication, weak typing without an active bug, missing error handling that has not bitten yet.
- **P3** — nits, style, minor suggestions.

### Posture instructions every agent receives

- Read-only. Do not write, edit, or run mutating commands.
- Conservative: flag, do not fix. Do not propose architectural rewrites.
- Every finding must cite `file:line` against a real reference.
- Cap the report at roughly 800 words. Prioritize signal over breadth.
- Skip `node_modules/`, `dist/`, `.vercel/`, `.astro/`, `test-results/`.

## 4. Verification (mine, before writing report)

For every P0 and P1 finding returned by an agent:

1. Open the cited `file:line` directly.
2. Confirm the problem actually exists as described.
3. If it does not verify → drop the finding or downgrade severity, and note why.

Findings that survive verification are promoted into the master report. P2/P3 findings get a spot-check sample but are accepted in bulk.

## 5. Master review doc

Path: `docs/superpowers/reviews/2026-05-18-codebase-review.md`

Structure:

```
# Codebase Review — 2026-05-18

## Executive summary
- Counts: P0=x, P1=y, P2=z, P3=w
- Top 3-5 themes
- Launch-blocker list (P0s only)

## P0 — fix before launch
<findings, grouped by category>

## P1 — fix soon
<findings, grouped by category>

## P2 — quality backlog
<findings, grouped by category>

## P3 — nits
<one-line each>

## Out of scope / deferred
<anything explicitly chosen not to act on, with reason>
```

Each finding renders as:

```
### <short title>
- Severity: P1
- Location: src/lib/checkout.ts:142
- Problem: ...
- Impact: ...
- Fix: ...
- PR: security-fixes  (or "backlog")
```

The doc is committed to the branch before any code fixes begin and becomes the source of truth that fix PRs reference.

## 6. PR strategy and execution rules

One branch + PR per category, opened in this order:

| # | Branch | Includes |
|---|---|---|
| 1 | `review/security-fixes` | RLS gaps, auth/session bugs, Razorpay webhook integrity, secret misuse, service-role leaks, missing input validation at boundaries |
| 2 | `review/database-fixes` | Migration corrections, missing indexes, broken constraints, RLS policy fixes (logic only — schema-changing migrations are proposed in the PR body for sign-off, not auto-applied) |
| 3 | `review/code-quality` | Type-safety holes, missing awaits, dead code removal, error-handling gaps, obvious bugs in `src/lib/*` |
| 4 | `review/frontend-fixes` | SSR/client boundary issues, a11y, broken JSON-LD, React 19 misuse |
| 5 | `review/test-additions` | Coverage adds for critical flows surfaced by the review, only where the gap is clear and the test is mechanical |

Rules applied to every PR:

- Conservative fixes only. Anything subjective stays in the report as backlog.
- `npm run lint`, `npx astro check`, and `npm run test:unit` must pass before commit.
- Playwright runs only on PRs touching flows it covers.
- Each commit message references the finding ID from the master review doc.
- Schema-changing migrations are proposed in the PR body, not auto-applied — user signs off before `npx supabase db push`.
- PRs target `main`. The user merges; the orchestrator does not.
- If a finding turns out to be wrong while fixing, update the master doc and skip.

### Stop conditions (pause and ask)

- A "conservative fix" turns out to require a behavior change.
- A finding contradicts an existing pattern used elsewhere (pattern may be intentional).
- A fix's blast radius is larger than expected (more than ~10 files touched).

## 7. Out of scope

- Architectural rewrites or pattern overhauls.
- Stylistic refactors not driven by a specific finding.
- Performance tuning beyond obvious wins surfaced by the agents.
- Dependency upgrades unless tied to a P0/P1 security finding.
- Anything in `node_modules/`, build output, or generated files.

## 8. Done definition

- Master review doc exists at `docs/superpowers/reviews/2026-05-18-codebase-review.md` and is committed.
- All P0/P1 findings either fixed in a category PR or explicitly deferred in the report with reason.
- P2/P3 findings live in the report as backlog.
- Each category PR is opened against `main` with: linked findings, clean lint/check/unit-test runs, and (if applicable) a proposed-migration block in the PR body.
