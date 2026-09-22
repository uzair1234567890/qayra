import { defineMiddleware } from 'astro:middleware';
import crypto from 'node:crypto';
import { getSession } from './lib/auth/session';
import { requiresAtLeast, type Role } from './lib/auth/roles';

const CART_COOKIE = 'qayra_cart';

const PROTECTED: Array<{ prefix: string; minimum: Role }> = [
  { prefix: '/admin', minimum: 'admin' },
  { prefix: '/ops', minimum: 'operations' },
];

const EXACT_REDIRECTS: Record<string, string> = {
  '/scents': '/products',
  '/admin/scents': '/admin/products',
};

const PREFIX_REDIRECTS: Array<[string, string]> = [
  ['/scent/', '/product/'],
  ['/admin/scents/', '/admin/products/'],
];

function buildRedirect(pathname: string): string | null {
  if (EXACT_REDIRECTS[pathname]) return EXACT_REDIRECTS[pathname];
  for (const [oldPrefix, newPrefix] of PREFIX_REDIRECTS) {
    if (pathname.startsWith(oldPrefix)) {
      return newPrefix + pathname.slice(oldPrefix.length);
    }
  }
  return null;
}

export const onRequest = defineMiddleware(async (ctx, next) => {
  // 301 redirects for renamed paths
  const redirectTo = buildRedirect(ctx.url.pathname);
  if (redirectTo) {
    return new Response(null, {
      status: 301,
      headers: { Location: redirectTo + ctx.url.search },
    });
  }

  // Issue cart token for every request
  if (!ctx.cookies.has(CART_COOKIE)) {
    ctx.cookies.set(CART_COOKIE, crypto.randomUUID(), {
      httpOnly: true,
      sameSite: 'lax',
      secure: import.meta.env.PROD,
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  ctx.locals.cartToken = ctx.cookies.get(CART_COOKIE)!.value;

  // Protected route gate
  const path = ctx.url.pathname;
  const gate = PROTECTED.find((p) => path === p.prefix || path.startsWith(`${p.prefix}/`));
  if (!gate) return next();

  const session = await getSession(ctx.request, ctx.cookies);
  if (!session) {
    const nextUrl = encodeURIComponent(path + ctx.url.search);
    return ctx.redirect(`/auth/sign-in?next=${nextUrl}`, 302);
  }
  if (!requiresAtLeast(session.role, gate.minimum)) {
    return new Response('Forbidden', { status: 403 });
  }

  ctx.locals.session = session;
  return next();
});
