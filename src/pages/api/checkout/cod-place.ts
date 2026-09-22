import type { APIRoute } from 'astro';

// COD has been disabled storefront-wide. This endpoint is retained so existing
// order references and any cached frontends fail loudly (410 Gone) instead of
// 404-ing. To re-enable COD, restore the original implementation from git
// history (last present at commit ca223ff) and add the radio back in
// src/pages/checkout/index.astro.
export const POST: APIRoute = async () =>
  new Response(
    JSON.stringify({ error: 'Cash on Delivery is no longer available' }),
    { status: 410, headers: { 'content-type': 'application/json' } },
  );
