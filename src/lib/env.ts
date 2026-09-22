import { z } from 'zod';

const envSchema = z.object({
  PUBLIC_SUPABASE_URL: z.string().url(),
  PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  PUBLIC_SITE_URL: z.string().url(),
  RAZORPAY_KEY_ID: z.string().min(1),
  RAZORPAY_KEY_SECRET: z.string().min(1),
  PUBLIC_RAZORPAY_KEY_ID: z.string().min(1),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1),
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

// Runtime singleton — only resolves in Astro/Vite context where import.meta.env is available.
// Tests import parseEnv directly and do not use this singleton.
export const env: Env | null = import.meta.env?.PUBLIC_SUPABASE_URL
  ? parseEnv({
      PUBLIC_SUPABASE_URL: import.meta.env.PUBLIC_SUPABASE_URL,
      PUBLIC_SUPABASE_ANON_KEY: import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
      PUBLIC_SITE_URL: import.meta.env.PUBLIC_SITE_URL,
      RAZORPAY_KEY_ID: import.meta.env.RAZORPAY_KEY_ID,
      RAZORPAY_KEY_SECRET: import.meta.env.RAZORPAY_KEY_SECRET,
      PUBLIC_RAZORPAY_KEY_ID: import.meta.env.PUBLIC_RAZORPAY_KEY_ID,
      RAZORPAY_WEBHOOK_SECRET: import.meta.env.RAZORPAY_WEBHOOK_SECRET,
    })
  : null;
