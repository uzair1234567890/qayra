-- I1: Add DB-level constraints to contact_messages so the Zod validation
-- cannot be bypassed by direct PostgREST calls with the anon key.
-- Also adds indexes for the admin inbox view (Week 6).

alter table public.contact_messages
  add constraint contact_messages_name_len
    check (char_length(trim(name)) between 1 and 80),
  add constraint contact_messages_email_fmt
    check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  add constraint contact_messages_msg_len
    check (char_length(trim(message)) between 1 and 2000);

create index contact_messages_created_at_idx on public.contact_messages (created_at desc);
create index contact_messages_unread_idx     on public.contact_messages (created_at desc) where read_at is null;
