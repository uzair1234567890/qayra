# Week 1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the qayra.in project foundation — Astro scaffold, Tailwind theme, Supabase schema with RLS, auth flows, role-gated middleware — so subsequent weeks can build features on top of a solid base.

**Architecture:** One Astro 4 project. Three route groups (`/`, `/admin/*`, `/ops/*`) gated by middleware reading the user's role from a Supabase JWT claim. Supabase Postgres holds all data with Row-Level Security enforcing role boundaries at the database layer. Auth via email/password + Google OAuth.

**Tech Stack:** Astro 4 · TypeScript 5 · Tailwind CSS 3 · Supabase (Postgres 15 + Auth) · Zod · Vitest · Playwright · Razorpay (KYC paperwork only this week)

**Spec reference:** `docs/superpowers/specs/2026-05-17-qayra-ecommerce-design.md`

**Operating environment:** Windows + PowerShell (primary) + Git Bash available. Commands shown in PowerShell syntax; substitute `npx` is identical on both.

---

## File structure created this week

```
qayra.in/
├── .env.example                                  # documented env vars
├── .nvmrc                                        # Node 20 LTS pin
├── astro.config.mjs                              # Astro config + integrations
├── package.json
├── tailwind.config.cjs                           # Midnight Velvet theme tokens
├── tsconfig.json
├── playwright.config.ts
├── vitest.config.ts
├── eslint.config.js
├── public/
│   └── favicon.svg                               # scent-curl mark
├── src/
│   ├── env.d.ts                                  # Astro types
│   ├── middleware.ts                             # role-gated routes
│   ├── components/
│   │   └── brand/
│   │       ├── ScentCurl.astro                   # the SVG curl, alone
│   │       ├── LogoMark.astro                    # curl only (favicon/social)
│   │       └── Logo.astro                        # curl + wordmark lockup
│   ├── layouts/
│   │   ├── PublicLayout.astro                    # storefront shell
│   │   └── AuthLayout.astro                      # sign-in/up/forgot shell
│   ├── lib/
│   │   ├── env.ts                                # Zod-validated env vars
│   │   ├── supabase/
│   │   │   ├── client.ts                         # browser client (anon key)
│   │   │   ├── server.ts                         # SSR client (cookie-based)
│   │   │   └── types.ts                          # generated DB types (placeholder)
│   │   └── auth/
│   │       ├── roles.ts                          # role types + type guards
│   │       └── session.ts                        # getSession / requireRole
│   ├── pages/
│   │   ├── index.astro                           # placeholder home
│   │   ├── auth/
│   │   │   ├── sign-in.astro
│   │   │   ├── sign-up.astro
│   │   │   ├── forgot-password.astro
│   │   │   ├── reset-password.astro
│   │   │   └── callback.ts                       # OAuth + email-confirm endpoint
│   │   ├── api/auth/
│   │   │   ├── sign-in.ts
│   │   │   ├── sign-up.ts
│   │   │   ├── sign-out.ts
│   │   │   └── forgot-password.ts
│   │   ├── admin/
│   │   │   └── index.astro                       # placeholder, role-gated
│   │   └── ops/
│   │       └── index.astro                       # placeholder, role-gated
│   └── styles/
│       └── globals.css                           # Tailwind base + custom keyframes
├── supabase/
│   ├── config.toml                               # local dev config
│   └── migrations/
│       ├── 20260517000000_initial_schema.sql
│       ├── 20260517000001_profiles_trigger.sql
│       └── 20260517000002_rls_policies.sql
├── tests/
│   ├── unit/
│   │   ├── env.test.ts
│   │   └── roles.test.ts
│   └── e2e/
│       ├── auth.spec.ts
│       └── role-gates.spec.ts
└── docs/
    └── razorpay-kyc-checklist.md                 # paperwork instructions
```

---

## Task 1: Scaffold Astro project

**Files:**

- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `src/env.d.ts`, `src/pages/index.astro`
- The Astro CLI generates these; we customize after.

- [ ] **Step 1: Verify Node 20 LTS is active**

Run: `node --version`
Expected: `v20.x.x` (any minor). If not, install Node 20 LTS first.

- [ ] **Step 2: Initialize Astro project in current directory**

Run:

```powershell
npm create astro@latest -- . --template minimal --typescript strict --no-git --no-install --skip-houston --yes
```

If the prompt warns about non-empty directory (because `.git`, `docs/`, etc. exist), choose **continue/overwrite-allow**. Astro will not delete existing files in `.git` or `docs/`.

- [ ] **Step 3: Pin Node version**

Create `.nvmrc`:

```
20
```

- [ ] **Step 4: Install dependencies**

Run:

```powershell
npm install
```

Expected: completes without errors. `node_modules/` appears.

- [ ] **Step 5: Verify dev server starts**

Run: `npm run dev`
Expected: `astro` starts on `http://localhost:4321`. Open it — see Astro default page.
Stop with Ctrl+C.

- [ ] **Step 6: Commit**

```powershell
git add .
git commit -m "chore: scaffold Astro project with TypeScript

Initialized via npm create astro@latest with --template minimal --typescript strict.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Add Tailwind + design tokens (Midnight Velvet palette)

**Files:**

- Create: `tailwind.config.cjs`, `src/styles/globals.css`
- Modify: `astro.config.mjs`, `src/pages/index.astro`

- [ ] **Step 1: Add Tailwind integration**

Run:

```powershell
npx astro add tailwind --yes
```

This installs `@astrojs/tailwind`, `tailwindcss`, and adds the integration to `astro.config.mjs`. It also creates a default `tailwind.config.mjs`.

- [ ] **Step 2: Replace `tailwind.config.mjs` with the Midnight Velvet config**

Delete `tailwind.config.mjs` if Astro created it. Create `tailwind.config.cjs`:

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}'],
  theme: {
    extend: {
      colors: {
        cream: '#F2EDE4',
        champagne: '#D4B97A',
        aubergine: '#5C3A6E',
        navy: '#231840',
        'near-black': '#0E0820',
      },
      fontFamily: {
        // storefront
        display: ['"Fraunces"', 'ui-serif', 'Georgia', 'serif'],
        sans: ['"Manrope"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        // admin / ops
        ui: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      transitionTimingFunction: {
        'qa-out': 'cubic-bezier(0.16, 1, 0.3, 1)', // ease-out for entrances
        'qa-inout': 'cubic-bezier(0.65, 0, 0.35, 1)', // ease-in-out for transitions
      },
      keyframes: {
        'logo-breathe': {
          '0%, 100%': { opacity: '0.85', transform: 'translateY(0px)' },
          '50%': { opacity: '1', transform: 'translateY(-1px)' },
        },
        'fade-up-soft': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0px)' },
        },
      },
      animation: {
        'logo-breathe': 'logo-breathe 4s ease-in-out infinite',
        'fade-up-soft': 'fade-up-soft 400ms cubic-bezier(0.16, 1, 0.3, 1) both',
      },
    },
  },
  plugins: [],
};
```

Update `astro.config.mjs` to point to `tailwind.config.cjs`:

```js
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [tailwind({ configFile: './tailwind.config.cjs' })],
});
```

- [ ] **Step 3: Create `src/styles/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    font-family: theme('fontFamily.sans');
    background: theme('colors.cream');
    color: theme('colors.navy');
  }
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
}
```

- [ ] **Step 4: Import globals + load Google Fonts in a layout**

Replace `src/pages/index.astro` with:

```astro
---
import '../styles/globals.css';
---

<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>qayra — coming soon</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500&family=Manrope:wght@300;400;500;600&display=swap"
      rel="stylesheet"
    />
  </head>
  <body class="bg-cream flex min-h-screen items-center justify-center">
    <div class="text-center">
      <h1 class="font-display text-navy text-5xl">qayra<span class="text-champagne">.</span></h1>
      <p class="text-navy/60 mt-3 font-sans text-sm tracking-[0.3em] uppercase">in the making</p>
    </div>
  </body>
</html>
```

- [ ] **Step 5: Verify visually**

Run: `npm run dev`
Open `http://localhost:4321`. Expected: cream page, large serif "qayra." with gold dot, small uppercase subtitle. Fonts loaded (not browser default serif).
Stop with Ctrl+C.

- [ ] **Step 6: Commit**

```powershell
git add .
git commit -m "feat(brand): add Tailwind with Midnight Velvet theme tokens

- Custom colors (cream/champagne/aubergine/navy/near-black)
- Font families: Fraunces/Manrope (storefront), Inter/JetBrains Mono (admin/ops)
- Easing tokens (qa-out, qa-inout) and keyframes (logo-breathe, fade-up-soft)
- Globals respect prefers-reduced-motion

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Build the Logo / LogoMark / ScentCurl components

**Files:**

- Create: `src/components/brand/ScentCurl.astro`, `src/components/brand/LogoMark.astro`, `src/components/brand/Logo.astro`, `public/favicon.svg`
- Modify: `src/pages/index.astro` to use `Logo`

- [ ] **Step 1: Create `src/components/brand/ScentCurl.astro`**

```astro
---
interface Props {
  class?: string;
  size?: number;
  stroke?: string;
  animated?: boolean;
}
const { class: className = '', size = 42, stroke = 'currentColor', animated = false } = Astro.props;
---

