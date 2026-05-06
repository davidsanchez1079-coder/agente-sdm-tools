begin;

-- Módulo Tareas v1: tablas workspace-scoped, sin acoplar RLS a cases/folders.

create table if not exists public.workspace_tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  description text,
  estado text not null default 'pendiente',
  prioridad text not null default 'media',
  assigned_to_user_id uuid not null references public.users(id) on delete restrict,
  created_by_user_id uuid not null references public.users(id) on delete restrict,
  customer_id uuid references public.customers(id) on delete set null,
  case_id uuid references public.cases(id) on delete set null,
  promoted_at timestamptz,
  vence_el timestamptz,
  proximo_seguimiento_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspace_tasks_estado_check
    check (estado in ('pendiente', 'en_proceso', 'completada', 'cerrada')),
  constraint workspace_tasks_prioridad_check
    check (prioridad in ('baja', 'media', 'alta', 'urgente'))
);

create index if not exists workspace_tasks_workspace_idx
  on public.workspace_tasks (workspace_id);

create index if not exists workspace_tasks_assigned_idx
  on public.workspace_tasks (assigned_to_user_id);

create index if not exists workspace_tasks_created_by_idx
  on public.workspace_tasks (created_by_user_id);

create index if not exists workspace_tasks_vence_idx
  on public.workspace_tasks (workspace_id, vence_el);

create index if not exists workspace_tasks_estado_idx
  on public.workspace_tasks (workspace_id, estado);

create or replace function public.set_workspace_tasks_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists workspace_tasks_set_updated_at on public.workspace_tasks;
create trigger workspace_tasks_set_updated_at
  before update on public.workspace_tasks
  for each row
  execute function public.set_workspace_tasks_updated_at();

-- Compartir (mismo patrón conceptual que case_shares).
create table if not exists public.task_shares (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.workspace_tasks(id) on delete cascade,
  shared_with_email text not null,
  shared_with_member_id uuid references public.workspace_members(id) on delete cascade,
  shared_by uuid references public.users(id) on delete set null,
  shared_at timestamptz not null default now(),
  revoked_at timestamptz,
  permission text not null default 'edit',
  link_token text,
  constraint task_shares_permission_check
    check (permission in ('view', 'edit'))
);

create unique index if not exists task_shares_task_email_uniq
  on public.task_shares (task_id, lower(shared_with_email));

create unique index if not exists task_shares_link_token_uniq
  on public.task_shares (link_token)
  where link_token is not null;

create index if not exists task_shares_task_idx
  on public.task_shares (task_id);

create index if not exists task_shares_member_idx
  on public.task_shares (shared_with_member_id);

create index if not exists task_shares_active_idx
  on public.task_shares (task_id)
  where revoked_at is null;

create or replace function public.task_shared_with_current_user(task_id_input uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.task_shares ts
    join public.workspace_members wm on wm.id = ts.shared_with_member_id
    join public.users u on u.id = wm.user_id
    where ts.task_id = task_id_input
      and ts.revoked_at is null
      and u.auth_user_id = auth.uid()
      and wm.activo = true
  );
$$;

create or replace function public.task_shared_edit_with_current_user(task_id_input uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.task_shares ts
    join public.workspace_members wm on wm.id = ts.shared_with_member_id
    join public.users u on u.id = wm.user_id
    where ts.task_id = task_id_input
      and ts.revoked_at is null
      and ts.permission = 'edit'
      and u.auth_user_id = auth.uid()
      and wm.activo = true
  );
$$;

create or replace function public.task_visible_to_current_user(task_id_input uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_tasks t
    where t.id = task_id_input
      and (
        public.is_admin()
        or public.user_has_workspace_role(t.workspace_id, array['gerente'])
        or (
          public.user_has_workspace_role(t.workspace_id, array['interno'])
          and (
            t.assigned_to_user_id = public.current_app_user_id()
            or t.created_by_user_id = public.current_app_user_id()
            or public.task_shared_with_current_user(t.id)
          )
        )
      )
  );
$$;

create or replace function public.task_editable_by_current_user(task_id_input uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_tasks t
    where t.id = task_id_input
      and (
        public.is_admin()
        or public.user_has_workspace_role(t.workspace_id, array['gerente'])
        or (
          public.user_has_workspace_role(t.workspace_id, array['interno'])
          and (
            t.assigned_to_user_id = public.current_app_user_id()
            or t.created_by_user_id = public.current_app_user_id()
            or public.task_shared_edit_with_current_user(t.id)
          )
        )
      )
  );
$$;

-- Comentarios
create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.workspace_tasks(id) on delete cascade,
  author_user_id uuid not null references public.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists task_comments_task_idx
  on public.task_comments (task_id, created_at desc);

-- Adjuntos (metadatos; bucket aparte).
create table if not exists public.task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.workspace_tasks(id) on delete cascade,
  storage_path text not null,
  filename text not null,
  kind text not null default 'other',
  mime_type text,
  size_bytes bigint,
  uploaded_by_user_id uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint task_attachments_kind_check
    check (kind in ('image', 'pdf', 'other'))
);

create unique index if not exists task_attachments_path_uniq
  on public.task_attachments (storage_path);

create index if not exists task_attachments_task_idx
  on public.task_attachments (task_id, created_at desc);

alter table public.workspace_tasks enable row level security;
alter table public.task_shares enable row level security;
alter table public.task_comments enable row level security;
alter table public.task_attachments enable row level security;

-- workspace_tasks
drop policy if exists workspace_tasks_select on public.workspace_tasks;
create policy workspace_tasks_select on public.workspace_tasks
  for select to authenticated
  using (public.task_visible_to_current_user(id));

