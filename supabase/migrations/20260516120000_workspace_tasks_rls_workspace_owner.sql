begin;

-- Dueño del workspace (workspaces.user_id) puede gestionar tareas aunque no
-- exista fila en workspace_members con rol gerente/interno (bootstrap antiguo).

create or replace function public.task_workspace_owned_by_current_user(ws_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspaces w
    where w.id = ws_id
      and w.user_id = public.current_app_user_id()
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
        or public.task_workspace_owned_by_current_user(t.workspace_id)
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
        or public.task_workspace_owned_by_current_user(t.workspace_id)
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

drop policy if exists workspace_tasks_insert on public.workspace_tasks;
create policy workspace_tasks_insert on public.workspace_tasks
  for insert to authenticated
  with check (
    public.is_admin()
    or public.task_workspace_owned_by_current_user(workspace_id)
    or public.user_has_workspace_role(workspace_id, array['gerente', 'interno'])
  );

drop policy if exists workspace_tasks_delete on public.workspace_tasks;
create policy workspace_tasks_delete on public.workspace_tasks
  for delete to authenticated
  using (
    public.is_admin()
    or public.task_workspace_owned_by_current_user(workspace_id)
    or public.user_has_workspace_role(workspace_id, array['gerente'])
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
        and (
          public.task_workspace_owned_by_current_user(t.workspace_id)
          or public.user_has_workspace_role(
            t.workspace_id,
            array['gerente', 'interno']
          )
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
        and (
          public.task_workspace_owned_by_current_user(t.workspace_id)
          or public.user_has_workspace_role(
            t.workspace_id,
            array['gerente', 'interno']
          )
        )
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1
      from public.workspace_tasks t
      where t.id = task_id
        and (
          public.task_workspace_owned_by_current_user(t.workspace_id)
          or public.user_has_workspace_role(
            t.workspace_id,
            array['gerente', 'interno']
          )
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
        and (
          public.task_workspace_owned_by_current_user(t.workspace_id)
          or public.user_has_workspace_role(
            t.workspace_id,
            array['gerente', 'interno']
          )
        )
    )
  );

commit;
