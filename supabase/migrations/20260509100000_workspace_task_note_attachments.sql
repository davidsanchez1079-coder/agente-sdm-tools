-- Adjuntos en notas de tareas.
-- Guarda el archivo en Storage y registra metadatos opcionales en workspace_task_notes.

insert into storage.buckets (id, name, public, file_size_limit)
values ('workspace-task-attachments', 'workspace-task-attachments', false, 20971520)
on conflict (id) do update
set public = false,
    file_size_limit = 20971520;

alter table public.workspace_task_notes
  add column if not exists attachment_storage_path text,
  add column if not exists attachment_filename text,
  add column if not exists attachment_mime_type text,
  add column if not exists attachment_size_bytes integer;

create index if not exists workspace_task_notes_attachment_path_idx
  on public.workspace_task_notes (attachment_storage_path)
  where attachment_storage_path is not null;

drop policy if exists "workspace task attachments insert" on storage.objects;
create policy "workspace task attachments insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'workspace-task-attachments'
    and exists (
      select 1
      from public.workspace_tasks t
      where t.workspace_id::text = split_part(objects.name, '/'::text, 1)
        and t.id::text = split_part(objects.name, '/'::text, 2)
        and public.user_has_workspace_role(
          t.workspace_id,
          array['gerente', 'interno']
        )
    )
  );

drop policy if exists "workspace task attachments read" on storage.objects;
create policy "workspace task attachments read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'workspace-task-attachments'
    and exists (
      select 1
      from public.workspace_tasks t
      where t.workspace_id::text = split_part(objects.name, '/'::text, 1)
        and t.id::text = split_part(objects.name, '/'::text, 2)
        and public.user_has_workspace_role(
          t.workspace_id,
          array['gerente', 'interno']
        )
    )
  );

drop policy if exists "workspace task attachments delete" on storage.objects;
create policy "workspace task attachments delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'workspace-task-attachments'
    and exists (
      select 1
      from public.workspace_tasks t
      where t.workspace_id::text = split_part(objects.name, '/'::text, 1)
        and t.id::text = split_part(objects.name, '/'::text, 2)
        and public.user_has_workspace_role(
          t.workspace_id,
          array['gerente', 'interno']
        )
    )
  );
