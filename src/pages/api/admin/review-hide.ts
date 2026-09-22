import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireRole } from '../../../lib/auth/session';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import { audit } from '../../../lib/admin/audit';

const Body = z.object({ review_id: z.string().uuid() });

export const POST: APIRoute = async (ctx) => {
  const result = await requireRole(ctx as any, 'admin');
  if (result instanceof Response) return result;

  const form = await ctx.request.formData();
  const parsed = Body.safeParse(Object.fromEntries(form));
  if (!parsed.success) return ctx.redirect('/admin/reviews?error=Invalid+input', 303);

  const { error } = await supabaseAdmin
    .from('reviews')
    .update({ status: 'hidden' })
    .eq('id', parsed.data.review_id);
  if (error) return ctx.redirect('/admin/reviews?error=Hide+failed', 303);

  await audit(result.userId, 'review.hide', { table: 'reviews', id: parsed.data.review_id });
  return ctx.redirect('/admin/reviews?tab=published&info=Review+hidden', 303);
};
