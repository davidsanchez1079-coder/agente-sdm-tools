-- Agente SDM Tools
-- Fase 6: vincular adjuntos al mensaje del turno donde se enviaron
--
-- Hoy attachments cuelga del caso. Queremos que en el historial cada
-- mensaje del usuario muestre los adjuntos que se mandaron con ese
-- turno. Un mismo attachment puede usarse en varios turnos, así que
-- usamos una tabla join.
--
--   message_attachments
--     message_id    uuid fk -> messages(id) on delete cascade
--     attachment_id uuid fk -> attachments(id) on delete cascade
--     created_at    timestamptz default now()
--     primary key (message_id, attachment_id)
--
-- RLS: un usuario ve/edita un link si es dueño del caso al que
-- pertenece el mensaje (hereda ownership via messages -> cases ->
-- folders -> workspaces -> users).
--
-- Correr en Supabase SQL Editor. Idempotente y atómica.

begin;

create table if not exists public.message_attachments (
  message_id uuid not null references public.messages(id) on delete cascade,
  attachment_id uuid not null references public.attachments(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (message_id, attachment_id)
);

create index if not exists message_attachments_message_idx
  on public.message_attachments(message_id);
create index if not exists message_attachments_attachment_idx
  on public.message_attachments(attachment_id);

alter table public.message_attachments enable row level security;

drop policy if exists message_attachments_owner_or_admin
  on public.message_attachments;

create policy message_attachments_owner_or_admin
  on public.message_attachments
  for all
  using (
    exists (
      select 1
      from public.messages m
      join public.cases c on c.id = m.case_id
      join public.folders f on f.id = c.folder_id
      join public.workspaces w on w.id = f.workspace_id
      join public.users u on u.id = w.user_id
      where m.id = message_attachments.message_id
        and (u.auth_user_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1
      from public.messages m
      join public.cases c on c.id = m.case_id
      join public.folders f on f.id = c.folder_id
      join public.workspaces w on w.id = f.workspace_id
      join public.users u on u.id = w.user_id
      where m.id = message_attachments.message_id
        and (u.auth_user_id = auth.uid() or public.is_admin())
    )
  );

commit;