<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 42 24"
  width={size}
  height={(size * 24) / 42}
  fill="none"
  class:list={[className, animated && 'animate-logo-breathe']}
  aria-hidden="true"
>
  <path
    d="M2 22 C 8 14, 12 10, 16 14 C 20 18, 22 6, 26 8 C 30 10, 34 2, 40 6"
    stroke={stroke}
    stroke-width="1.4"
    stroke-linecap="round"></path>
</svg>
```

- [ ] **Step 2: Create `src/components/brand/LogoMark.astro`** (standalone curl, used as icon/favicon)

```astro
---
import ScentCurl from './ScentCurl.astro';
interface Props {
  class?: string;
  size?: number;
}
const { class: className = '', size = 32 } = Astro.props;
---

<ScentCurl size={size} stroke="currentColor" class={className} animated={true} />
```

- [ ] **Step 3: Create `src/components/brand/Logo.astro`** (curl + wordmark lockup)

```astro
---
import ScentCurl from './ScentCurl.astro';
interface Props {
  class?: string;
  scale?: number;
  href?: string;
}
const { class: className = '', scale = 1, href } = Astro.props;
const curlSize = 42 * scale;
const wordSize = `${4 * scale}rem`;
const content = (
  <span class:list={['inline-flex flex-col items-center gap-2 text-navy', className]}>
    <ScentCurl size={curlSize} stroke="currentColor" class="text-champagne" animated={true} />
    <span
      class="font-display leading-none font-normal tracking-tight"
      style={`font-size:${wordSize};`}
    >
      qayra
    </span>
  </span>
);
---

{
  href ? (
    <a href={href} class="inline-block">
      {content}
    </a>
  ) : (
    content
  )
}
```

- [ ] **Step 4: Create `public/favicon.svg`** (just the curl in champagne)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 42 24">
  <path d="M2 22 C 8 14, 12 10, 16 14 C 20 18, 22 6, 26 8 C 30 10, 34 2, 40 6"
        stroke="#D4B97A" stroke-width="2.5" stroke-linecap="round" fill="none"/>
</svg>
```

- [ ] **Step 5: Update `src/pages/index.astro` to use `<Logo />`**

Replace the inner `<div class="text-center">...</div>` block with:

```astro
<div class="text-center">
  <Logo scale={1.4} />
  <p class="text-navy/60 mt-4 font-sans text-xs tracking-[0.3em] uppercase">in the making</p>
</div>
```

And add `import Logo from '../components/brand/Logo.astro';` to the frontmatter.

Also add to `<head>`:

```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
```

- [ ] **Step 6: Verify visually**

Run: `npm run dev`. Expected: the curl appears above the "qayra" wordmark, in champagne gold; subtle 4-second breathing animation. Favicon shows in the browser tab.

- [ ] **Step 7: Commit**

```powershell
git add .
git commit -m "feat(brand): add Logo, LogoMark, ScentCurl components + favicon

Direction B from design spec — wordmark + scent curl. Curl runs a
4s breathing animation (opacity + 1px drift). LogoMark exports the
curl alone for use as favicon, social avatar, packaging stamp.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Environment variable validation (TDD)

**Files:**

- Create: `src/lib/env.ts`, `tests/unit/env.test.ts`, `vitest.config.ts`, `.env.example`
- Modify: `package.json` (add test scripts)

- [ ] **Step 1: Install Vitest and Zod**

```powershell
npm install -D vitest
npm install zod
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
  },
});
```

- [ ] **Step 3: Add test scripts to `package.json`**

Inside `"scripts"`:

```json
"test:unit": "vitest run",
"test:unit:watch": "vitest"
```

- [ ] **Step 4: Write the failing test** — `tests/unit/env.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { parseEnv } from '../../src/lib/env';

describe('parseEnv', () => {
  it('returns a typed config when all required vars are present', () => {
    const env = parseEnv({
      PUBLIC_SUPABASE_URL: 'https://abc.supabase.co',
      PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'service-key',
      PUBLIC_SITE_URL: 'http://localhost:4321',
    });
    expect(env.PUBLIC_SUPABASE_URL).toBe('https://abc.supabase.co');
    expect(env.PUBLIC_SITE_URL).toBe('http://localhost:4321');
  });

  it('throws if PUBLIC_SUPABASE_URL is missing', () => {
    expect(() =>
      parseEnv({
        PUBLIC_SUPABASE_ANON_KEY: 'anon',
        SUPABASE_SERVICE_ROLE_KEY: 'service',
        PUBLIC_SITE_URL: 'http://localhost:4321',
      } as any),
    ).toThrow(/PUBLIC_SUPABASE_URL/);
  });

  it('throws if PUBLIC_SITE_URL is not a valid URL', () => {
    expect(() =>
      parseEnv({
        PUBLIC_SUPABASE_URL: 'https://abc.supabase.co',
        PUBLIC_SUPABASE_ANON_KEY: 'anon',
        SUPABASE_SERVICE_ROLE_KEY: 'service',
        PUBLIC_SITE_URL: 'not-a-url',
      }),
    ).toThrow();
  });
});
```

- [ ] **Step 5: Run test, verify it fails**

Run: `npm run test:unit`
Expected: FAIL — `Cannot find module '../../src/lib/env'`.

- [ ] **Step 6: Implement `src/lib/env.ts`**

```ts
import { z } from 'zod';

