begin;

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

alter table public.folders enable row level security;
alter table public.cases enable row level security;
alter table public.customers enable row level security;
alter table public.agentes enable row level security;
alter table public.messages enable row level security;
alter table public.attachments enable row level security;
alter table public.message_attachments enable row level security;

create policy folders_select on public.folders
  for select
  using (
    public.is_admin()
    or public.user_has_workspace_role(folders.workspace_id, array['gerente','interno','externo'])
  );

create policy folders_insert on public.folders
  for insert
  with check (
    public.is_admin()
    or public.user_has_workspace_role(workspace_id, array['gerente','interno'])
  );

create policy folders_update on public.folders
  for update
  using (
    public.is_admin()
    or public.user_has_workspace_role(folders.workspace_id, array['gerente'])
  )
  with check (
    public.is_admin()
    or public.user_has_workspace_role(workspace_id, array['gerente'])
  );

create policy folders_delete on public.folders
  for delete
  using (
    public.is_admin()
    or public.user_has_workspace_role(folders.workspace_id, array['gerente'])
  );

create policy cases_select on public.cases
  for select
  using (public.case_visible_to_current_user(cases.id));

create policy cases_insert on public.cases
  for insert
  with check (
    public.is_admin()
    or exists (
      select 1 from public.folders f
      where f.id = folder_id
        and (
          public.user_has_workspace_role(f.workspace_id, array['gerente'])
          or (
            public.user_has_workspace_role(f.workspace_id, array['interno'])
            and (created_by is null or created_by = public.current_app_user_id())
          )
        )
    )
  );

create policy cases_update on public.cases
  for update
  using (
    public.is_admin()
    or exists (
      select 1 from public.folders f
      where f.id = cases.folder_id
        and (
          public.user_has_workspace_role(f.workspace_id, array['gerente'])
          or (
            public.user_has_workspace_role(f.workspace_id, array['interno'])
            and cases.created_by = public.current_app_user_id()
          )
        )
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.folders f
      where f.id = folder_id
        and (
          public.user_has_workspace_role(f.workspace_id, array['gerente'])
          or (
            public.user_has_workspace_role(f.workspace_id, array['interno'])
            and created_by = public.current_app_user_id()
          )
        )
    )
  );

create policy cases_delete on public.cases
  for delete
  using (
    public.is_admin()
    or exists (
      select 1 from public.folders f
      where f.id = cases.folder_id
        and (
          public.user_has_workspace_role(f.workspace_id, array['gerente'])
          or (
            public.user_has_workspace_role(f.workspace_id, array['interno'])
            and cases.created_by = public.current_app_user_id()
          )
        )
    )
  );

create policy customers_select on public.customers
  for select
  using (public.customer_visible_to_current_user(customers.id));

create policy customers_insert on public.customers
  for insert
  with check (
    public.is_admin()
    or public.user_has_workspace_role(workspace_id, array['gerente'])
    or (
      public.user_has_workspace_role(workspace_id, array['interno'])
      and (created_by is null or created_by = public.current_app_user_id())
    )
  );

create policy customers_update on public.customers
  for update
  using (
    public.is_admin()
    or public.user_has_workspace_role(customers.workspace_id, array['gerente'])
    or (
      public.user_has_workspace_role(customers.workspace_id, array['interno'])
      and customers.created_by = public.current_app_user_id()
    )
  )
  with check (
    public.is_admin()
    or public.user_has_workspace_role(workspace_id, array['gerente'])
    or (
      public.user_has_workspace_role(workspace_id, array['interno'])
      and created_by = public.current_app_user_id()
    )
  );

create policy customers_delete on public.customers
  for delete
  using (
    public.is_admin()
    or public.user_has_workspace_role(customers.workspace_id, array['gerente'])
    or (
      public.user_has_workspace_role(customers.workspace_id, array['interno'])
      and customers.created_by = public.current_app_user_id()
    )
  );

create policy agentes_select on public.agentes
  for select
  using (
    public.is_admin()
    or public.user_has_workspace_role(agentes.workspace_id, array['gerente','interno'])
  );

create policy agentes_insert on public.agentes
  for insert
  with check (
    public.is_admin()
    or public.user_has_workspace_role(workspace_id, array['gerente'])
  );

