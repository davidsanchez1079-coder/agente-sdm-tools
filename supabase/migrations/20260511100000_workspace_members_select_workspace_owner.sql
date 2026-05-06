begin;

-- El dueño del workspace (workspaces.user_id) debe ver todos los
-- workspace_members aunque no tenga fila propia con rol 'gerente'
-- (p. ej. workspace creado en bootstrap sin insert en members).

drop policy if exists workspace_members_select on public.workspace_members;

create policy workspace_members_select on public.workspace_members
  for select
  using (
    public.is_admin()
    or public.user_has_workspace_role(workspace_members.workspace_id, array['gerente'])
    or exists (
      select 1
      from public.workspaces w
      where w.id = workspace_members.workspace_id
        and w.user_id = public.current_app_user_id()
    )
    or (
      workspace_members.user_id is not null
      and exists (
        select 1 from public.users u
        where u.id = workspace_members.user_id
          and u.auth_user_id = auth.uid()
      )
    )
  );

commit;
