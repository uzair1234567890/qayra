create table public.contact_messages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  message     text not null,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
alter table public.contact_messages enable row level security;
create policy "contact_messages: anyone inserts" on public.contact_messages for insert with check (true);
create policy "contact_messages: admin reads/updates" on public.contact_messages
  for all using (public.current_role() = 'admin');