create policy agentes_update on public.agentes
  for update
  using (
    public.is_admin()
    or public.user_has_workspace_role(agentes.workspace_id, array['gerente'])
  )
  with check (
    public.is_admin()
    or public.user_has_workspace_role(workspace_id, array['gerente'])
  );

create policy agentes_delete on public.agentes
  for delete
  using (
    public.is_admin()
    or public.user_has_workspace_role(agentes.workspace_id, array['gerente'])
  );

create policy messages_select on public.messages
  for select
  using (public.case_visible_to_current_user(messages.case_id));

create policy messages_insert on public.messages
  for insert
  with check (
    public.is_admin()
    or exists (
      select 1 from public.cases c
      join public.folders f on f.id = c.folder_id
      where c.id = case_id
        and (
          public.user_has_workspace_role(f.workspace_id, array['gerente'])
          or (
            public.user_has_workspace_role(f.workspace_id, array['interno'])
            and (
              c.created_by = public.current_app_user_id()
              or exists (
                select 1 from public.case_shares cs
                join public.workspace_members m on m.id = cs.shared_with_member_id
                join public.users u on u.id = m.user_id
                where cs.case_id = c.id
                  and cs.revoked_at is null
                  and u.auth_user_id = auth.uid()
              )
            )
          )
        )
    )
  );

create policy messages_update on public.messages
  for update
  using (
    public.is_admin()
    or exists (
      select 1 from public.cases c
      join public.folders f on f.id = c.folder_id
      where c.id = messages.case_id
        and public.user_has_workspace_role(f.workspace_id, array['gerente'])
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.cases c
      join public.folders f on f.id = c.folder_id
      where c.id = case_id
        and public.user_has_workspace_role(f.workspace_id, array['gerente'])
    )
  );

create policy messages_delete on public.messages
  for delete
  using (
    public.is_admin()
    or exists (
      select 1 from public.cases c
      join public.folders f on f.id = c.folder_id
      where c.id = messages.case_id
        and public.user_has_workspace_role(f.workspace_id, array['gerente'])
    )
  );

create policy attachments_select on public.attachments
  for select
  using (public.case_visible_to_current_user(attachments.case_id));

create policy attachments_insert on public.attachments
  for insert
  with check (
    public.is_admin()
    or exists (
      select 1 from public.cases c
      join public.folders f on f.id = c.folder_id
      where c.id = case_id
        and (
          public.user_has_workspace_role(f.workspace_id, array['gerente'])
          or (
            public.user_has_workspace_role(f.workspace_id, array['interno'])
            and (
              c.created_by = public.current_app_user_id()
              or exists (
                select 1 from public.case_shares cs
                join public.workspace_members m on m.id = cs.shared_with_member_id
                join public.users u on u.id = m.user_id
                where cs.case_id = c.id
                  and cs.revoked_at is null
                  and u.auth_user_id = auth.uid()
              )
            )
          )
        )
    )
  );

create policy attachments_update on public.attachments
  for update
  using (
    public.is_admin()
    or exists (
      select 1 from public.cases c
      join public.folders f on f.id = c.folder_id
      where c.id = attachments.case_id
        and public.user_has_workspace_role(f.workspace_id, array['gerente'])
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.cases c
      join public.folders f on f.id = c.folder_id
      where c.id = case_id
        and public.user_has_workspace_role(f.workspace_id, array['gerente'])
    )
  );

create policy attachments_delete on public.attachments
  for delete
  using (
    public.is_admin()
    or exists (
      select 1 from public.cases c
      join public.folders f on f.id = c.folder_id
      where c.id = attachments.case_id
        and public.user_has_workspace_role(f.workspace_id, array['gerente'])
    )
  );

create policy message_attachments_select on public.message_attachments
  for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.messages m
      where m.id = message_attachments.message_id
        and public.case_visible_to_current_user(m.case_id)
    )
  );

create policy message_attachments_insert on public.message_attachments
  for insert
  with check (
    public.is_admin()
    or exists (
      select 1 from public.messages m
      join public.cases c on c.id = m.case_id
      join public.folders f on f.id = c.folder_id
      where m.id = message_id
        and (
          public.user_has_workspace_role(f.workspace_id, array['gerente'])
          or (
            public.user_has_workspace_role(f.workspace_id, array['interno'])
            and (
              c.created_by = public.current_app_user_id()
              or exists (
                select 1 from public.case_shares cs
                join public.workspace_members ms on ms.id = cs.shared_with_member_id
                join public.users u on u.id = ms.user_id
                where cs.case_id = c.id
                  and cs.revoked_at is null
                  and u.auth_user_id = auth.uid()
              )
            )
          )
        )
    )
  );