const envSchema = z.object({
  PUBLIC_SUPABASE_URL: z.string().url(),
  PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  PUBLIC_SITE_URL: z.string().url(),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `- ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return result.data;
}

// Runtime singleton — call once at module load
export const env = parseEnv({
  PUBLIC_SUPABASE_URL: import.meta.env.PUBLIC_SUPABASE_URL,
  PUBLIC_SUPABASE_ANON_KEY: import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
  PUBLIC_SITE_URL: import.meta.env.PUBLIC_SITE_URL,
});
```

- [ ] **Step 7: Run test, verify it passes**

Run: `npm run test:unit`
Expected: 3 tests pass.

- [ ] **Step 8: Create `.env.example`**

```
# Supabase — get these from supabase.com/dashboard/project/<your-project>/settings/api
PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Site URL — change to https://qayra.in in production
PUBLIC_SITE_URL=http://localhost:4321
```

- [ ] **Step 9: Commit**

```powershell
git add .
git commit -m "feat(env): Zod-validated environment variables

Throws a clear error at startup if any required env var is missing
or malformed. Tested via Vitest.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Set up Supabase (cloud project + local CLI)

**Files:**

- Create: `supabase/config.toml`, `.env` (local-only, gitignored)
- This task has external (Supabase dashboard) steps — instructions only, no code.

- [ ] **Step 1: Create a Supabase project on the cloud dashboard**

In a browser:

1. Go to https://supabase.com/dashboard
2. Sign up / sign in.
3. Create a new project named `qayra-prod`.
4. Region: closest to India (Mumbai `ap-south-1` if available, else Singapore).
5. Database password: generate a strong one and save it in your password manager.
6. Wait for provisioning (~2 minutes).

- [ ] **Step 2: Copy keys into local `.env`**

In the Supabase dashboard → Settings → API:

- Copy **Project URL** → `PUBLIC_SUPABASE_URL`
- Copy **anon public** key → `PUBLIC_SUPABASE_ANON_KEY`
- Copy **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

Create `.env` (not `.env.example` — this is the real one, gitignored):

```
PUBLIC_SUPABASE_URL=https://<copied>.supabase.co
PUBLIC_SUPABASE_ANON_KEY=<copied anon key>
SUPABASE_SERVICE_ROLE_KEY=<copied service role key>
PUBLIC_SITE_URL=http://localhost:4321
```

- [ ] **Step 3: Install Supabase CLI as a dev dependency**

```powershell
npm install -D supabase
```

Verify: `npx supabase --version` → prints version.

- [ ] **Step 4: Initialize Supabase locally**

```powershell
npx supabase init
```

When prompted whether to generate VS Code settings, choose **no**. This creates `supabase/config.toml` and `supabase/seed.sql`.

- [ ] **Step 5: Link local project to the cloud project**

```powershell
npx supabase link --project-ref <YOUR-PROJECT-REF>
```

Project ref is the subdomain part of your Supabase URL (e.g., if URL is `https://abcdefg.supabase.co`, ref is `abcdefg`). You'll be prompted for the database password from Step 1.

Expected: "Finished supabase link." message.

- [ ] **Step 6: Commit (config only — no secrets)**

```powershell
git add supabase/config.toml supabase/seed.sql .env.example
git commit -m "chore(supabase): initialize Supabase project + CLI link

Local CLI linked to cloud project. .env contains keys (gitignored).
.env.example documents required vars.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Database schema migration

**Files:**

- Create: `supabase/migrations/20260517000000_initial_schema.sql`

- [ ] **Step 1: Create the migration file**

File: `supabase/migrations/20260517000000_initial_schema.sql`

```sql
-- ============================================================================
-- qayra initial schema
-- ============================================================================

-- Enable required extensions
create extension if not exists "pgcrypto";       -- gen_random_uuid

-- ============================================================================
-- Identity & access
-- ============================================================================

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  phone       text,
  role        text not null default 'customer' check (role in ('customer','operations','admin')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index profiles_role_idx on public.profiles (role);

create table public.addresses (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  line1       text not null,
  line2       text,
  city        text not null,
  state       text not null,
  pincode     text not null,
  phone       text not null,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now()
);
create index addresses_profile_idx on public.addresses (profile_id);

-- ============================================================================
-- Catalog
-- ============================================================================

create table public.products (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  name         text not null,
  description  text,
  base_price   integer not null check (base_price >= 0),    -- INR paise
  status       text not null default 'draft' check (status in ('draft','active','archived')),
  created_at   timestamptz not null default now()
);

create table public.scents (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products(id) on delete cascade,
  slug          text unique not null,
  name          text not null,
  tagline       text,
  description   text,
  top_notes     text,
  heart_notes   text,
  base_notes    text,
  image_urls    text[] not null default '{}',
  stock_qty     integer not null default 0 check (stock_qty >= 0),
  active        boolean not null default true,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);
create index scents_product_idx on public.scents (product_id);

create table public.bundles (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  name         text not null,
  description  text,
  price        integer not null check (price >= 0),
  image_url    text,
  status       text not null default 'draft' check (status in ('draft','active','archived')),
  created_at   timestamptz not null default now()
);

create table public.bundle_items (
  bundle_id  uuid not null references public.bundles(id) on delete cascade,
  scent_id   uuid not null references public.scents(id),
  quantity   integer not null default 1 check (quantity > 0),
  primary key (bundle_id, scent_id)
);

-- ============================================================================
-- Cart & orders
-- ============================================================================

create table public.carts (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid references public.profiles(id) on delete cascade,
  anon_token  text unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (profile_id is not null or anon_token is not null)
);
create index carts_profile_idx on public.carts (profile_id);

create table public.cart_items (
  id        uuid primary key default gen_random_uuid(),
  cart_id   uuid not null references public.carts(id) on delete cascade,
  scent_id  uuid references public.scents(id),
  bundle_id uuid references public.bundles(id),
  quantity  integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  check ((scent_id is not null)::int + (bundle_id is not null)::int = 1)
);
create index cart_items_cart_idx on public.cart_items (cart_id);

create table public.orders (
  id                     uuid primary key default gen_random_uuid(),
  code                   text unique not null,                                          -- e.g. Q-2418
  profile_id             uuid not null references public.profiles(id),
  status                 text not null default 'pending' check (status in
                          ('pending','paid','packed','shipped','delivered','cancelled','returned')),
  payment_method         text not null check (payment_method in ('prepaid','cod')),
  payment_status         text not null default 'pending' check (payment_status in
                          ('pending','paid','failed','refunded')),
  subtotal               integer not null check (subtotal >= 0),
  discount_total         integer not null default 0 check (discount_total >= 0),
  shipping_total         integer not null default 0 check (shipping_total >= 0),
  cod_surcharge          integer not null default 0 check (cod_surcharge >= 0),
  total                  integer not null check (total >= 0),
  address_snapshot       jsonb not null,
  razorpay_order_id      text,
  razorpay_payment_id    text,
  created_at             timestamptz not null default now()
);
create index orders_profile_idx on public.orders (profile_id);
create index orders_status_idx  on public.orders (status);

create table public.order_items (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders(id) on delete cascade,
  scent_id        uuid references public.scents(id),
  bundle_id       uuid references public.bundles(id),
  name_snapshot   text not null,
  price_snapshot  integer not null check (price_snapshot >= 0),
  quantity        integer not null check (quantity > 0),
  check ((scent_id is not null)::int + (bundle_id is not null)::int = 1)
);
create index order_items_order_idx on public.order_items (order_id);

create table public.order_status_history (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  status      text not null,
  note        text,
  actor_id    uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);
create index osh_order_idx on public.order_status_history (order_id);

create table public.shipments (
  order_id        uuid primary key references public.orders(id) on delete cascade,
  courier_name    text not null,
  awb_number      text not null,
  dispatched_at   timestamptz,
  delivered_at    timestamptz,
  created_at      timestamptz not null default now()
);

create table public.returns (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders(id) on delete cascade,
  reason          text not null,
  status          text not null default 'requested' check (status in
                    ('requested','approved','rejected','refunded')),
  refund_amount   integer check (refund_amount >= 0),
  processed_at    timestamptz,
  actor_id        uuid references public.profiles(id),
  created_at      timestamptz not null default now()
);
create index returns_order_idx on public.returns (order_id);

-- ============================================================================
-- Marketing
-- ============================================================================

create table public.discounts (
  code           text primary key,
  type           text not null check (type in ('percent','fixed')),
  value          integer not null check (value > 0),
  min_subtotal   integer not null default 0,
  max_uses       integer,
  used_count     integer not null default 0,
  active_from    timestamptz,
  active_until   timestamptz,
  created_at     timestamptz not null default now()
);

create table public.offers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  rule_json   jsonb not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.banners (
  id            uuid primary key default gen_random_uuid(),
  image_url     text,
  headline      text,
  cta_text      text,
  cta_url       text,
  position      text not null check (position in ('hero','announcement')),
  active_from   timestamptz,
  active_until  timestamptz,
  created_at    timestamptz not null default now()
);

create table public.reviews (
  id           uuid primary key default gen_random_uuid(),
  scent_id     uuid not null references public.scents(id) on delete cascade,
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  order_id     uuid not null references public.orders(id),
  rating       integer not null check (rating between 1 and 5),
  title        text,
  body         text,
  photo_urls   text[] not null default '{}',
  status       text not null default 'pending' check (status in ('pending','published','hidden')),
  created_at   timestamptz not null default now()
);
create index reviews_scent_idx on public.reviews (scent_id);
create index reviews_profile_idx on public.reviews (profile_id);

-- ============================================================================
-- Audit
-- ============================================================================

create table public.audit_log (
  id            uuid primary key default gen_random_uuid(),
  actor_id      uuid references public.profiles(id),
  action        text not null,
  target_table  text not null,
  target_id     uuid,
  payload       jsonb,
  created_at    timestamptz not null default now()
);
create index audit_log_target_idx on public.audit_log (target_table, target_id);
```

- [ ] **Step 2: Push the migration to Supabase**

```powershell
npx supabase db push
```

When prompted to confirm, type `y`. Expected: "Finished supabase db push."

- [ ] **Step 3: Verify schema in dashboard**

Open Supabase dashboard → Table Editor. Confirm all tables exist: profiles, addresses, products, scents, bundles, bundle_items, carts, cart_items, orders, order_items, order_status_history, shipments, returns, discounts, offers, banners, reviews, audit_log.

- [ ] **Step 4: Commit**

```powershell
git add supabase/migrations/20260517000000_initial_schema.sql
git commit -m "feat(db): initial schema

18 tables covering identity, catalog (products/scents/bundles), cart,
orders + items + status history + shipments + returns, marketing
(discounts/offers/banners/reviews), audit log. INR amounts stored as
paise integers to avoid floating point. RLS disabled at this stage —
policies come in next migration.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 7: Profile auto-creation trigger

**Files:**

- Create: `supabase/migrations/20260517000001_profiles_trigger.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Automatically create a profiles row when a new auth.users row is inserted.
-- Every new signup gets role='customer' by default. Admin/operations roles
-- are granted manually (Week 6 implements the team-management UI).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    'customer'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

- [ ] **Step 2: Push migration**

```powershell
npx supabase db push
```

- [ ] **Step 3: Manually test the trigger**

In Supabase dashboard → Auth → Users → "Add user". Create a test user (`test@qayra.in`, password `testtest`). Then check Table Editor → `profiles` — a row with this user's id and `role='customer'` should exist.

Delete the test user after verifying.

- [ ] **Step 4: Commit**

```powershell
git add supabase/migrations/20260517000001_profiles_trigger.sql
git commit -m "feat(db): auto-create profile on signup with default customer role

Trigger fires after every insert into auth.users, creating a matching
profiles row. New signups always start as 'customer' — operations and
admin roles are granted manually by an existing admin (UI in Week 6).

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 8: RLS policies migration

**Files:**

- Create: `supabase/migrations/20260517000002_rls_policies.sql`

- [ ] **Step 1: Write the migration**

```sql
-- ============================================================================
-- Enable RLS on every public table
-- ============================================================================

alter table public.profiles            enable row level security;
alter table public.addresses           enable row level security;
alter table public.products            enable row level security;
alter table public.scents              enable row level security;
alter table public.bundles             enable row level security;
alter table public.bundle_items        enable row level security;
alter table public.carts               enable row level security;
alter table public.cart_items          enable row level security;
alter table public.orders              enable row level security;
alter table public.order_items         enable row level security;
alter table public.order_status_history enable row level security;
alter table public.shipments           enable row level security;
alter table public.returns             enable row level security;
alter table public.discounts           enable row level security;
alter table public.offers              enable row level security;
alter table public.banners             enable row level security;
alter table public.reviews             enable row level security;
alter table public.audit_log           enable row level security;

-- ============================================================================
-- Helper: read role from current session
-- ============================================================================

create or replace function public.current_role()
returns text
language sql
stable
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()),
    'anon'
  );
$$;

-- ============================================================================
-- Profiles
-- ============================================================================

create policy "profiles: read own or staff reads all" on public.profiles
  for select using (
    id = auth.uid() or public.current_role() in ('operations','admin')
  );

create policy "profiles: update own" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));
  -- ^ users can update their own profile but not change their role

create policy "profiles: admin updates any" on public.profiles
  for update using (public.current_role() = 'admin');

-- ============================================================================
-- Addresses (customer-private, staff can read for fulfilment)
-- ============================================================================

create policy "addresses: own or staff read" on public.addresses
  for select using (
    profile_id = auth.uid() or public.current_role() in ('operations','admin')
  );

create policy "addresses: own insert/update/delete" on public.addresses
  for all using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- ============================================================================
-- Catalog (public read, admin write)
-- ============================================================================

create policy "products: public read active" on public.products
  for select using (status = 'active' or public.current_role() in ('admin','operations'));

create policy "products: admin writes" on public.products
  for all using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

create policy "scents: public read active" on public.scents
  for select using (active = true or public.current_role() in ('admin','operations'));

create policy "scents: admin writes" on public.scents
  for all using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

create policy "bundles: public read active" on public.bundles
  for select using (status = 'active' or public.current_role() in ('admin','operations'));

create policy "bundles: admin writes" on public.bundles
  for all using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

create policy "bundle_items: read with bundle" on public.bundle_items
  for select using (
    exists (select 1 from public.bundles b
            where b.id = bundle_id
              and (b.status = 'active' or public.current_role() in ('admin','operations')))
  );

create policy "bundle_items: admin writes" on public.bundle_items
  for all using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- ============================================================================
-- Cart (own only; anon via anon_token enforced in app layer)
-- ============================================================================

create policy "carts: own" on public.carts
  for all using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy "cart_items: own via cart" on public.cart_items
  for all using (
    exists (select 1 from public.carts c where c.id = cart_id and c.profile_id = auth.uid())
  )
  with check (
    exists (select 1 from public.carts c where c.id = cart_id and c.profile_id = auth.uid())
  );

-- ============================================================================
-- Orders & related (own for customers; full for staff)
-- ============================================================================

create policy "orders: own or staff" on public.orders
  for select using (
    profile_id = auth.uid() or public.current_role() in ('operations','admin')
  );

create policy "orders: customer creates own" on public.orders
  for insert with check (profile_id = auth.uid());

create policy "orders: staff updates" on public.orders
  for update using (public.current_role() in ('operations','admin'));

create policy "order_items: read with order" on public.order_items
  for select using (
    exists (select 1 from public.orders o
            where o.id = order_id
              and (o.profile_id = auth.uid() or public.current_role() in ('operations','admin')))
  );

create policy "order_items: insert with own order" on public.order_items
  for insert with check (
    exists (select 1 from public.orders o where o.id = order_id and o.profile_id = auth.uid())
  );

create policy "order_status_history: read with order" on public.order_status_history
  for select using (
    exists (select 1 from public.orders o
            where o.id = order_id
              and (o.profile_id = auth.uid() or public.current_role() in ('operations','admin')))
  );

create policy "order_status_history: staff writes" on public.order_status_history
  for insert with check (public.current_role() in ('operations','admin'));

create policy "shipments: read with order" on public.shipments
  for select using (
    exists (select 1 from public.orders o
            where o.id = order_id
              and (o.profile_id = auth.uid() or public.current_role() in ('operations','admin')))
  );

create policy "shipments: staff writes" on public.shipments
  for all using (public.current_role() in ('operations','admin'))
  with check (public.current_role() in ('operations','admin'));

create policy "returns: customer creates own or staff manages" on public.returns
  for select using (
    exists (select 1 from public.orders o
            where o.id = order_id
              and (o.profile_id = auth.uid() or public.current_role() in ('operations','admin')))
  );

create policy "returns: customer requests own" on public.returns
  for insert with check (
    exists (select 1 from public.orders o where o.id = order_id and o.profile_id = auth.uid())
  );

create policy "returns: staff updates" on public.returns
  for update using (public.current_role() in ('operations','admin'));

-- ============================================================================
-- Marketing
-- ============================================================================

create policy "discounts: public read active" on public.discounts
  for select using (
    (active_from is null or active_from <= now())
    and (active_until is null or active_until > now())
    or public.current_role() = 'admin'
  );

create policy "discounts: admin writes" on public.discounts
  for all using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

create policy "offers: public read active" on public.offers
  for select using (active = true or public.current_role() = 'admin');

create policy "offers: admin writes" on public.offers
  for all using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

create policy "banners: public read active" on public.banners
  for select using (
    (active_from is null or active_from <= now())
    and (active_until is null or active_until > now())
    or public.current_role() = 'admin'
  );

create policy "banners: admin writes" on public.banners
  for all using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

create policy "reviews: public read published or admin all" on public.reviews
  for select using (status = 'published' or public.current_role() = 'admin');

create policy "reviews: customer inserts only for own delivered order" on public.reviews
  for insert with check (
    profile_id = auth.uid()
    and exists (
      select 1 from public.orders
      where id = reviews.order_id
        and profile_id = auth.uid()
        and status = 'delivered'
    )
  );

create policy "reviews: admin moderates" on public.reviews
  for update using (public.current_role() = 'admin');

-- ============================================================================
-- Audit log (admin reads, system writes via service_role bypasses RLS)
-- ============================================================================

create policy "audit_log: admin reads" on public.audit_log
  for select using (public.current_role() = 'admin');
```

- [ ] **Step 2: Push migration**

```powershell
npx supabase db push
```

- [ ] **Step 3: Manually verify policies are listed**

In Supabase dashboard → Authentication → Policies. Confirm policies appear for every table. Spot-check `orders` — should show 3 policies (select, insert, update).

- [ ] **Step 4: Commit**

```powershell
git add supabase/migrations/20260517000002_rls_policies.sql
git commit -m "feat(db): row-level security policies for all tables

- profiles/addresses: own + staff read; users can't escalate own role
- catalog (products/scents/bundles): public reads active rows; admin writes
- cart: own only
- orders: own + staff; only staff can update status
- reviews: customer can only review own delivered orders
- marketing CRUD: admin only
- audit_log: admin reads; system inserts use service role

Role pulled via public.current_role() helper that reads profiles.role
for the current auth.uid(). Tests added in Task 13.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 9: Supabase client setup (browser + server)

**Files:**

- Create: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/types.ts`
- Modify: `astro.config.mjs` (add SSR adapter)

- [ ] **Step 1: Install Supabase SDK + SSR adapter**

```powershell
npm install @supabase/supabase-js @supabase/ssr
npm install -D @astrojs/node
```

- [ ] **Step 2: Configure Astro for SSR**

Update `astro.config.mjs`:

```js
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [tailwind({ configFile: './tailwind.config.cjs' })],
});
```

- [ ] **Step 3: Generate placeholder DB types**

Run:

```powershell
npx supabase gen types typescript --linked > src/lib/supabase/types.ts
```

Expected: file contains `export type Database = { ... }` with all 18 tables typed.

- [ ] **Step 4: Create `src/lib/supabase/client.ts`** (browser/anon client)

```ts
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';
import { env } from '../env';

export function browserClient() {
  return createBrowserClient<Database>(env.PUBLIC_SUPABASE_URL, env.PUBLIC_SUPABASE_ANON_KEY);
}
```

- [ ] **Step 5: Create `src/lib/supabase/server.ts`** (SSR client with cookie auth)

```ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { AstroCookies } from 'astro';
import type { Database } from './types';
import { env } from '../env';

export function serverClient(cookies: AstroCookies) {
  return createServerClient<Database>(env.PUBLIC_SUPABASE_URL, env.PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        cookies.set(name, value, options);
      },
      remove(name: string, options: CookieOptions) {
        cookies.delete(name, options);
      },
    },
  });
}
```

- [ ] **Step 6: Smoke-test the SSR client compiles**

Run: `npm run build`
Expected: build succeeds with no errors. Stop with Ctrl+C if it serves anything.

- [ ] **Step 7: Commit**

```powershell
git add .
git commit -m "feat(supabase): browser + SSR clients with cookie-based auth

- @supabase/ssr handles auth cookies for Astro SSR.
- Database types generated from cloud project via supabase gen types.
- @astrojs/node adapter enabled, output set to server.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 10: Role types + type guards (TDD)

**Files:**

- Create: `src/lib/auth/roles.ts`, `tests/unit/roles.test.ts`

- [ ] **Step 1: Write the failing test** — `tests/unit/roles.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { isRole, requiresAtLeast, type Role } from '../../src/lib/auth/roles';

describe('isRole', () => {
  it('accepts customer, operations, admin', () => {
    expect(isRole('customer')).toBe(true);
    expect(isRole('operations')).toBe(true);
    expect(isRole('admin')).toBe(true);
  });
  it('rejects unknown values', () => {
    expect(isRole('superuser')).toBe(false);
    expect(isRole(null)).toBe(false);
    expect(isRole(undefined)).toBe(false);
    expect(isRole('')).toBe(false);
  });
});

describe('requiresAtLeast', () => {
  it('customer satisfies customer', () => {
    expect(requiresAtLeast('customer', 'customer')).toBe(true);
  });
  it('admin satisfies operations', () => {
    expect(requiresAtLeast('admin', 'operations')).toBe(true);
  });
  it('operations does NOT satisfy admin', () => {
    expect(requiresAtLeast('operations', 'admin')).toBe(false);
  });
  it('customer does NOT satisfy operations', () => {
    expect(requiresAtLeast('customer', 'operations')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm run test:unit`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/auth/roles.ts`**

```ts
export const ROLES = ['customer', 'operations', 'admin'] as const;
export type Role = (typeof ROLES)[number];

const RANK: Record<Role, number> = {
  customer: 1,
  operations: 2,
  admin: 3,
};

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

export function requiresAtLeast(have: Role, need: Role): boolean {
  return RANK[have] >= RANK[need];
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npm run test:unit`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```powershell
git add .
git commit -m "feat(auth): role types and rank-based requiresAtLeast guard

3 roles ranked: customer < operations < admin. requiresAtLeast(have, need)
returns true if 'have' rank >= 'need' rank — used by middleware to gate
routes (admin can access /ops routes, ops cannot access /admin).

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 11: Session helpers

**Files:**

- Create: `src/lib/auth/session.ts`

- [ ] **Step 1: Create `src/lib/auth/session.ts`**

```ts
import type { APIContext, AstroCookies } from 'astro';
import { serverClient } from '../supabase/server';
import { isRole, requiresAtLeast, type Role } from './roles';

export interface Session {
  userId: string;
  email: string;
  role: Role;
}

/**
 * Returns the authenticated session for the current request, or null.
 * Reads the role from public.profiles (single round-trip).
 */
export async function getSession(cookies: AstroCookies): Promise<Session | null> {
  const supabase = serverClient(cookies);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = profile?.role;
  if (!isRole(role)) return null;

  return { userId: user.id, email: user.email ?? '', role };
}

/**
 * Like getSession, but redirects to /auth/sign-in if not authenticated,
 * or returns 403 if authenticated but role is too low.
 *
 * Use in Astro pages: `const session = await requireRole(Astro, 'admin');`
 */
export async function requireRole(ctx: APIContext, minimum: Role): Promise<Session | Response> {
  const session = await getSession(ctx.cookies);
  if (!session) {
    const next = encodeURIComponent(ctx.url.pathname + ctx.url.search);
    return ctx.redirect(`/auth/sign-in?next=${next}`, 302);
  }
  if (!requiresAtLeast(session.role, minimum)) {
    return new Response('Forbidden', { status: 403 });
  }
  return session;
}
```

- [ ] **Step 2: Smoke-test types compile**

Run: `npx astro check`
Expected: 0 errors. (Warnings about unused imports in other files are fine.)

- [ ] **Step 3: Commit**

```powershell
git add src/lib/auth/session.ts
git commit -m "feat(auth): getSession and requireRole helpers

- getSession(cookies) returns a typed { userId, email, role } or null.
- requireRole(ctx, minimum) either returns a Session or a redirect/403
  Response. Used by Astro pages and middleware to gate access.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 12: Astro middleware for role-gated routes

**Files:**

- Create: `src/middleware.ts`
- Create placeholder pages: `src/pages/admin/index.astro`, `src/pages/ops/index.astro`

- [ ] **Step 1: Create the middleware**

```ts
// src/middleware.ts
import { defineMiddleware } from 'astro:middleware';
import { getSession } from './lib/auth/session';
import { requiresAtLeast, type Role } from './lib/auth/roles';

const PROTECTED: Array<{ prefix: string; minimum: Role }> = [
  { prefix: '/admin', minimum: 'admin' },
  { prefix: '/ops', minimum: 'operations' },
];

export const onRequest = defineMiddleware(async (ctx, next) => {
  const path = ctx.url.pathname;
  const gate = PROTECTED.find((p) => path === p.prefix || path.startsWith(`${p.prefix}/`));
  if (!gate) return next();

  const session = await getSession(ctx.cookies);
  if (!session) {
    const nextUrl = encodeURIComponent(path + ctx.url.search);
    return ctx.redirect(`/auth/sign-in?next=${nextUrl}`, 302);
  }
  if (!requiresAtLeast(session.role, gate.minimum)) {
    return new Response('Forbidden', { status: 403 });
  }

  // Forward session into Astro locals for downstream pages
  ctx.locals.session = session;
  return next();
});
```

- [ ] **Step 2: Type the locals**

Update `src/env.d.ts`:

```ts
/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    session?: import('./lib/auth/session').Session;
  }
}
```

- [ ] **Step 3: Create placeholder protected pages**

`src/pages/admin/index.astro`:

```astro
---
const { session } = Astro.locals;
---

<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>admin · qayra</title></head>
  <body style="font-family:system-ui;padding:40px;">
    <h1>Admin dashboard (placeholder)</h1>
    <p>
      Logged in as <strong>{session?.email}</strong> with role <strong>{session?.role}</strong>.
    </p>
    <p>Real admin UI ships in Week 5.</p>
  </body>
</html>
```

`src/pages/ops/index.astro`:

```astro
---
const { session } = Astro.locals;
---

<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>ops · qayra</title></head>
  <body style="font-family:system-ui;padding:40px;background:#0F1620;color:#E8ECF0;">
    <h1>Operations dashboard (placeholder)</h1>
    <p>
      Logged in as <strong>{session?.email}</strong> with role <strong>{session?.role}</strong>.
    </p>
    <p>Real ops UI ships in Week 7.</p>
  </body>
</html>
```

- [ ] **Step 4: Smoke-test that types compile**

Run: `npx astro check`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```powershell
git add .
git commit -m "feat(auth): role-gated middleware + placeholder admin/ops pages

Middleware checks every request: paths under /admin require role=admin,
paths under /ops require role>=operations. Unauthorised users redirect
to /auth/sign-in?next=<original>. Authenticated-but-underprivileged
users get a 403. Session forwarded into Astro.locals.

Placeholder admin/ops landing pages display the session for manual
verification — real dashboards ship in Weeks 5 and 7.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 13: Auth API routes

**Files:**

- Create: `src/pages/api/auth/sign-in.ts`, `sign-up.ts`, `sign-out.ts`, `forgot-password.ts`
- Create: `src/pages/auth/callback.ts` (OAuth + email-confirm landing)

- [ ] **Step 1: Create `src/pages/api/auth/sign-up.ts`**

```ts
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { serverClient } from '../../../lib/supabase/server';
import { env } from '../../../lib/env';

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().trim().min(1).max(80).optional(),
  next: z.string().optional(),
});

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const form = await request.formData();
  const parsed = Body.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const msg = encodeURIComponent(parsed.error.issues.map((i) => i.message).join(', '));
    return redirect(`/auth/sign-up?error=${msg}`, 303);
  }

  const supabase = serverClient(cookies);
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.full_name },
      emailRedirectTo: `${env.PUBLIC_SITE_URL}/auth/callback`,
    },
  });
  if (error) {
    return redirect(`/auth/sign-up?error=${encodeURIComponent(error.message)}`, 303);
  }
  // Email confirmation required by default in Supabase Auth
  return redirect(
    `/auth/sign-in?info=${encodeURIComponent('Check your email to confirm your account.')}`,
    303,
  );
};
```

- [ ] **Step 2: Create `src/pages/api/auth/sign-in.ts`**

```ts
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { serverClient } from '../../../lib/supabase/server';

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  next: z.string().optional(),
});

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const form = await request.formData();
  const parsed = Body.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return redirect(`/auth/sign-in?error=${encodeURIComponent('Invalid email or password')}`, 303);
  }
  const supabase = serverClient(cookies);
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    return redirect(`/auth/sign-in?error=${encodeURIComponent(error.message)}`, 303);
  }
  return redirect(parsed.data.next || '/', 303);
};
```

- [ ] **Step 3: Create `src/pages/api/auth/sign-out.ts`**

```ts
import type { APIRoute } from 'astro';
import { serverClient } from '../../../lib/supabase/server';