drop policy if exists workspace_tasks_insert on public.workspace_tasks;
create policy workspace_tasks_insert on public.workspace_tasks
  for insert to authenticated
  with check (
    public.is_admin()
    or public.user_has_workspace_role(workspace_id, array['gerente', 'interno'])
  );

drop policy if exists workspace_tasks_update on public.workspace_tasks;
create policy workspace_tasks_update on public.workspace_tasks
  for update to authenticated
  using (public.task_editable_by_current_user(id))
  with check (public.task_editable_by_current_user(id));

drop policy if exists workspace_tasks_delete on public.workspace_tasks;
create policy workspace_tasks_delete on public.workspace_tasks
  for delete to authenticated
  using (
    public.is_admin()
    or public.user_has_workspace_role(workspace_id, array['gerente'])
  );

-- task_shares
drop policy if exists task_shares_select on public.task_shares;
create policy task_shares_select on public.task_shares
  for select to authenticated
  using (
    public.is_admin()
    or public.task_visible_to_current_user(task_shares.task_id)
    or (
      task_shares.shared_by is not null
      and exists (
        select 1 from public.users u
        where u.id = task_shares.shared_by
          and u.auth_user_id = auth.uid()
      )
    )
    or (
      task_shares.shared_with_member_id is not null
      and exists (
        select 1
        from public.workspace_members m
        join public.users u on u.id = m.user_id
        where m.id = task_shares.shared_with_member_id
          and u.auth_user_id = auth.uid()
      )
    )
  );

drop policy if exists task_shares_insert on public.task_shares;
create policy task_shares_insert on public.task_shares
  for insert to authenticated
  with check (
    public.is_admin()
    or exists (
      select 1
      from public.workspace_tasks t
      where t.id = task_id
        and public.user_has_workspace_role(
          t.workspace_id,
          array['gerente', 'interno']
        )
    )
  );

drop policy if exists task_shares_update on public.task_shares;
create policy task_shares_update on public.task_shares
  for update to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.workspace_tasks t
      where t.id = task_shares.task_id
        and public.user_has_workspace_role(
          t.workspace_id,
          array['gerente', 'interno']
        )
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1
      from public.workspace_tasks t
      where t.id = task_id
        and public.user_has_workspace_role(
          t.workspace_id,
          array['gerente', 'interno']
        )
    )
  );

drop policy if exists task_shares_delete on public.task_shares;
create policy task_shares_delete on public.task_shares
  for delete to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.workspace_tasks t
      where t.id = task_shares.task_id
        and public.user_has_workspace_role(
          t.workspace_id,
          array['gerente', 'interno']
        )
    )
  );

-- task_comments
drop policy if exists task_comments_select on public.task_comments;
create policy task_comments_select on public.task_comments
  for select to authenticated
  using (public.task_visible_to_current_user(task_id));

drop policy if exists task_comments_insert on public.task_comments;
create policy task_comments_insert on public.task_comments
  for insert to authenticated
  with check (
    public.task_editable_by_current_user(task_id)
    and author_user_id = public.current_app_user_id()
  );

drop policy if exists task_comments_delete on public.task_comments;
create policy task_comments_delete on public.task_comments
  for delete to authenticated
  using (
    public.is_admin()
    or author_user_id = public.current_app_user_id()
    or exists (
      select 1
      from public.workspace_tasks t
      where t.id = task_comments.task_id
        and public.user_has_workspace_role(t.workspace_id, array['gerente'])
    )
  );

-- task_attachments
drop policy if exists task_attachments_select on public.task_attachments;
create policy task_attachments_select on public.task_attachments
  for select to authenticated
  using (public.task_visible_to_current_user(task_id));

drop policy if exists task_attachments_insert on public.task_attachments;
create policy task_attachments_insert on public.task_attachments
  for insert to authenticated
  with check (
    public.task_editable_by_current_user(task_id)
    and uploaded_by_user_id = public.current_app_user_id()
  );

drop policy if exists task_attachments_delete on public.task_attachments;
create policy task_attachments_delete on public.task_attachments
  for delete to authenticated
  using (
    public.task_editable_by_current_user(task_id)
    and (
      uploaded_by_user_id = public.current_app_user_id()
      or exists (
        select 1
        from public.workspace_tasks t
        where t.id = task_attachments.task_id
          and public.user_has_workspace_role(t.workspace_id, array['gerente'])
      )
    )
  );

-- Bucket dedicado (privado).
insert into storage.buckets (id, name, public)
values ('task-attachments', 'task-attachments', false)
on conflict (id) do nothing;

drop policy if exists "task attachments read" on storage.objects;
create policy "task attachments read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'task-attachments'
    and exists (
      select 1
      from public.workspace_tasks t
      where t.id::text = split_part(objects.name, '/'::text, 1)
        and public.task_visible_to_current_user(t.id)
    )
  );

drop policy if exists "task attachments ins" on storage.objects;
create policy "task attachments ins" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'task-attachments'
    and exists (
      select 1
      from public.workspace_tasks t
      where t.id::text = split_part(objects.name, '/'::text, 1)
        and public.task_editable_by_current_user(t.id)
    )
  );

drop policy if exists "task attachments delete" on storage.objects;
create policy "task attachments delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'task-attachments'
    and exists (
      select 1
      from public.workspace_tasks t
      where t.id::text = split_part(objects.name, '/'::text, 1)
        and public.task_editable_by_current_user(t.id)
    )
  );

commit;