create policy message_attachments_delete on public.message_attachments
  for delete
  using (
    public.is_admin()
    or exists (
      select 1 from public.messages m
      join public.cases c on c.id = m.case_id
      join public.folders f on f.id = c.folder_id
      where m.id = message_attachments.message_id
        and public.user_has_workspace_role(f.workspace_id, array['gerente'])
    )
  );

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

create policy customers_externo_block_insert on public.customers
  as restrictive
  for insert
  with check (
    not public.user_has_workspace_role(workspace_id, array['externo'])
  );

create policy customers_externo_block_update on public.customers
  as restrictive
  for update
  using (
    not public.user_has_workspace_role(customers.workspace_id, array['externo'])
  );

create policy customers_externo_block_delete on public.customers
  as restrictive
  for delete
  using (
    not public.user_has_workspace_role(customers.workspace_id, array['externo'])
  );

create policy agentes_externo_block_select on public.agentes
  as restrictive
  for select
  using (
    not public.user_has_workspace_role(agentes.workspace_id, array['externo'])
  );

create policy agentes_externo_block_insert on public.agentes
  as restrictive
  for insert
  with check (
    not public.user_has_workspace_role(workspace_id, array['externo'])
  );

create policy agentes_externo_block_update on public.agentes
  as restrictive
  for update
  using (
    not public.user_has_workspace_role(agentes.workspace_id, array['externo'])
  );

create policy agentes_externo_block_delete on public.agentes
  as restrictive
  for delete
  using (
    not public.user_has_workspace_role(agentes.workspace_id, array['externo'])
  );

create policy folders_externo_block_insert on public.folders
  as restrictive
  for insert
  with check (
    not public.user_has_workspace_role(workspace_id, array['externo'])
  );

create policy folders_externo_block_update on public.folders
  as restrictive
  for update
  using (
    not public.user_has_workspace_role(folders.workspace_id, array['externo'])
  );

create policy folders_externo_block_delete on public.folders
  as restrictive
  for delete
  using (
    not public.user_has_workspace_role(folders.workspace_id, array['externo'])
  );

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

do $$
declare
  perm_total int;
  rest_total int;
  expected_perm int := 27;
  expected_rest int := 21;
  bad_table record;
begin
  select count(*) into perm_total
  from pg_policies
  where schemaname = 'public'
    and tablename in ('folders','cases','customers','agentes','messages','attachments','message_attachments')
    and permissive = 'PERMISSIVE';

  select count(*) into rest_total
  from pg_policies
  where schemaname = 'public'
    and tablename in ('folders','cases','customers','agentes','messages','attachments','message_attachments')
    and permissive = 'RESTRICTIVE';

  if perm_total <> expected_perm then
    raise exception 'PRD RLS verify failed: PERMISSIVE total = % (expected %)', perm_total, expected_perm;
  end if;

  if rest_total <> expected_rest then
    raise exception 'PRD RLS verify failed: RESTRICTIVE total = % (expected %)', rest_total, expected_rest;
  end if;

  for bad_table in
    select tablename, count(*) filter (where permissive='PERMISSIVE') as p, count(*) filter (where permissive='RESTRICTIVE') as r
    from pg_policies
    where schemaname='public'
      and tablename in ('folders','cases','customers','agentes','messages','attachments','message_attachments')
    group by tablename
    having (
      (tablename in ('folders','cases','customers','messages','attachments') and (count(*) filter (where permissive='PERMISSIVE') <> 4 or count(*) filter (where permissive='RESTRICTIVE') <> 3))
      or (tablename = 'agentes' and (count(*) filter (where permissive='PERMISSIVE') <> 4 or count(*) filter (where permissive='RESTRICTIVE') <> 4))
      or (tablename = 'message_attachments' and (count(*) filter (where permissive='PERMISSIVE') <> 3 or count(*) filter (where permissive='RESTRICTIVE') <> 2))
    )
  loop
    raise exception 'PRD RLS verify failed: tabla % quedo con % PERMISSIVE y % RESTRICTIVE (no coincide con el esperado)', bad_table.tablename, bad_table.p, bad_table.r;
  end loop;
end $$;

commit;
