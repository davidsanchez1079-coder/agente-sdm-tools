-- Workspace task notes — hilo simple (sin realtime, sin editar/borrar).
-- RLS: acceso explícito solo gerente e interno (vía user_has_workspace_role).
-- Alta: created_by_user_id debe coincidir con current_app_user_id().

create table if not exists public.workspace_task_notes (
  id uuid primary key default gen_random_uuid(),
  workspace_task_id uuid not null references public.workspace_tasks(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  body text not null,
  created_by_user_id uuid not null default public.current_app_user_id()
    references public.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists workspace_task_notes_task_created_idx
  on public.workspace_task_notes (workspace_task_id, created_at asc);

create index if not exists workspace_task_notes_workspace_created_idx
  on public.workspace_task_notes (workspace_id, created_at desc);

alter table public.workspace_task_notes enable row level security;

drop policy if exists workspace_task_notes_select on public.workspace_task_notes;
drop policy if exists workspace_task_notes_insert on public.workspace_task_notes;

create policy workspace_task_notes_select on public.workspace_task_notes
  for select
  using (
    public.user_has_workspace_role(
      workspace_task_notes.workspace_id,
      array['gerente', 'interno']
    )
  );

create policy workspace_task_notes_insert on public.workspace_task_notes
  for insert
  with check (
    public.user_has_workspace_role(
      workspace_id,
      array['gerente', 'interno']
    )
    and created_by_user_id = public.current_app_user_id()
  );

