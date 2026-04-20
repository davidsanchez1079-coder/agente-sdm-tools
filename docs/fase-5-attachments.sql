-- Agente SDM Tools
-- Fase 5: adjuntos del caso + análisis multimodal del agente (v1)
--
-- Este script ASUME que la tabla public.attachments ya existe con el
-- shape original de fase-1 (columnas: id, case_id, file_url, file_type,
-- filename, size_bytes, analyzed_by_ai, user_prompt, created_at) y la
-- lleva al shape v1 mediante ALTER RENAME + ADD COLUMN.
--
-- Objetivo del shape v1:
--   id               uuid pk
--   case_id          uuid fk -> cases(id) on delete cascade
--   storage_path     text (renombrado desde file_url)
--   filename         text
--   kind             text check in ('image','pdf','other') (renombrado desde file_type)
--   mime_type        text (nuevo)
--   size_bytes       bigint
--   analyzed_by_ai   boolean default false (preexistente, aseguramos default)
--   analysis_notes   text (nuevo, para digest futuro de OCR/visión)
--   user_prompt      text (preexistente, se conserva por compatibilidad)
--   created_at       timestamptz default now()
--
-- Correr en Supabase SQL Editor. Idempotente y atómica.

begin;

-- 1) Renombrar file_url -> storage_path (solo si la columna vieja existe).
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'attachments'
      and column_name = 'file_url'
  ) then
    alter table public.attachments
    rename column file_url to storage_path;
  end if;
end $$;

-- 2) Renombrar file_type -> kind (solo si la columna vieja existe).
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'attachments'
      and column_name = 'file_type'
  ) then
    alter table public.attachments
    rename column file_type to kind;
  end if;
end $$;

-- 3) Reemplazar el CHECK asociado al enum. Los valores permitidos
--    siguen siendo los mismos: 'image', 'pdf', 'other'.
alter table public.attachments
drop constraint if exists attachments_file_type_check;

alter table public.attachments
drop constraint if exists attachments_kind_check;

alter table public.attachments
add constraint attachments_kind_check
check (kind in ('image', 'pdf', 'other'));

-- 4) Agregar columnas nuevas.
alter table public.attachments
add column if not exists mime_type text;

alter table public.attachments
add column if not exists analysis_notes text;

-- 5) Asegurar default false en analyzed_by_ai (preexistente).
alter table public.attachments
alter column analyzed_by_ai set default false;

-- 6) RLS en attachments (idempotente). La política hereda ownership
--    vía cases -> folders -> workspaces -> users.
alter table public.attachments enable row level security;

drop policy if exists attachments_owner_or_admin on public.attachments;

create policy attachments_owner_or_admin on public.attachments
for all
using (
  exists (
    select 1
    from public.cases c
    join public.folders f on f.id = c.folder_id
    join public.workspaces w on w.id = f.workspace_id
    join public.users u on u.id = w.user_id
    where c.id = attachments.case_id
      and (u.auth_user_id = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1
    from public.cases c
    join public.folders f on f.id = c.folder_id
    join public.workspaces w on w.id = f.workspace_id
    join public.users u on u.id = w.user_id
    where c.id = attachments.case_id
      and (u.auth_user_id = auth.uid() or public.is_admin())
  )
);

-- 7) Bucket de Supabase Storage. Privado por default.
insert into storage.buckets (id, name, public)
values ('case-attachments', 'case-attachments', false)
on conflict (id) do nothing;

-- 8) Políticas de storage.objects para el bucket.
--    Convención de path: '<case_id>/<attachment_uuid>.<ext>'.
--    El primer segmento del path es el case_id; la política valida
--    que el usuario sea dueño de ese caso.
drop policy if exists "case attachments read" on storage.objects;
drop policy if exists "case attachments insert" on storage.objects;
drop policy if exists "case attachments delete" on storage.objects;

create policy "case attachments read"
on storage.objects for select
using (
  bucket_id = 'case-attachments'
  and exists (
    select 1
    from public.cases c
    join public.folders f on f.id = c.folder_id
    join public.workspaces w on w.id = f.workspace_id
    join public.users u on u.id = w.user_id
    where c.id::text = split_part(name, '/', 1)
      and u.auth_user_id = auth.uid()
  )
);

create policy "case attachments insert"
on storage.objects for insert
with check (
  bucket_id = 'case-attachments'
  and exists (
    select 1
    from public.cases c
    join public.folders f on f.id = c.folder_id
    join public.workspaces w on w.id = f.workspace_id
    join public.users u on u.id = w.user_id
    where c.id::text = split_part(name, '/', 1)
      and u.auth_user_id = auth.uid()
  )
);

create policy "case attachments delete"
on storage.objects for delete
using (
  bucket_id = 'case-attachments'
  and exists (
    select 1
    from public.cases c
    join public.folders f on f.id = c.folder_id
    join public.workspaces w on w.id = f.workspace_id
    join public.users u on u.id = w.user_id
    where c.id::text = split_part(name, '/', 1)
      and u.auth_user_id = auth.uid()
  )
);

commit;
