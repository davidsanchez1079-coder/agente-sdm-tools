drop policy if exists cases_select on public.cases;
create policy cases_select on public.cases
  for select to authenticated
  using (
    public.case_shared_with_current_user(cases.id)
    or exists (
      select 1
      from public.workspace_members wm
      join public.users u on u.id = wm.user_id
      join public.folders f on f.id = cases.folder_id
      where wm.workspace_id = f.workspace_id
        and wm.activo = true
        and u.auth_user_id = auth.uid()
        and (
          wm.rol = 'gerente'
          or (wm.rol = 'interno' and cases.created_by = u.id)
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
    public.case_shared_edit_with_current_user(cases.id)
    or exists (
      select 1
      from public.workspace_members wm
      join public.users u on u.id = wm.user_id
      join public.folders f on f.id = cases.folder_id
      where wm.workspace_id = f.workspace_id
        and wm.activo = true
        and u.auth_user_id = auth.uid()
        and (
          wm.rol = 'gerente'
          or (wm.rol = 'interno' and cases.created_by = u.id)
        )
    )
  )
  with check (
    public.case_shared_edit_with_current_user(cases.id)
    or exists (
      select 1
      from public.workspace_members wm
      join public.users u on u.id = wm.user_id
      join public.folders f on f.id = cases.folder_id
      where wm.workspace_id = f.workspace_id
        and wm.activo = true
        and u.auth_user_id = auth.uid()
        and (
          wm.rol = 'gerente'
          or (wm.rol = 'interno' and cases.created_by = u.id)
        )
    )
  );

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert to authenticated
  with check (
    public.case_shared_edit_with_current_user(case_id)
    or exists (
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
          or (wm.rol = 'interno' and c.created_by = u.id)
        )
    )
  );

drop policy if exists attachments_insert on public.attachments;
create policy attachments_insert on public.attachments
  for insert to authenticated
  with check (
    public.case_shared_edit_with_current_user(case_id)
    or exists (
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
          or (wm.rol = 'interno' and c.created_by = u.id)
        )
    )
  );

drop policy if exists message_attachments_insert on public.message_attachments;
create policy message_attachments_insert on public.message_attachments
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.messages msg
      where msg.id = message_id
        and (
          public.case_shared_edit_with_current_user(msg.case_id)
          or exists (
            select 1
            from public.workspace_members wm
            join public.users u on u.id = wm.user_id
            join public.cases c on c.id = msg.case_id
            join public.folders f on f.id = c.folder_id
            where wm.workspace_id = f.workspace_id
              and wm.activo = true
              and u.auth_user_id = auth.uid()
              and (
                wm.rol = 'gerente'
                or (wm.rol = 'interno' and c.created_by = u.id)
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
      from public.cases c
      where c.id::text = split_part(objects.name, '/'::text, 1)
        and (
          public.case_shared_edit_with_current_user(c.id)
          or exists (
            select 1
            from public.workspace_members wm
            join public.users u on u.id = wm.user_id
            join public.folders f on f.id = c.folder_id
            where wm.workspace_id = f.workspace_id
              and wm.activo = true
              and u.auth_user_id = auth.uid()
              and (
                wm.rol = 'gerente'
                or (wm.rol = 'interno' and c.created_by = u.id)
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
      from public.cases c
      where c.id::text = split_part(objects.name, '/'::text, 1)
        and (
          public.case_shared_with_current_user(c.id)
          or exists (
            select 1
            from public.workspace_members wm
            join public.users u on u.id = wm.user_id
            join public.folders f on f.id = c.folder_id
            where wm.workspace_id = f.workspace_id
              and wm.activo = true
              and u.auth_user_id = auth.uid()
              and (
                wm.rol = 'gerente'
                or (wm.rol = 'interno' and c.created_by = u.id)
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
      from public.cases c
      where c.id::text = split_part(objects.name, '/'::text, 1)
        and (
          public.case_shared_edit_with_current_user(c.id)
          or exists (
            select 1
            from public.workspace_members wm
            join public.users u on u.id = wm.user_id
            join public.folders f on f.id = c.folder_id
            where wm.workspace_id = f.workspace_id
              and wm.activo = true
              and u.auth_user_id = auth.uid()
              and (
                wm.rol = 'gerente'
                or (wm.rol = 'interno' and c.created_by = u.id)
              )
          )
        )
    )
  );
