begin;

-- Tareas v1: fallback para dueño del workspace.
-- Motivo: algunos entornos pueden no resolver user_has_workspace_role()
-- (workspace_members.user_id nulo / invitación pendiente / desalineación),
-- pero el dueño del workspace (workspaces.user_id) debe poder operar el módulo.
-- No toca RLS de cases/messages/attachments.

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
    left join public.workspaces w on w.id = t.workspace_id
    where t.id = task_id_input
      and (
        public.is_admin()
        or (w.id is not null and w.user_id = public.current_app_user_id())
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
    left join public.workspaces w on w.id = t.workspace_id
    where t.id = task_id_input
      and (
        public.is_admin()
        or (w.id is not null and w.user_id = public.current_app_user_id())
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
    or exists (
      select 1
      from public.workspaces w
      where w.id = workspace_id
        and w.user_id = public.current_app_user_id()
    )
    or public.user_has_workspace_role(workspace_id, array['gerente', 'interno'])
  );

commit;

