create or replace function public.current_app_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.users where auth_user_id = auth.uid()
$$;

create or replace function public.case_visible_to_current_user(case_id_input uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.cases c
    join public.folders f on f.id = c.folder_id
    where c.id = case_id_input
      and (
        public.is_admin()
        or public.user_has_workspace_role(f.workspace_id, array['gerente'])
        or (
          public.user_has_workspace_role(f.workspace_id, array['interno'])
          and (
            (c.created_by is not null and c.created_by = public.current_app_user_id())
            or exists (
              select 1
              from public.case_shares cs
              join public.workspace_members m on m.id = cs.shared_with_member_id
              join public.users u on u.id = m.user_id
              where cs.case_id = c.id
                and cs.revoked_at is null
                and u.auth_user_id = auth.uid()
            )
          )
        )
        or (
          public.user_has_workspace_role(f.workspace_id, array['externo'])
          and c.marca_preferida is not null
          and c.marca_preferida = any(array(
            select public.user_brand_ids_for_workspace(f.workspace_id)
          ))
        )
      )
  );
$$;

create or replace function public.customer_visible_to_current_user(customer_id_input uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.customers cu
    where cu.id = customer_id_input
      and (
        public.is_admin()
        or public.user_has_workspace_role(cu.workspace_id, array['gerente'])
        or (
          public.user_has_workspace_role(cu.workspace_id, array['interno'])
          and (
            (cu.created_by is not null and cu.created_by = public.current_app_user_id())
            or exists (
              select 1
              from public.cases c
              join public.folders f on f.id = c.folder_id
              where c.cliente = cu.label
                and f.workspace_id = cu.workspace_id
                and (
                  (c.created_by is not null and c.created_by = public.current_app_user_id())
                  or exists (
                    select 1
                    from public.case_shares cs
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
        or (
          public.user_has_workspace_role(cu.workspace_id, array['externo'])
          and exists (
            select 1
            from public.cases c
            join public.folders f on f.id = c.folder_id
            where c.cliente = cu.label
              and f.workspace_id = cu.workspace_id
              and c.marca_preferida is not null
              and c.marca_preferida = any(array(
                select public.user_brand_ids_for_workspace(f.workspace_id)
              ))
          )
        )
      )
  );
$$;

create or replace function public.get_primary_workspace_for_user(user_id_input uuid)
returns table (id uuid, user_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  with owned as (
    select w.id, w.user_id
    from public.workspaces w
    where w.user_id = user_id_input
    limit 1
  ),
  membered as (
    select w.id, w.user_id
    from public.workspaces w
    join public.workspace_members m on m.workspace_id = w.id
    where m.user_id = user_id_input
      and m.activo = true
      and m.joined_at is not null
    order by m.joined_at asc
    limit 1
  )
  select * from owned
  union all
  select * from membered where not exists (select 1 from owned)
  limit 1;
$$;

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
