import { createClient } from '@supabase/supabase-js';

const admin = createClient(
  process.env.PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  },
);

export type TestRole = 'customer' | 'operations' | 'admin';

export interface TestUser {
  id: string;
  email: string;
  password: string;
  role: TestRole;
}

export async function makeUser(role: TestRole): Promise<TestUser> {
  const email = `qa-${role}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@qayra.test`;
  const password = 'TestTest12!';
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `QA ${role}` },
  });
  if (error || !created.user) throw error ?? new Error('user creation failed');
  await admin.from('profiles').update({ role }).eq('id', created.user.id);
  return { id: created.user.id, email, password, role };
}

export async function dropUser(id: string): Promise<void> {
  await admin.auth.admin.deleteUser(id);
}
