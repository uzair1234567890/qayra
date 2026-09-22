import { browserClient } from './supabase/client';

export type OrderEvent = { id: string; code: string; status: string; total: number };

export function subscribeToNewOrders(onChange: (e: OrderEvent, kind: 'insert' | 'update') => void) {
  const supabase = browserClient();
  const channel = supabase
    .channel(`orders-changes-${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => onChange(payload.new as OrderEvent, 'insert'))
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => onChange(payload.new as OrderEvent, 'update'))
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}
