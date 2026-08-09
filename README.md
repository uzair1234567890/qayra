# Qayra — Luxury Car Fragrance E-Commerce Platform

A custom, full-stack standalone e-commerce web application for **Qayra**, a luxury car perfume brand. Built with Next.js 14+ (App Router), TypeScript, custom Tailwind CSS tokens ("Oud & Ember" design aesthetic), Prisma ORM, Razorpay payment integration, transactional emails, and an integrated Admin Management Portal.

---

## Brand Identity & Aesthetic
Qayra crafts luxury hanging car perfumes infused with Cambodian agarwood, golden amber, and Tuscan leather notes.
- **Design Palette**: Deep Charcoal (`#0A0908`), Warm Amber (`#E69A28`), Gold Accents (`#D4AF37`), and Warm Cream (`#FDFBF7`).
- **Olfactory Philosophy**: 100% fine fragrance oil diffusers with 60-day longevity through natural beechwood cap absorption.

---

## Features

### 1. Public Storefront
- **Homepage**: Hero banner, brand philosophy strip, scent family collection cards, bestsellers grid.
- **Product Listing Page (PLP)**: Live filtering by Scent Family (*Oud & Wood*, *Amber & Spice*, *Leather & Smoke*, *Fresh & Citrus*), price range sorting, search query filtering.
- **Product Detail Page (PDP)**: Interactive 3-tier Scent Architecture Pyramid (Top, Heart, Base notes), 60-day longevity badge, stock availability, care & hanging guide, and related perfumes.
- **Persistent Cart**: Client-side slide-over cart drawer stored in `localStorage` with free express shipping progress bar.
- **Checkout Flow**: Address capture, Razorpay Standard Checkout SDK loader, instant order verification, and fallback test mode simulator.
- **Order Confirmation Page**: Invoice summary, step-by-step fulfillment timeline, and email receipt notice.

### 2. Admin Management Panel (`/admin`)
- **Admin Authentication**: JWT session cookie protection on `/admin/*` routes.
- **Executive Dashboard**: Today's revenue snapshot, order count, active products, and low-stock warning banners.
- **Product CRUD**: Create new fragrances, update stock counts, adjust prices, edit scent notes, and toggle active/featured statuses.
- **Order Management**: Filter customer orders, view line item details, and update fulfillment statuses (`PENDING` &rarr; `PROCESSING` &rarr; `SHIPPED` &rarr; `DELIVERED`).

---

## Tech Stack
- **Frontend**: Next.js 15 App Router, React 18, TypeScript, Tailwind CSS v4, Lucide React, Framer Motion.
- **Backend & Database**: Next.js App Router API Routes, Prisma ORM, SQLite (`dev.db` for instant zero-dependency local dev) / PostgreSQL (production-ready).
- **Authentication**: Custom JWT admin cookies signed with `jose` and `bcryptjs` password hashing.
- **Payments**: Razorpay Node SDK, HMAC-SHA256 signature verification, and automated Webhook event handler (`/api/webhooks/razorpay`).
- **Emails**: Transactional order confirmation emails dispatched via Nodemailer / Resend with fallback dev logging.

---

## Getting Started Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 3. Database Push & Seed
Initialize the SQLite database and populate sample luxury car perfumes & default admin credentials:
```bash
npx prisma db push
npm run seed
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Default Admin Credentials
- **Portal URL**: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)
- **Email**: `admin@qayra.com`
- **Password**: `admin123`

---

## Connecting Your Custom Domain & Cloud Deployment

### 1. Provision a Cloud PostgreSQL Database (Neon / Supabase / Railway)
Serverless platforms (like Vercel) require a cloud database:
1. Create a free PostgreSQL database on **[Neon](https://neon.tech)** or **[Supabase](https://supabase.com)**.
2. In `prisma/schema.prisma`, change `provider = "sqlite"` to `provider = "postgresql"`.
3. Set your production `DATABASE_URL` in `.env` (e.g. `postgresql://user:password@ep-xyz.aws.neon.tech/qayra?sslmode=require`).

### 2. Deploy Application to Vercel
1. Push your repository to GitHub / GitLab.
2. Connect your repo in **[Vercel](https://vercel.com)**.
3. Configure environment variables in Vercel settings:
   - `DATABASE_URL`: Cloud Postgres connection string
   - `NEXT_PUBLIC_APP_URL`: `https://yourdomain.com`
   - `JWT_SECRET`: Random 32+ character string
   - `RAZORPAY_KEY_ID`: Live Razorpay Key ID
   - `RAZORPAY_KEY_SECRET`: Live Razorpay Key Secret
   - `RAZORPAY_WEBHOOK_SECRET`: Razorpay Webhook Secret

### 3. Push Database Schema & Seed Production Data
From your local terminal, run:
```bash
npx prisma db push
npm run seed
```

### 4. Link Custom Domain in Vercel & Registrar DNS
1. In Vercel Project Settings &rarr; **Domains**, enter your domain name (e.g., `qayra.com` and `www.qayra.com`).
2. Update DNS records at your domain registrar (GoDaddy, Namecheap, Cloudflare, Hostinger, etc.):
   - **Apex (`qayra.com`)**: `A` record &rarr; `76.76.21.21`
   - **Subdomain (`www.qayra.com`)**: `CNAME` record &rarr; `cname.vercel-dns.com`

### 5. Update Razorpay Webhook URL
In your Razorpay Dashboard &rarr; Settings &rarr; Webhooks, set the webhook endpoint to:
`https://yourdomain.com/api/webhooks/razorpay` (Events: `payment.captured`, `order.paid`).

```
qayra/
├── app/
│   ├── admin/             # Protected Admin Portal & Product CRUD
│   ├── api/               # API Routes (Auth, Products, Orders, Checkout, Webhooks)
│   ├── checkout/          # Razorpay Checkout Flow
│   ├── orders/[id]/       # Order Confirmation & Receipt Invoice
│   ├── products/          # Product Listing & Detail Pages
│   ├── globals.css        # Custom Oud & Ember design tokens & typography
│   ├── layout.tsx         # Root Layout with Navbar & Cart Drawer
│   └── page.tsx           # Storefront Homepage
├── components/            # Reusable UI Components (Navbar, Footer, CartDrawer, ScentPyramid)
├── lib/                   # Core Database (Prisma), Auth (JWT), and Email helpers
├── prisma/                # Database Schema & Seed script
└── public/images/         # High-definition luxury product photography
```
