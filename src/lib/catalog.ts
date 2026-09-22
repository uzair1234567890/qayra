import type { AstroCookies } from 'astro';
import { serverClient } from './supabase/server';
import type { Database } from './supabase/types';

export interface Scent {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  top_notes: string | null;
  heart_notes: string | null;
  base_notes: string | null;
  image_urls: string[];
  stock_qty: number;
  active: boolean;
  sort_order: number;
  product_id: string;
  base_price: number; // joined from products
}

type ScentJoinRow = Database['public']['Tables']['scents']['Row'] & {
  products: Pick<Database['public']['Tables']['products']['Row'], 'base_price' | 'status'>;
};

function toScent({ products, ...rest }: ScentJoinRow): Scent {
  return { ...rest, base_price: products.base_price };
}

export async function getActiveScents(
  request: Request,
  cookies: AstroCookies,
): Promise<Scent[]> {
  const supabase = serverClient(request, cookies);
  const { data, error } = await supabase
    .from('scents')
    .select('*, products!inner(base_price, status)')
    .eq('active', true)
    .eq('products.status', 'active')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => toScent(row as unknown as ScentJoinRow));
}

export async function getScentBySlug(
  request: Request,
  cookies: AstroCookies,
  slug: string,
): Promise<Scent | null> {
  const supabase = serverClient(request, cookies);
  const { data, error } = await supabase
    .from('scents')
    .select('*, products!inner(base_price, status)')
    .eq('slug', slug)
    .eq('active', true)
    .eq('products.status', 'active')
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return toScent(data as unknown as ScentJoinRow);
}
