import { createClient } from '@supabase/supabase-js';

export async function setRoleForTest(userId: string, role: string) {
  const admin = createClient(
    process.env.PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  await admin.from('profiles').update({ role }).eq('id', userId);
}
