-- Workspace tasks — tabla workspace_tasks, dominio en español.
-- RLS: acceso explícito solo gerente e interno (vía user_has_workspace_role).
-- Sin policies restrictivas extra para externo: no ven filas si no cumplen USING.

create table if not exists public.workspace_tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  titulo text not null,
  descripcion text,
  estado text not null default 'pendiente',
  prioridad text not null default 'normal',
  assigned_to_user_id uuid references public.users(id) on delete set null,
  created_by_user_id uuid not null default public.current_app_user_id()
    references public.users(id) on delete restrict,
  proximo_seguimiento text,
  proximo_seguimiento_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.workspace_tasks
  drop constraint if exists workspace_tasks_estado_check;
alter table public.workspace_tasks
  add constraint workspace_tasks_estado_check
  check (estado in ('pendiente', 'en_curso', 'hecha', 'cancelada'));

alter table public.workspace_tasks
  drop constraint if exists workspace_tasks_prioridad_check;
alter table public.workspace_tasks
  add constraint workspace_tasks_prioridad_check
  check (prioridad in ('baja', 'normal', 'alta', 'urgente'));

create index if not exists workspace_tasks_workspace_idx
  on public.workspace_tasks (workspace_id);

create index if not exists workspace_tasks_workspace_created_idx
  on public.workspace_tasks (workspace_id, created_at desc);

create or replace function public.workspace_tasks_set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists workspace_tasks_updated_at on public.workspace_tasks;
create trigger workspace_tasks_updated_at
  before update on public.workspace_tasks
  for each row
  execute function public.workspace_tasks_set_updated_at();

alter table public.workspace_tasks enable row level security;

drop policy if exists workspace_tasks_select on public.workspace_tasks;
drop policy if exists workspace_tasks_insert on public.workspace_tasks;
drop policy if exists workspace_tasks_update on public.workspace_tasks;
drop policy if exists workspace_tasks_delete on public.workspace_tasks;

create policy workspace_tasks_select on public.workspace_tasks
  for select
  using (
    public.user_has_workspace_role(
      workspace_tasks.workspace_id,
      array['gerente', 'interno']
    )
  );

create policy workspace_tasks_insert on public.workspace_tasks
  for insert
  with check (
    public.user_has_workspace_role(
      workspace_id,
      array['gerente', 'interno']
    )
    and created_by_user_id = public.current_app_user_id()
  );

create policy workspace_tasks_update on public.workspace_tasks
  for update
  using (
    public.user_has_workspace_role(
      workspace_tasks.workspace_id,
      array['gerente']
    )
    or (
      public.user_has_workspace_role(
        workspace_tasks.workspace_id,
        array['interno']
      )
      and workspace_tasks.created_by_user_id = public.current_app_user_id()
    )
  )
  with check (
    public.user_has_workspace_role(workspace_id, array['gerente'])
    or (
      public.user_has_workspace_role(workspace_id, array['interno'])
      and created_by_user_id = public.current_app_user_id()
    )
  );

create policy workspace_tasks_delete on public.workspace_tasks
  for delete
  using (
    public.user_has_workspace_role(
      workspace_tasks.workspace_id,
      array['gerente']
    )
    or (
      public.user_has_workspace_role(
        workspace_tasks.workspace_id,
        array['interno']
      )
      and workspace_tasks.created_by_user_id = public.current_app_user_id()
    )
  );
