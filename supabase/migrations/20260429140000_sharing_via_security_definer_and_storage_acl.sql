create or replace function public.case_shared_with_current_user(case_id_input uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $func$
  select exists (
    select 1
    from public.case_shares cs
    join public.workspace_members wm on wm.id = cs.shared_with_member_id
    join public.users u on u.id = wm.user_id
    where cs.case_id = case_id_input
      and cs.revoked_at is null
      and u.auth_user_id = auth.uid()
      and wm.activo = true
  );
$func$;

drop policy if exists cases_select on public.cases;
create policy cases_select on public.cases
  for select to authenticated
  using (
    exists (
      select 1
      from public.workspace_members wm
      join public.users u on u.id = wm.user_id
      join public.folders f on f.id = cases.folder_id
      where wm.workspace_id = f.workspace_id
        and wm.activo = true
        and u.auth_user_id = auth.uid()
        and (
          wm.rol = 'gerente'
          or (
            wm.rol = 'interno'
            and (
              cases.created_by = u.id
              or public.case_shared_with_current_user(cases.id)
            )
          )
          or (
            wm.rol = 'externo'
            and cases.marca_preferida is not null
            and exists (
              select 1
              from public.workspace_member_brands wb
              where wb.member_id = wm.id
                and wb.brand_id = cases.marca_preferida
            )
          )
        )
    )
  );

drop policy if exists cases_update on public.cases;
create policy cases_update on public.cases
  for update to authenticated
  using (
    exists (
      select 1
      from public.workspace_members wm
      join public.users u on u.id = wm.user_id
      join public.folders f on f.id = cases.folder_id
      where wm.workspace_id = f.workspace_id
        and wm.activo = true
        and u.auth_user_id = auth.uid()
        and (
          wm.rol = 'gerente'
          or (
            wm.rol = 'interno'
            and (
              cases.created_by = u.id
              or public.case_shared_with_current_user(cases.id)
            )
          )
        )
    )
  )
  with check (
    exists (
      select 1
      from public.workspace_members wm
      join public.users u on u.id = wm.user_id
      join public.folders f on f.id = cases.folder_id
      where wm.workspace_id = f.workspace_id
        and wm.activo = true
        and u.auth_user_id = auth.uid()
        and (
          wm.rol = 'gerente'
          or (
            wm.rol = 'interno'
            and (
              cases.created_by = u.id
              or public.case_shared_with_current_user(cases.id)
            )
          )
        )
    )
  );

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.workspace_members wm
      join public.users u on u.id = wm.user_id
      join public.cases c on c.id = case_id
      join public.folders f on f.id = c.folder_id
      where wm.workspace_id = f.workspace_id
        and wm.activo = true
        and u.auth_user_id = auth.uid()
        and (
          wm.rol = 'gerente'
          or (
            wm.rol = 'interno'
            and (
              c.created_by = u.id
              or public.case_shared_with_current_user(c.id)
            )
          )
        )
    )
  );

drop policy if exists attachments_insert on public.attachments;
create policy attachments_insert on public.attachments
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.workspace_members wm
      join public.users u on u.id = wm.user_id
      join public.cases c on c.id = case_id
      join public.folders f on f.id = c.folder_id
      where wm.workspace_id = f.workspace_id
        and wm.activo = true
        and u.auth_user_id = auth.uid()
        and (
          wm.rol = 'gerente'
          or (
            wm.rol = 'interno'
            and (
              c.created_by = u.id
              or public.case_shared_with_current_user(c.id)
            )
          )
        )
    )
  );

drop policy if exists message_attachments_insert on public.message_attachments;
create policy message_attachments_insert on public.message_attachments
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.workspace_members wm
      join public.users u on u.id = wm.user_id
      join public.messages msg on msg.id = message_id
      join public.cases c on c.id = msg.case_id
      join public.folders f on f.id = c.folder_id
      where wm.workspace_id = f.workspace_id
        and wm.activo = true
        and u.auth_user_id = auth.uid()
        and (
          wm.rol = 'gerente'
          or (
            wm.rol = 'interno'
            and (
              c.created_by = u.id
              or public.case_shared_with_current_user(c.id)
            )
          )
        )
    )
  );

drop policy if exists "case attachments ins" on storage.objects;
create policy "case attachments ins" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'case-attachments'
    and exists (
      select 1
      from public.workspace_members wm
      join public.users u on u.id = wm.user_id
      join public.cases c on c.id::text = split_part(objects.name, '/'::text, 1)
      join public.folders f on f.id = c.folder_id
      where wm.workspace_id = f.workspace_id
        and wm.activo = true
        and u.auth_user_id = auth.uid()
        and (
          wm.rol = 'gerente'
          or (
            wm.rol = 'interno'
            and (
              c.created_by = u.id
              or public.case_shared_with_current_user(c.id)
            )
          )
        )
    )
  );

drop policy if exists "case attachments read" on storage.objects;
create policy "case attachments read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'case-attachments'
    and exists (
      select 1
      from public.workspace_members wm
      join public.users u on u.id = wm.user_id
      join public.cases c on c.id::text = split_part(objects.name, '/'::text, 1)
      join public.folders f on f.id = c.folder_id
      where wm.workspace_id = f.workspace_id
        and wm.activo = true
        and u.auth_user_id = auth.uid()
        and (
          wm.rol = 'gerente'
          or (
            wm.rol = 'interno'
            and (
              c.created_by = u.id
              or public.case_shared_with_current_user(c.id)
            )
          )
          or (
            wm.rol = 'externo'
            and c.marca_preferida is not null
            and exists (
              select 1
              from public.workspace_member_brands wb
              where wb.member_id = wm.id
                and wb.brand_id = c.marca_preferida
            )
          )
        )
    )
  );

drop policy if exists "case attachments delete" on storage.objects;
create policy "case attachments delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'case-attachments'
    and exists (
      select 1
      from public.workspace_members wm
      join public.users u on u.id = wm.user_id
      join public.cases c on c.id::text = split_part(objects.name, '/'::text, 1)
      join public.folders f on f.id = c.folder_id
      where wm.workspace_id = f.workspace_id
        and wm.activo = true
        and u.auth_user_id = auth.uid()
        and (
          wm.rol = 'gerente'
          or (
            wm.rol = 'interno'
            and (
              c.created_by = u.id
              or public.case_shared_with_current_user(c.id)
            )
          )
        )
    )
  );
