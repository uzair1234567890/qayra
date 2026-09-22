import { serviceClient } from './supabase/service';

export async function nextOrderCode(): Promise<string> {
  const svc = serviceClient();
  const { data, error } = await svc.rpc('next_order_code');
  if (error || !data) throw new Error(`Failed to get order code: ${error?.message}`);
  return data as string;
}