export const POST: APIRoute = async ({ cookies, redirect }) => {
  const supabase = serverClient(cookies);
  await supabase.auth.signOut();
  return redirect('/', 303);
};
```

- [ ] **Step 4: Create `src/pages/api/auth/forgot-password.ts`**

```ts
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { serverClient } from '../../../lib/supabase/server';
import { env } from '../../../lib/env';

const Body = z.object({ email: z.string().email() });

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const form = await request.formData();
  const parsed = Body.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return redirect('/auth/forgot-password?error=Invalid+email', 303);
  }
  const supabase = serverClient(cookies);
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${env.PUBLIC_SITE_URL}/auth/reset-password`,
  });
  // Always respond success to avoid leaking which emails exist
  return redirect(
    `/auth/forgot-password?info=${encodeURIComponent('If that email exists, a reset link is on the way.')}`,
    303,
  );
};
```

- [ ] **Step 5: Create `src/pages/auth/callback.ts`** (handles OAuth return + email confirm)

```ts
import type { APIRoute } from 'astro';
import { serverClient } from '../../lib/supabase/server';

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const code = url.searchParams.get('code');
  if (!code) return redirect('/auth/sign-in?error=Missing+code', 303);

  const supabase = serverClient(cookies);
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return redirect(`/auth/sign-in?error=${encodeURIComponent(error.message)}`, 303);
  }
  const next = url.searchParams.get('next') || '/';
  return redirect(next, 303);
};
```

