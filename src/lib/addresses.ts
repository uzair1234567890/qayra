import { z } from 'zod';
import type { AstroCookies } from 'astro';
import { serverClient } from './supabase/server';

export const AddressInput = z.object({
  name: z.string().min(1).max(80),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional().nullable(),
  city: z.string().min(1).max(80),
  state: z.string().min(1).max(80),
  pincode: z.string().regex(/^[0-9]{6}$/),
  phone: z.string().regex(/^[6-9][0-9]{9}$/),
});
export type AddressInputT = z.infer<typeof AddressInput>;

export async function listAddresses(request: Request, cookies: AstroCookies, profileId: string) {
  const supabase = serverClient(request, cookies);
  const { data } = await supabase
    .from('addresses')
    .select('*')
    .eq('profile_id', profileId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function getAddress(
  request: Request,
  cookies: AstroCookies,
  profileId: string,
  id: string,
) {
  const supabase = serverClient(request, cookies);
  const { data } = await supabase
    .from('addresses')
    .select('*')
    .eq('id', id)
    .eq('profile_id', profileId)
    .maybeSingle();
  return data;
}

export async function createAddress(
  request: Request,
  cookies: AstroCookies,
  profileId: string,
  input: AddressInputT,
) {
  const supabase = serverClient(request, cookies);
  const { error } = await supabase
    .from('addresses')
    .insert({ ...input, profile_id: profileId });
  if (error) throw error;
}

export async function updateAddress(
  request: Request,
  cookies: AstroCookies,
  profileId: string,
  id: string,
  input: AddressInputT,
) {
  const supabase = serverClient(request, cookies);
  const { error } = await supabase
    .from('addresses')
    .update(input)
    .eq('id', id)
    .eq('profile_id', profileId);
  if (error) throw error;
}

export async function deleteAddress(
  request: Request,
  cookies: AstroCookies,
  profileId: string,
  id: string,
) {
  const supabase = serverClient(request, cookies);
  const { error } = await supabase
    .from('addresses')
    .delete()
    .eq('id', id)
    .eq('profile_id', profileId);
  if (error) throw error;
}

export async function setDefaultAddress(
  request: Request,
  cookies: AstroCookies,
  profileId: string,
  id: string,
) {
  const supabase = serverClient(request, cookies);
  const { error } = await supabase.rpc('set_default_address', {
    p_profile_id: profileId,
    p_id: id,
  });
  if (error) throw error;
}
