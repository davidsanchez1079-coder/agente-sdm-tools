do $$
declare
  pol record;
  t text;
begin
  for t in
    select unnest(array['folders','cases','customers','agentes','messages','attachments','message_attachments']::text[])
  loop
    for pol in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = t
    loop
      execute format('drop policy %I on public.%I', pol.policyname, t);
    end loop;
  end loop;
end $$;

create policy folders_owner_or_gerente on public.folders
  for all
  using (
    public.is_admin()
    or exists (
      select 1 from public.workspaces w
      join public.users u on u.id = w.user_id
      where w.id = folders.workspace_id
        and u.auth_user_id = auth.uid()
    )
    or public.user_has_workspace_role(folders.workspace_id, array['gerente'])
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.workspaces w
      join public.users u on u.id = w.user_id
      where w.id = workspace_id
        and u.auth_user_id = auth.uid()
    )
    or public.user_has_workspace_role(workspace_id, array['gerente'])
  );

create policy cases_owner_or_gerente on public.cases
  for all
  using (
    public.is_admin()
    or exists (
      select 1 from public.folders f
      join public.workspaces w on w.id = f.workspace_id
      join public.users u on u.id = w.user_id
      where f.id = cases.folder_id
        and (u.auth_user_id = auth.uid() or public.user_has_workspace_role(f.workspace_id, array['gerente']))
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.folders f
      join public.workspaces w on w.id = f.workspace_id
      join public.users u on u.id = w.user_id
      where f.id = folder_id
        and (u.auth_user_id = auth.uid() or public.user_has_workspace_role(f.workspace_id, array['gerente']))
    )
  );

create policy customers_owner_or_gerente on public.customers
  for all
  using (
    public.is_admin()
    or exists (
      select 1 from public.workspaces w
      join public.users u on u.id = w.user_id
      where w.id = customers.workspace_id
        and u.auth_user_id = auth.uid()
    )
    or public.user_has_workspace_role(customers.workspace_id, array['gerente'])
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.workspaces w
      join public.users u on u.id = w.user_id
      where w.id = workspace_id
        and u.auth_user_id = auth.uid()
    )
    or public.user_has_workspace_role(workspace_id, array['gerente'])
  );

create policy agentes_owner_or_gerente on public.agentes
  for all
  using (
    public.is_admin()
    or exists (
      select 1 from public.workspaces w
      join public.users u on u.id = w.user_id
      where w.id = agentes.workspace_id
        and u.auth_user_id = auth.uid()
    )
    or public.user_has_workspace_role(agentes.workspace_id, array['gerente'])
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.workspaces w
      join public.users u on u.id = w.user_id
      where w.id = workspace_id
        and u.auth_user_id = auth.uid()
    )
    or public.user_has_workspace_role(workspace_id, array['gerente'])
  );

create policy messages_owner_or_gerente on public.messages
  for all
  using (
    public.is_admin()
    or exists (
      select 1 from public.cases c
      join public.folders f on f.id = c.folder_id
      join public.workspaces w on w.id = f.workspace_id
      join public.users u on u.id = w.user_id
      where c.id = messages.case_id
        and (u.auth_user_id = auth.uid() or public.user_has_workspace_role(f.workspace_id, array['gerente']))
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.cases c
      join public.folders f on f.id = c.folder_id
      join public.workspaces w on w.id = f.workspace_id
      join public.users u on u.id = w.user_id
      where c.id = case_id
        and (u.auth_user_id = auth.uid() or public.user_has_workspace_role(f.workspace_id, array['gerente']))
    )
  );

create policy attachments_owner_or_gerente on public.attachments
  for all
  using (
    public.is_admin()
    or exists (
      select 1 from public.cases c
      join public.folders f on f.id = c.folder_id
      join public.workspaces w on w.id = f.workspace_id
      join public.users u on u.id = w.user_id
      where c.id = attachments.case_id
        and (u.auth_user_id = auth.uid() or public.user_has_workspace_role(f.workspace_id, array['gerente']))
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.cases c
      join public.folders f on f.id = c.folder_id
      join public.workspaces w on w.id = f.workspace_id
      join public.users u on u.id = w.user_id
      where c.id = case_id
        and (u.auth_user_id = auth.uid() or public.user_has_workspace_role(f.workspace_id, array['gerente']))
    )
  );

create policy message_attachments_owner_or_gerente on public.message_attachments
  for all
  using (
    public.is_admin()
    or exists (
      select 1
      from public.messages m
      join public.cases c on c.id = m.case_id
      join public.folders f on f.id = c.folder_id
      join public.workspaces w on w.id = f.workspace_id
      join public.users u on u.id = w.user_id
      where m.id = message_attachments.message_id
        and (u.auth_user_id = auth.uid() or public.user_has_workspace_role(f.workspace_id, array['gerente']))
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1
      from public.messages m
      join public.cases c on c.id = m.case_id
      join public.folders f on f.id = c.folder_id
      join public.workspaces w on w.id = f.workspace_id
      join public.users u on u.id = w.user_id
      where m.id = message_id
        and (u.auth_user_id = auth.uid() or public.user_has_workspace_role(f.workspace_id, array['gerente']))
    )
  );