- [ ] **Step 6: Smoke-test build**

Run: `npm run build`
Expected: 0 errors. Stop with Ctrl+C.

- [ ] **Step 7: Commit**

```powershell
git add .
git commit -m "feat(auth): API endpoints for sign-up, sign-in, sign-out, forgot-password

- All four POST with form data, validate via Zod, return 303 redirects.
- /auth/callback handles OAuth return and email-confirmation token exchange.
- Forgot-password always returns success message (no enumeration).
- Sign-up requires 8+ char password, sends confirmation email via Supabase.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 14: Auth pages UI (sign-in, sign-up, forgot, reset)

**Files:**

- Create: `src/layouts/AuthLayout.astro`, `src/pages/auth/sign-in.astro`, `sign-up.astro`, `forgot-password.astro`, `reset-password.astro`

- [ ] **Step 1: Create `src/layouts/AuthLayout.astro`**

```astro
---
import '../styles/globals.css';
import Logo from '../components/brand/Logo.astro';
interface Props {
  title: string;
}
const { title } = Astro.props;
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{title} · qayra</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400&family=Manrope:wght@300;400;500;600&display=swap"
      rel="stylesheet"
    />
  </head>
  <body class="bg-cream flex min-h-screen items-center justify-center px-4 py-12">
    <main class="w-full max-w-sm">
      <a href="/" class="mb-8 flex justify-center"><Logo scale={0.8} /></a>
      <h1 class="font-display text-navy mb-2 text-center text-3xl font-normal">{title}</h1>
      <slot />
    </main>
  </body>
