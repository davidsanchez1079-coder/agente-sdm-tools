-- Workspace tasks — bandeja de reciclaje (soft delete) + purga automática 15 días.
--
-- Modelo:
-- - Eliminación desde la app = marcar deleted_at/deleted_by_user_id (no borrar fila).
-- - Solo gerente puede ver la papelera (tareas con deleted_at not null).
-- - Un job diario elimina definitivamente lo que lleve 15 días en papelera.

alter table public.workspace_tasks
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by_user_id uuid references public.users(id) on delete set null;

create index if not exists workspace_tasks_workspace_deleted_idx
  on public.workspace_tasks (workspace_id, deleted_at desc)
  where deleted_at is not null;

create index if not exists workspace_tasks_deleted_at_idx
  on public.workspace_tasks (deleted_at)
  where deleted_at is not null;

-- Ajuste RLS: los no eliminados los ve gerente/interno como antes.
-- La papelera (deleted_at is not null) solo la ve gerente.
drop policy if exists workspace_tasks_select on public.workspace_tasks;
create policy workspace_tasks_select on public.workspace_tasks
  for select
  using (
    public.user_has_workspace_role(
      workspace_tasks.workspace_id,
      array['gerente', 'interno']
    )
    and (
      workspace_tasks.deleted_at is null
      or public.user_has_workspace_role(workspace_tasks.workspace_id, array['gerente'])
    )
  );

-- Helper: mover a reciclaje (setea deleted_at + deleted_by_user_id).
create or replace function public.soft_delete_workspace_task(
  workspace_id_input uuid,
  task_id_input uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.workspace_tasks
  set
    deleted_at = now(),
    deleted_by_user_id = public.current_app_user_id()
  where id = task_id_input
    and workspace_id = workspace_id_input
    and deleted_at is null;
end;
$$;

-- Helper: restaurar (solo limpia deleted_at/deleted_by_user_id).
create or replace function public.restore_workspace_task(
  workspace_id_input uuid,
  task_id_input uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.workspace_tasks
  set
    deleted_at = null,
    deleted_by_user_id = null
  where id = task_id_input
    and workspace_id = workspace_id_input;
end;
$$;

-- Purga definitiva: borra tareas en papelera con 15+ días.
create or replace function public.purge_deleted_workspace_tasks()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer := 0;
begin
  -- Borra primero objetos de Storage asociados a notas de tareas a purgar.
  -- Esto remueve los archivos (storage.objects), si existen.
  delete from storage.objects o
  using public.workspace_task_notes n
  join public.workspace_tasks t on t.id = n.workspace_task_id
  where o.bucket_id = 'workspace-task-attachments'
    and n.attachment_storage_path is not null
    and o.name = n.attachment_storage_path
    and t.deleted_at is not null
    and t.deleted_at < now() - interval '15 days';

  -- Borra tareas (cascade elimina notas).
  delete from public.workspace_tasks t
  where t.deleted_at is not null
    and t.deleted_at < now() - interval '15 days';

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

-- Programación (si pg_cron está disponible). Corre diario 03:15.
do $$
declare
  existing_job_id integer;
begin
  if to_regnamespace('cron') is not null then
    -- pg_cron usa jobid para unschedule. Si existe un job con este nombre,
    -- lo removemos y lo volvemos a crear.
    select jobid
      into existing_job_id
    from cron.job
    where jobname = 'purge_workspace_tasks_trash'
    limit 1;

    if existing_job_id is not null then
      perform cron.unschedule(existing_job_id);
    end if;

    perform cron.schedule(
      'purge_workspace_tasks_trash',
      '15 3 * * *',
      'select public.purge_deleted_workspace_tasks();'
    );
  end if;
exception
  when undefined_function then
    -- cron no disponible en este entorno; se programa manualmente.
    null;
  when invalid_schema_name then
    null;
end $$;

