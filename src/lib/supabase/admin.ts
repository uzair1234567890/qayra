// Server-only: service-role client. Never import from client scripts or client:* islands.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

if (typeof window !== 'undefined') {
  throw new Error('supabaseAdmin must not be used in the browser');
}

const url = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
const key = import.meta.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
if (!url || !key) throw new Error('Missing Supabase admin env vars');

export const supabaseAdmin = createClient<Database>(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
