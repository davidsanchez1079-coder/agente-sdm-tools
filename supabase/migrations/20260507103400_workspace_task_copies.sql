-- Workspace task "copias" (CC) — usuarios con visibilidad y avisos del hilo.
--
-- Fase 1:
-- - Tabla de copias por tarea.
-- - RLS: gerente/interno del workspace pueden ver/gestionar copias.
-- - Notificaciones: cuando se agrega una nota, notifica al responsable y a los copiados.

create table if not exists public.workspace_task_copies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  workspace_task_id uuid not null references public.workspace_tasks(id) on delete cascade,
  copied_user_id uuid not null references public.users(id) on delete cascade,
  added_by_user_id uuid not null default public.current_app_user_id()
    references public.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create unique index if not exists workspace_task_copies_unique
  on public.workspace_task_copies (workspace_task_id, copied_user_id);

create index if not exists workspace_task_copies_task_idx
  on public.workspace_task_copies (workspace_task_id, created_at desc);

alter table public.workspace_task_copies enable row level security;

drop policy if exists workspace_task_copies_select on public.workspace_task_copies;
drop policy if exists workspace_task_copies_insert on public.workspace_task_copies;
drop policy if exists workspace_task_copies_delete on public.workspace_task_copies;

create policy workspace_task_copies_select on public.workspace_task_copies
  for select
  using (
    public.user_has_workspace_role(
      workspace_task_copies.workspace_id,
      array['gerente', 'interno']
    )
  );

create policy workspace_task_copies_insert on public.workspace_task_copies
  for insert
  with check (
    public.user_has_workspace_role(
      workspace_id,
      array['gerente', 'interno']
    )
    and added_by_user_id = public.current_app_user_id()
  );

create policy workspace_task_copies_delete on public.workspace_task_copies
  for delete
  using (
    public.user_has_workspace_role(
      workspace_task_copies.workspace_id,
      array['gerente', 'interno']
    )
  );

