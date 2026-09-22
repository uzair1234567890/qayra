import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.PUBLIC_SUPABASE_URL!;
const anonKey = process.env.PUBLIC_SUPABASE_ANON_KEY!;

export const adminClient = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export function anonClient() {
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Per-user client cache. Supabase auth aggressively rate-limits sign-ins;
// reuse a single signed-in client per email across the test run.
const userClients = new Map<string, Promise<SupabaseClient>>();

export function signedInAs(email: string, password: string): Promise<SupabaseClient> {
  const cached = userClients.get(email);
  if (cached) return cached;
  const p = (async () => {
    const c = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await c.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return c;
  })();
  userClients.set(email, p);
  return p;
}
