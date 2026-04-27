drop policy if exists cases_externo_block_insert on public.cases;
create policy cases_externo_block_insert on public.cases
  as restrictive
  for insert
  with check (
    not exists (
      select 1 from public.folders f
      where f.id = folder_id
        and public.user_has_workspace_role(f.workspace_id, array['externo'])
    )
  );

drop policy if exists cases_externo_block_update on public.cases;
create policy cases_externo_block_update on public.cases
  as restrictive
  for update
  using (
    not exists (
      select 1 from public.folders f
      where f.id = cases.folder_id
        and public.user_has_workspace_role(f.workspace_id, array['externo'])
    )
  );

drop policy if exists cases_externo_block_delete on public.cases;
create policy cases_externo_block_delete on public.cases
  as restrictive
  for delete
  using (
    not exists (
      select 1 from public.folders f
      where f.id = cases.folder_id
        and public.user_has_workspace_role(f.workspace_id, array['externo'])
    )
  );

drop policy if exists customers_externo_block_insert on public.customers;
create policy customers_externo_block_insert on public.customers
  as restrictive
  for insert
  with check (
    not public.user_has_workspace_role(workspace_id, array['externo'])
  );

drop policy if exists customers_externo_block_update on public.customers;
create policy customers_externo_block_update on public.customers
  as restrictive
  for update
  using (
    not public.user_has_workspace_role(customers.workspace_id, array['externo'])
  );

drop policy if exists customers_externo_block_delete on public.customers;
create policy customers_externo_block_delete on public.customers
  as restrictive
  for delete
  using (
    not public.user_has_workspace_role(customers.workspace_id, array['externo'])
  );

drop policy if exists agentes_externo_block_select on public.agentes;
create policy agentes_externo_block_select on public.agentes
  as restrictive
  for select
  using (
    not public.user_has_workspace_role(agentes.workspace_id, array['externo'])
  );

drop policy if exists agentes_externo_block_insert on public.agentes;
create policy agentes_externo_block_insert on public.agentes
  as restrictive
  for insert
  with check (
    not public.user_has_workspace_role(workspace_id, array['externo'])
  );

drop policy if exists agentes_externo_block_update on public.agentes;
create policy agentes_externo_block_update on public.agentes
  as restrictive
  for update
  using (
    not public.user_has_workspace_role(agentes.workspace_id, array['externo'])
  );

drop policy if exists agentes_externo_block_delete on public.agentes;
create policy agentes_externo_block_delete on public.agentes
  as restrictive
  for delete
  using (
    not public.user_has_workspace_role(agentes.workspace_id, array['externo'])
  );

drop policy if exists folders_externo_block_insert on public.folders;
create policy folders_externo_block_insert on public.folders
  as restrictive
  for insert
  with check (
    not public.user_has_workspace_role(workspace_id, array['externo'])
  );

drop policy if exists folders_externo_block_update on public.folders;
create policy folders_externo_block_update on public.folders
  as restrictive
  for update
  using (
    not public.user_has_workspace_role(folders.workspace_id, array['externo'])
  );

drop policy if exists folders_externo_block_delete on public.folders;
create policy folders_externo_block_delete on public.folders
  as restrictive
  for delete
  using (
    not public.user_has_workspace_role(folders.workspace_id, array['externo'])
  );

drop policy if exists messages_externo_block_insert on public.messages;
create policy messages_externo_block_insert on public.messages
  as restrictive
  for insert
  with check (
    not exists (
      select 1
      from public.cases c
      join public.folders f on f.id = c.folder_id
      where c.id = case_id
        and public.user_has_workspace_role(f.workspace_id, array['externo'])
    )
  );

drop policy if exists messages_externo_block_update on public.messages;
create policy messages_externo_block_update on public.messages
  as restrictive
  for update
  using (
    not exists (
      select 1
      from public.cases c
      join public.folders f on f.id = c.folder_id
      where c.id = messages.case_id
        and public.user_has_workspace_role(f.workspace_id, array['externo'])
    )
  );

drop policy if exists messages_externo_block_delete on public.messages;
create policy messages_externo_block_delete on public.messages
  as restrictive
  for delete
  using (
    not exists (
      select 1
      from public.cases c
      join public.folders f on f.id = c.folder_id
      where c.id = messages.case_id
        and public.user_has_workspace_role(f.workspace_id, array['externo'])
    )
  );

drop policy if exists attachments_externo_block_insert on public.attachments;
create policy attachments_externo_block_insert on public.attachments
  as restrictive
  for insert
  with check (
    not exists (
      select 1
      from public.cases c
      join public.folders f on f.id = c.folder_id
      where c.id = case_id
        and public.user_has_workspace_role(f.workspace_id, array['externo'])
    )
  );