</html>
```

- [ ] **Step 2: Create `src/pages/auth/sign-in.astro`**

```astro
---
import AuthLayout from '../../layouts/AuthLayout.astro';
const error = Astro.url.searchParams.get('error');
const info = Astro.url.searchParams.get('info');
const next = Astro.url.searchParams.get('next') || '';
---

<AuthLayout title="Sign in">
  {
    error && (
      <p class="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
    )
  }
  {
    info && (
      <p class="text-navy bg-champagne/20 border-champagne/40 mb-4 rounded border p-3 text-sm">
        {info}
      </p>
    )
  }

  <form action="/api/auth/sign-in" method="post" class="mt-6 space-y-4">
    <input type="hidden" name="next" value={next} />
    <div>
      <label class="text-navy/70 mb-1 block text-xs tracking-widest uppercase" for="email"
        >Email</label
      >
      <input
        id="email"
        name="email"
        type="email"
        required
        autocomplete="email"
        class="border-navy/20 focus:border-navy w-full rounded-sm border bg-white px-3 py-2 focus:outline-none"
      />
    </div>
    <div>
      <label class="text-navy/70 mb-1 block text-xs tracking-widest uppercase" for="password"
        >Password</label
      >
      <input
        id="password"
        name="password"
        type="password"
        required
        autocomplete="current-password"
        minlength="1"
        class="border-navy/20 focus:border-navy w-full rounded-sm border bg-white px-3 py-2 focus:outline-none"
      />
    </div>
    <button
      type="submit"
      class="bg-navy text-cream hover:bg-near-black w-full py-3 text-xs tracking-widest uppercase transition-colors duration-200"
    >
      Sign in
    </button>
  </form>

  <div class="text-navy/40 my-6 text-center text-xs tracking-widest uppercase">or</div>

  <form action="/api/auth/oauth-google" method="post">
    <input type="hidden" name="next" value={next} />
    <button
      type="submit"
      class="border-navy/30 hover:bg-navy/5 w-full border py-3 text-xs tracking-widest uppercase transition-colors duration-200"
    >
      Continue with Google
    </button>
  </form>

  <p class="text-navy/70 mt-8 text-center text-sm">
    New here? <a href="/auth/sign-up" class="text-navy underline">Create an account</a>
  </p>
  <p class="text-navy/70 mt-2 text-center text-sm">
    <a href="/auth/forgot-password" class="underline">Forgot password?</a>
  </p>
</AuthLayout>
```

- [ ] **Step 3: Create `src/pages/auth/sign-up.astro`**

```astro
---
import AuthLayout from '../../layouts/AuthLayout.astro';
const error = Astro.url.searchParams.get('error');
---

<AuthLayout title="Create your account">
  {
    error && (
      <p class="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
    )
  }

  <form action="/api/auth/sign-up" method="post" class="mt-6 space-y-4">
    <div>
      <label class="text-navy/70 mb-1 block text-xs tracking-widest uppercase" for="full_name"
        >Name</label
      >
      <input
        id="full_name"
        name="full_name"
        type="text"
        required
        autocomplete="name"
        maxlength="80"
        class="border-navy/20 focus:border-navy w-full rounded-sm border bg-white px-3 py-2 focus:outline-none"
      />
    </div>
    <div>
      <label class="text-navy/70 mb-1 block text-xs tracking-widest uppercase" for="email"
        >Email</label
      >
      <input
        id="email"
        name="email"
        type="email"
        required
        autocomplete="email"
        class="border-navy/20 focus:border-navy w-full rounded-sm border bg-white px-3 py-2 focus:outline-none"
      />
    </div>
    <div>
      <label class="text-navy/70 mb-1 block text-xs tracking-widest uppercase" for="password"
        >Password</label
      >
      <input
        id="password"
        name="password"
        type="password"
        required
        autocomplete="new-password"
        minlength="8"
        class="border-navy/20 focus:border-navy w-full rounded-sm border bg-white px-3 py-2 focus:outline-none"
      />
      <p class="text-navy/50 mt-1 text-xs">At least 8 characters.</p>
    </div>
    <button
      type="submit"
      class="bg-navy text-cream hover:bg-near-black w-full py-3 text-xs tracking-widest uppercase transition-colors duration-200"
    >
      Create account
    </button>
  </form>

  <p class="text-navy/70 mt-8 text-center text-sm">
    Already have one? <a href="/auth/sign-in" class="text-navy underline">Sign in</a>
  </p>
</AuthLayout>
```

- [ ] **Step 4: Create `src/pages/auth/forgot-password.astro`**

```astro
---
import AuthLayout from '../../layouts/AuthLayout.astro';
const error = Astro.url.searchParams.get('error');
const info = Astro.url.searchParams.get('info');
---

<AuthLayout title="Reset your password">
  {
    error && (
      <p class="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
    )
  }
  {
    info && (
      <p class="text-navy bg-champagne/20 border-champagne/40 mb-4 rounded border p-3 text-sm">
        {info}
      </p>
    )
  }

  <p class="text-navy/70 mt-2 mb-6 text-center text-sm">
    Enter your email and we'll send you a reset link.
  </p>

  <form action="/api/auth/forgot-password" method="post" class="space-y-4">
    <div>
      <label class="text-navy/70 mb-1 block text-xs tracking-widest uppercase" for="email"
        >Email</label
      >
      <input
        id="email"
        name="email"
        type="email"
        required
        autocomplete="email"
        class="border-navy/20 focus:border-navy w-full rounded-sm border bg-white px-3 py-2 focus:outline-none"
      />
    </div>
    <button
      type="submit"
      class="bg-navy text-cream hover:bg-near-black w-full py-3 text-xs tracking-widest uppercase transition-colors duration-200"
    >
      Send reset link
    </button>
  </form>

  <p class="text-navy/70 mt-8 text-center text-sm">
    <a href="/auth/sign-in" class="underline">Back to sign in</a>
  </p>
</AuthLayout>
```

- [ ] **Step 5: Create `src/pages/auth/reset-password.astro`**

```astro
---
import AuthLayout from '../../layouts/AuthLayout.astro';
---

