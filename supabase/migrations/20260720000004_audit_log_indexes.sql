-- Admin audit views are likely to filter by actor or time range, but
-- audit_log only has an index on (target_table, target_id). Add the two
-- access patterns that the admin UI uses.

create index if not exists audit_log_actor_id_idx
  on public.audit_log (actor_id);

create index if not exists audit_log_created_at_idx
  on public.audit_log (created_at desc);
