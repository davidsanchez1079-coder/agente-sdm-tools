-- Agente SDM Tools — PR3
-- Agentes / asignación / creador / secundario.
--
-- Modelo:
--   agentes               — catálogo de personas asignables, workspace-scoped.
--                           Pueden o no ser usuarios reales del sistema.
--   customers.created_by  — usuario (auth) que creó el cliente, auto-set
--                           por DEFAULT vía función current_app_user_id().
--   customers.secondary_agente_id — agente adicional asignado al cliente.
--   cases.created_by      — idem para casos.
--   cases.secondary_agente_id     — idem para casos.
--
-- Visibilidad nivel A: solo metadato dentro del workspace, sin acceso
-- cross-workspace. RLS sigue scopeada por owner.
--
-- Sin begin/commit explícito, todo idempotente. Correr en SQL Editor.

-- Función auxiliar: el id de la fila en `users` que corresponde al
-- usuario auth actual. Stable + security invoker para que respete RLS
-- del caller. Usada como DEFAULT de las columnas created_by.
create or replace function public.current_app_user_id()
returns uuid
language sql
stable
security invoker
as $$
  select id from public.users where auth_user_id = auth.uid()
$$;

-- Tabla agentes
create table if not exists public.agentes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  nombre text not null,
  apellido text,
  rol_label text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists agentes_workspace_idx
  on public.agentes(workspace_id);

create unique index if not exists agentes_workspace_fullname_uniq
  on public.agentes (
    workspace_id,
    lower(nombre || ' ' || coalesce(apellido, ''))
  );

-- RLS
alter table public.agentes enable row level security;

drop policy if exists agentes_owner_select on public.agentes;
drop policy if exists agentes_owner_insert on public.agentes;
drop policy if exists agentes_owner_update on public.agentes;
drop policy if exists agentes_owner_delete on public.agentes;

create policy agentes_owner_select on public.agentes
  for select
  using (
    public.is_admin()
    or exists (
      select 1
      from public.workspaces w
      join public.users u on u.id = w.user_id
      where w.id = agentes.workspace_id
        and u.auth_user_id = auth.uid()
    )
  );

create policy agentes_owner_insert on public.agentes
  for insert
  with check (
    public.is_admin()
    or exists (
      select 1
      from public.workspaces w
      join public.users u on u.id = w.user_id
      where w.id = workspace_id
        and u.auth_user_id = auth.uid()
    )
  );

create policy agentes_owner_update on public.agentes
  for update
  using (
    public.is_admin()
    or exists (
      select 1
      from public.workspaces w
      join public.users u on u.id = w.user_id
      where w.id = agentes.workspace_id
        and u.auth_user_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1
      from public.workspaces w
      join public.users u on u.id = w.user_id
      where w.id = workspace_id
        and u.auth_user_id = auth.uid()
    )
  );

create policy agentes_owner_delete on public.agentes
  for delete
  using (
    public.is_admin()
    or exists (
      select 1
      from public.workspaces w
      join public.users u on u.id = w.user_id
      where w.id = agentes.workspace_id
        and u.auth_user_id = auth.uid()
    )
  );

-- Columnas en customers
alter table public.customers
  add column if not exists created_by uuid references public.users(id);
alter table public.customers
  add column if not exists secondary_agente_id uuid
    references public.agentes(id) on delete set null;

-- DEFAULT para created_by (solo aplica a INSERTs nuevos; rows legacy
-- quedan con NULL — esperado).
alter table public.customers
  alter column created_by set default public.current_app_user_id();

-- Columnas en cases
alter table public.cases
  add column if not exists created_by uuid references public.users(id);
alter table public.cases
  add column if not exists secondary_agente_id uuid
    references public.agentes(id) on delete set null;

alter table public.cases
  alter column created_by set default public.current_app_user_id();