<AuthLayout title="Set a new password">
  <p class="text-navy/70 mt-2 mb-6 text-center text-sm">
    Enter a new password for your qayra account.
  </p>
  <form id="reset-form" class="space-y-4">
    <div>
      <label class="text-navy/70 mb-1 block text-xs tracking-widest uppercase" for="password"
        >New password</label
      >
      <input
        id="password"
        name="password"
        type="password"
        required
        autocomplete="new-password"
        minlength="8"
        class="border-navy/20 focus:border-navy w-full rounded-sm border bg-white px-3 py-2 focus:outline-none"
      />
    </div>
    <button
      type="submit"
      class="bg-navy text-cream hover:bg-near-black w-full py-3 text-xs tracking-widest uppercase transition-colors duration-200"
    >
      Update password
    </button>
  </form>
  <p id="reset-msg" class="mt-4 text-center text-sm"></p>
</AuthLayout>

<script>
  import { browserClient } from '../../lib/supabase/client';
  const supabase = browserClient();
  const form = document.getElementById('reset-form') as HTMLFormElement;
  const msg = document.getElementById('reset-msg')!;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      msg.textContent = error.message;
      msg.className = 'mt-4 text-sm text-center text-red-700';
    } else {
      msg.textContent = 'Password updated. Redirecting…';
      msg.className = 'mt-4 text-sm text-center text-navy';
      setTimeout(() => {
        window.location.href = '/auth/sign-in?info=Password+updated';
      }, 1200);
    }
  });
</script>
```

- [ ] **Step 6: Verify visually**

Run: `npm run dev`. Visit each:

- `http://localhost:4321/auth/sign-in`
- `http://localhost:4321/auth/sign-up`
- `http://localhost:4321/auth/forgot-password`
- `http://localhost:4321/auth/reset-password`

Confirm: cream background, logo at top, form fields styled with navy borders, navy submit buttons. Fonts loaded.

Stop with Ctrl+C.

- [ ] **Step 7: Commit**

```powershell
git add .
git commit -m "feat(auth): sign-in/sign-up/forgot-password/reset-password pages

Uses AuthLayout (cream BG, centered Logo). Form posts to /api/auth/*
endpoints from Task 13. Reset-password is client-side because Supabase
sends the user back with a session already established.

Google OAuth button placeholders — wired up in Task 16 after Google
Cloud OAuth client is created.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 15: Google OAuth setup + wiring

**Files:**

- Create: `src/pages/api/auth/oauth-google.ts`
- External: Google Cloud Console + Supabase dashboard

- [ ] **Step 1: Create Google OAuth Client ID**

In a browser:

1. Go to https://console.cloud.google.com/
2. Create a new project named `qayra-auth` (or use an existing one).
3. Navigate to **APIs & Services → OAuth consent screen** → set up External, fill in app name "qayra", support email, etc.
4. Navigate to **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
5. Application type: **Web application**. Name: `qayra-web`.
6. **Authorized redirect URIs**: add `https://<YOUR-SUPABASE-PROJECT-REF>.supabase.co/auth/v1/callback`
7. Save. Copy **Client ID** and **Client Secret**.

- [ ] **Step 2: Enable Google provider in Supabase**

In Supabase dashboard → Authentication → Providers → Google:

1. Toggle Enable on.
2. Paste Client ID and Client Secret.
3. Save.

- [ ] **Step 3: Create `src/pages/api/auth/oauth-google.ts`**

```ts
import type { APIRoute } from 'astro';
import { serverClient } from '../../../lib/supabase/server';
import { env } from '../../../lib/env';

export const POST: APIRoute = async ({ cookies, redirect, request }) => {
  const form = await request.formData();
  const next = (form.get('next') as string | null) || '/';
  const supabase = serverClient(cookies);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${env.PUBLIC_SITE_URL}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error || !data.url) {
    return redirect(
      `/auth/sign-in?error=${encodeURIComponent(error?.message ?? 'OAuth failed')}`,
      303,
    );
  }
  return redirect(data.url, 303);
};
```

- [ ] **Step 4: Smoke-test OAuth in dev**

Run: `npm run dev`. Visit `/auth/sign-in`. Click "Continue with Google". Expected: redirect to Google → choose account → redirect back to `/` (or wherever next pointed). Check Supabase dashboard → Auth → Users — your Google account should appear.

Verify the matching `profiles` row was auto-created with `role='customer'`.

- [ ] **Step 5: Commit**

```powershell
git add .
git commit -m "feat(auth): Google OAuth sign-in wired end-to-end

POST /api/auth/oauth-google generates the Supabase OAuth URL and
303-redirects the browser. Return path is /auth/callback (Task 13),
which exchanges the code for a session and forwards to `next`.

Google OAuth client must be configured in Google Cloud + Supabase
dashboard — see plan task 15 steps 1-2.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 16: Sign-out button + index page polish

**Files:**

- Modify: `src/pages/index.astro` to show sign-in/sign-out state

- [ ] **Step 1: Update `src/pages/index.astro`**

```astro
---
import '../styles/globals.css';
import Logo from '../components/brand/Logo.astro';
import { getSession } from '../lib/auth/session';

const session = await getSession(Astro.cookies);
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>qayra — coming soon</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500&family=Manrope:wght@300;400;500;600&display=swap"
      rel="stylesheet"
    />
  </head>
  <body class="bg-cream flex min-h-screen flex-col">
    <header class="text-navy/70 flex justify-end px-6 py-4 text-xs tracking-widest uppercase">
      {
        session ? (
          <form action="/api/auth/sign-out" method="post" class="inline">
            <span class="mr-4">{session.email}</span>
            <button type="submit" class="underline">
              Sign out
            </button>
          </form>
        ) : (
          <a href="/auth/sign-in" class="underline">
            Sign in
          </a>
        )
      }
    </header>
    <main class="flex flex-1 flex-col items-center justify-center">
      <Logo scale={1.4} />
      <p class="text-navy/60 mt-4 font-sans text-xs tracking-[0.3em] uppercase">in the making</p>
      {
        session?.role === 'admin' && (
          <a href="/admin" class="text-navy mt-8 text-xs tracking-widest uppercase underline">
            Admin →
          </a>
        )
      }
      {
        session && (session.role === 'admin' || session.role === 'operations') && (
          <a href="/ops" class="text-navy mt-2 text-xs tracking-widest uppercase underline">
            Operations →
          </a>
        )
      }
    </main>
  </body>
</html>
```

- [ ] **Step 2: Verify visually**

Run: `npm run dev`.

- Visit `/` while signed out → header shows "Sign in" link.
- Sign in via Google or create email account → header shows email + "Sign out".
- Click Sign out → returns to anonymous state.

Stop with Ctrl+C.

- [ ] **Step 3: Commit**

```powershell
git add .
git commit -m "feat(home): show session state + sign-out + role-based admin/ops links

Anonymous: 'Sign in' link in header.
Signed in: email + sign-out form (POST).
Admin users: 'Admin →' link to /admin.
Admin/ops users: 'Operations →' link to /ops.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 17: Playwright E2E tests — auth + role gates

**Files:**

- Create: `playwright.config.ts`, `tests/e2e/auth.spec.ts`, `tests/e2e/role-gates.spec.ts`

- [ ] **Step 1: Install Playwright**

```powershell
npm install -D @playwright/test
npx playwright install chromium
```

- [ ] **Step 2: Create `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
```

- [ ] **Step 3: Add test scripts to `package.json`**

```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui"
```

- [ ] **Step 4: Create `tests/e2e/auth.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

const TEST_EMAIL = `e2e+${Date.now()}@qayra.test`;
const TEST_PASSWORD = 'testtest12';

test.describe('auth flows', () => {
  test('sign-up renders form', async ({ page }) => {
    await page.goto('/auth/sign-up');
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible();
    await expect(page.getByLabel(/name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('sign-in renders form', async ({ page }) => {
    await page.goto('/auth/sign-in');
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
  });

  test('forgot-password renders form', async ({ page }) => {
    await page.goto('/auth/forgot-password');
    await expect(page.getByRole('heading', { name: /reset your password/i })).toBeVisible();
  });

  test('sign-in with wrong credentials shows error', async ({ page }) => {
    await page.goto('/auth/sign-in');
    await page.getByLabel(/email/i).fill('nobody@qayra.test');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /^sign in$/i }).click();
    await expect(page).toHaveURL(/auth\/sign-in.*error=/);
  });
});
```

- [ ] **Step 5: Create `tests/e2e/role-gates.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test.describe('role gates', () => {
  test('anonymous user visiting /admin redirects to /auth/sign-in', async ({ page }) => {
    const response = await page.goto('/admin');
    await expect(page).toHaveURL(/auth\/sign-in\?next=/);
    expect(page.url()).toContain('next=%2Fadmin');
  });

  test('anonymous user visiting /ops redirects to /auth/sign-in', async ({ page }) => {
    await page.goto('/ops');
    await expect(page).toHaveURL(/auth\/sign-in\?next=/);
    expect(page.url()).toContain('next=%2Fops');
  });

  test('anonymous user visiting /admin/orders redirects with full next path', async ({ page }) => {
    await page.goto('/admin/orders');
    await expect(page).toHaveURL(/auth\/sign-in\?next=/);
    expect(page.url()).toContain('next=%2Fadmin%2Forders');
  });

  test('home page accessible to anonymous users', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/in the making/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
  });
});
```

