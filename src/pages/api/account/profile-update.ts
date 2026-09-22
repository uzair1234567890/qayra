import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireRole } from '../../../lib/auth/session';
import { serverClient } from '../../../lib/supabase/server';

const Body = z.object({
  full_name: z.string().min(1).max(80),
  phone: z
    .string()
    .regex(/^[6-9][0-9]{9}$/)
    .optional()
    .or(z.literal('')),
});

export const POST: APIRoute = async (ctx) => {
  const result = await requireRole(ctx as any, 'customer');
  if (result instanceof Response) return result;
  const form = await ctx.request.formData();
  const parsed = Body.safeParse(Object.fromEntries(form));
  if (!parsed.success) return ctx.redirect('/account/profile?error=Invalid+input', 303);
  const supabase = serverClient(ctx.request, ctx.cookies);
  await supabase
    .from('profiles')
    .update({
      full_name: parsed.data.full_name,
      phone: parsed.data.phone || null,
    })
    .eq('id', result.userId);
  return ctx.redirect('/account/profile?info=Saved', 303);
};