drop policy if exists attachments_externo_block_update on public.attachments;
create policy attachments_externo_block_update on public.attachments
  as restrictive
  for update
  using (
    not exists (
      select 1
      from public.cases c
      join public.folders f on f.id = c.folder_id
      where c.id = attachments.case_id
        and public.user_has_workspace_role(f.workspace_id, array['externo'])
    )
  );

drop policy if exists attachments_externo_block_delete on public.attachments;
create policy attachments_externo_block_delete on public.attachments
  as restrictive
  for delete
  using (
    not exists (
      select 1
      from public.cases c
      join public.folders f on f.id = c.folder_id
      where c.id = attachments.case_id
        and public.user_has_workspace_role(f.workspace_id, array['externo'])
    )
  );

drop policy if exists message_attachments_externo_block_insert on public.message_attachments;
create policy message_attachments_externo_block_insert on public.message_attachments
  as restrictive
  for insert
  with check (
    not exists (
      select 1
      from public.messages m
      join public.cases c on c.id = m.case_id
      join public.folders f on f.id = c.folder_id
      where m.id = message_id
        and public.user_has_workspace_role(f.workspace_id, array['externo'])
    )
  );

drop policy if exists message_attachments_externo_block_delete on public.message_attachments;
create policy message_attachments_externo_block_delete on public.message_attachments
  as restrictive
  for delete
  using (
    not exists (
      select 1
      from public.messages m
      join public.cases c on c.id = m.case_id
      join public.folders f on f.id = c.folder_id
      where m.id = message_attachments.message_id
        and public.user_has_workspace_role(f.workspace_id, array['externo'])
    )
  );

drop policy if exists workspace_members_externo_block_insert on public.workspace_members;
create policy workspace_members_externo_block_insert on public.workspace_members
  as restrictive
  for insert
  with check (
    not public.user_has_workspace_role(workspace_id, array['externo'])
  );

drop policy if exists workspace_members_externo_block_update on public.workspace_members;
create policy workspace_members_externo_block_update on public.workspace_members
  as restrictive
  for update
  using (
    not public.user_has_workspace_role(workspace_members.workspace_id, array['externo'])
  );

drop policy if exists workspace_members_externo_block_delete on public.workspace_members;
create policy workspace_members_externo_block_delete on public.workspace_members
  as restrictive
  for delete
  using (
    not public.user_has_workspace_role(workspace_members.workspace_id, array['externo'])
  );

drop policy if exists workspace_member_brands_externo_block_insert on public.workspace_member_brands;
create policy workspace_member_brands_externo_block_insert on public.workspace_member_brands
  as restrictive
  for insert
  with check (
    not exists (
      select 1 from public.workspace_members m
      where m.id = member_id
        and public.user_has_workspace_role(m.workspace_id, array['externo'])
    )
  );

drop policy if exists workspace_member_brands_externo_block_update on public.workspace_member_brands;
create policy workspace_member_brands_externo_block_update on public.workspace_member_brands
  as restrictive
  for update
  using (
    not exists (
      select 1 from public.workspace_members m
      where m.id = workspace_member_brands.member_id
        and public.user_has_workspace_role(m.workspace_id, array['externo'])
    )
  );

drop policy if exists workspace_member_brands_externo_block_delete on public.workspace_member_brands;
create policy workspace_member_brands_externo_block_delete on public.workspace_member_brands
  as restrictive
  for delete
  using (
    not exists (
      select 1 from public.workspace_members m
      where m.id = workspace_member_brands.member_id
        and public.user_has_workspace_role(m.workspace_id, array['externo'])
    )
  );

drop policy if exists case_shares_externo_block_insert on public.case_shares;
create policy case_shares_externo_block_insert on public.case_shares
  as restrictive
  for insert
  with check (
    not exists (
      select 1
      from public.cases c
      join public.folders f on f.id = c.folder_id
      where c.id = case_id
        and public.user_has_workspace_role(f.workspace_id, array['externo'])
    )
  );

drop policy if exists case_shares_externo_block_update on public.case_shares;
create policy case_shares_externo_block_update on public.case_shares
  as restrictive
  for update
  using (
    not exists (
      select 1
      from public.cases c
      join public.folders f on f.id = c.folder_id
      where c.id = case_shares.case_id
        and public.user_has_workspace_role(f.workspace_id, array['externo'])
    )
  );

drop policy if exists case_shares_externo_block_delete on public.case_shares;
create policy case_shares_externo_block_delete on public.case_shares
  as restrictive
  for delete
  using (
    not exists (
      select 1
      from public.cases c
      join public.folders f on f.id = c.folder_id
      where c.id = case_shares.case_id
        and public.user_has_workspace_role(f.workspace_id, array['externo'])
    )
  );