- [ ] **Step 6: Run E2E tests**

Run: `npm run test:e2e`
Expected: all tests pass. (The dev server is auto-started by Playwright.)

- [ ] **Step 7: Commit**

```powershell
git add .
git commit -m "test(e2e): Playwright suite for auth + role gates

- auth.spec.ts: renders sign-in/up/forgot, wrong creds show error.
- role-gates.spec.ts: anon visiting /admin or /ops redirects to
  /auth/sign-in with ?next= set correctly; home is anonymous-accessible.

Authenticated-role tests (admin can hit /admin, customer can't, etc.)
deferred to Week 2 once we have a test-user seed strategy.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 18: ESLint + Prettier setup

**Files:**

- Create: `eslint.config.js`, `.prettierrc.json`, `.prettierignore`
- Modify: `package.json` (lint/format scripts)

- [ ] **Step 1: Install dev dependencies**

```powershell
npm install -D eslint @eslint/js @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-astro prettier prettier-plugin-astro prettier-plugin-tailwindcss
```

- [ ] **Step 2: Create `eslint.config.js`**

```js
import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import astroPlugin from 'eslint-plugin-astro';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
    },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  ...astroPlugin.configs.recommended,
  {
    ignores: ['dist/', '.astro/', 'node_modules/', 'supabase/', 'src/lib/supabase/types.ts'],
  },
];
```

- [ ] **Step 3: Create `.prettierrc.json`**

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "plugins": ["prettier-plugin-astro", "prettier-plugin-tailwindcss"],
  "overrides": [{ "files": "*.astro", "options": { "parser": "astro" } }]
}
```

- [ ] **Step 4: Create `.prettierignore`**

```
dist/
.astro/
node_modules/
supabase/migrations/
src/lib/supabase/types.ts
package-lock.json
```

- [ ] **Step 5: Add scripts to `package.json`**

```json
"lint": "eslint .",
"format": "prettier --write ."
```

- [ ] **Step 6: Run format + lint and fix issues**

```powershell
npm run format
npm run lint
```

Fix any lint errors that appear (most should be auto-fixed by Prettier).

- [ ] **Step 7: Commit**

```powershell
git add .
git commit -m "chore: ESLint + Prettier config

ESLint flat config (eslint.config.js) for TS + Astro. Prettier with
Astro and Tailwind plugins. Migrations and generated DB types excluded.

Scripts: npm run lint, npm run format.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 19: GitHub Actions CI

**Files:**

- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    env:
      PUBLIC_SUPABASE_URL: https://example.supabase.co
      PUBLIC_SUPABASE_ANON_KEY: dummy
      SUPABASE_SERVICE_ROLE_KEY: dummy
      PUBLIC_SITE_URL: http://localhost:4321
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npx astro check
      - run: npm run test:unit
      - run: npm run build
```

- [ ] **Step 2: Verify the workflow locally compiles**

There's no offline way to run a GitHub Actions workflow; we trust the YAML. The next push will validate it. Manually re-read for syntax errors.

- [ ] **Step 3: Commit**

```powershell
git add .github/workflows/ci.yml
git commit -m "ci: GitHub Actions — lint, type-check, unit tests, build

Uses Node 20, dummy env vars (real ones aren't needed for build/type
checks since Zod validates at runtime, not build). E2E tests skipped
in CI for now — added in Week 11 with a Supabase preview-database
strategy.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 20: README + Razorpay KYC paperwork checklist

**Files:**

- Create / overwrite: `README.md`
- Create: `docs/razorpay-kyc-checklist.md`

- [ ] **Step 1: Create `README.md`**

````markdown
# qayra.in

D2C car air freshener brand. Single Astro project with three role-gated
route groups (customer storefront, admin, ops). Powered by Supabase.

## Quick start

```powershell
# 1. Install Node 20 LTS (use the .nvmrc if you have nvm)
node --version   # should be v20.x

# 2. Install dependencies
npm install

# 3. Copy env file and fill in Supabase keys
copy .env.example .env
# edit .env with your project's keys

# 4. Run the dev server
npm run dev
```
````

Open http://localhost:4321.

## Scripts

| Command             | Purpose                                       |
| ------------------- | --------------------------------------------- |
| `npm run dev`       | Astro dev server with HMR                     |
| `npm run build`     | Production build                              |
| `npm run preview`   | Serve the production build locally            |
| `npm run test:unit` | Vitest unit tests                             |
| `npm run test:e2e`  | Playwright E2E tests (auto-starts dev server) |
| `npm run lint`      | ESLint                                        |
| `npm run format`    | Prettier write                                |
| `npx astro check`   | Type-check Astro files                        |

## Project layout

See `docs/superpowers/specs/2026-05-17-qayra-ecommerce-design.md`.

## Supabase

Local CLI linked to the cloud project. To apply migrations:

```powershell
npx supabase db push
```

To regenerate DB types after a schema change:

```powershell
npx supabase gen types typescript --linked > src/lib/supabase/types.ts
```

````

- [ ] **Step 2: Create `docs/razorpay-kyc-checklist.md`**

```markdown
# Razorpay KYC checklist (Week 1)

Razorpay activation requires KYC and takes 3–7 business days even when
everything is in order. **Start this in Week 1 of the build, not Week 11.**

## Documents to gather

- [ ] PAN card (business or proprietor)
- [ ] Bank account details (account no., IFSC, cancelled cheque or bank statement)
- [ ] Address proof for business (utility bill, rent agreement, or GST cert)
- [ ] GSTIN (optional but speeds activation — register at gst.gov.in if not already)
- [ ] Business / brand registration (sole proprietorship, partnership, LLP, or Pvt Ltd certificate)
- [ ] Website URL: https://qayra.in must be live with:
  - [ ] Privacy policy
  - [ ] Terms of service
  - [ ] Shipping & returns policy
  - [ ] Working contact page with phone/email

## Steps

1. Sign up at https://dashboard.razorpay.com
2. Choose "Standard Plan" (no setup fee, 2% + GST per txn)
3. Upload documents above in the Account Activation flow
4. Submit; check email for follow-ups

## Once approved

- Copy `Key Id` and `Key Secret` from Razorpay dashboard → Settings → API Keys
- Store as env vars (Week 3 wires these into checkout):
  - `RAZORPAY_KEY_ID`
  - `RAZORPAY_KEY_SECRET`

## Until approved

You can do all Week 3 checkout work in **Test Mode** using the test
API keys (visible in dashboard before KYC completes). Live mode just
requires swapping the keys.
````

- [ ] **Step 3: Commit**

```powershell
git add README.md docs/razorpay-kyc-checklist.md
git commit -m "docs: README + Razorpay KYC checklist for Week 1

README covers setup, scripts, project layout pointer, and Supabase
migration/types regeneration commands.

KYC checklist documents the paperwork the founder must start in Week 1
so Razorpay activation isn't blocking the Week 12 launch.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Acceptance criteria — end of Week 1

Before declaring Week 1 done, verify ALL of the following:

- [ ] `npm install` runs clean.
- [ ] `npm run dev` starts a server at http://localhost:4321; home page shows the breathing scent-curl logo and "in the making".
- [ ] `npm run build` succeeds with 0 errors.
- [ ] `npx astro check` reports 0 errors.
- [ ] `npm run test:unit` passes (env + roles tests).
- [ ] `npm run test:e2e` passes (auth + role-gates tests).
- [ ] `npm run lint` passes (warnings okay, errors not).
- [ ] Supabase dashboard → Table Editor shows all 18 tables.
- [ ] Supabase dashboard → Authentication → Policies shows policies on every table.
- [ ] Manually create a Supabase Auth user → matching `profiles` row exists with `role='customer'`.
- [ ] Email signup works end-to-end (confirm via Supabase magic link, then sign in).
- [ ] Google OAuth signup works end-to-end (button → Google → /auth/callback → `/`).
- [ ] Visiting `/admin` while signed out → redirects to `/auth/sign-in?next=%2Fadmin`.
- [ ] Visiting `/admin` as a `customer`-role user → 403 Forbidden.
- [ ] Visiting `/admin` as an `admin`-role user (manually upgrade the row in `profiles`) → placeholder admin page renders.
- [ ] Visiting `/ops` as `operations` or `admin` → placeholder ops page renders.
- [ ] Razorpay KYC paperwork checklist filled in / documents being gathered.
- [ ] CI workflow runs on push to main (check Actions tab).

## What we explicitly did NOT do in Week 1

- No storefront pages (home, scents, PDP, story, contact) — Week 2
- No cart, no checkout, no Razorpay integration — Week 3
- No account dashboard / orders list — Week 4
- No admin or ops UI beyond placeholder landing pages — Weeks 5–7
- No animations beyond the logo curl breathe — wired in Week 10
- No accessibility audit pass — Week 10
- No Lighthouse run — Week 11

Each is a separate weekly plan, written after Week 1 acceptance is met.
