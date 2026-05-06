begin;

-- Compartir casos: solo gerente (o admin app) puede crear/actualizar/revocar shares.
-- SELECT: quien ya puede ver el caso (case_visible_to_current_user) ve la lista de
-- colaboradores; se mantienen ramas shared_by / shared_with por compatibilidad.

drop policy if exists case_shares_select on public.case_shares;
drop policy if exists case_shares_insert on public.case_shares;
drop policy if exists case_shares_update on public.case_shares;
drop policy if exists case_shares_delete on public.case_shares;

create policy case_shares_select on public.case_shares
  for select
  using (
    public.is_admin()
    or public.case_visible_to_current_user(case_shares.case_id)
    or (
      case_shares.shared_by is not null
      and exists (
        select 1 from public.users u
        where u.id = case_shares.shared_by
          and u.auth_user_id = auth.uid()
      )
    )
    or (
      case_shares.shared_with_member_id is not null
      and exists (
        select 1
        from public.workspace_members m
        join public.users u on u.id = m.user_id
        where m.id = case_shares.shared_with_member_id
          and u.auth_user_id = auth.uid()
      )
    )
  );

create policy case_shares_insert on public.case_shares
  for insert
  with check (
    public.is_admin()
    or exists (
      select 1
      from public.cases c
      join public.folders f on f.id = c.folder_id
      where c.id = case_id
        and public.user_has_workspace_role(f.workspace_id, array['gerente'])
    )
  );

create policy case_shares_update on public.case_shares
  for update
  using (
    public.is_admin()
    or exists (
      select 1
      from public.cases c
      join public.folders f on f.id = c.folder_id
      where c.id = case_shares.case_id
        and public.user_has_workspace_role(f.workspace_id, array['gerente'])
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1
      from public.cases c
      join public.folders f on f.id = c.folder_id
      where c.id = case_id
        and public.user_has_workspace_role(f.workspace_id, array['gerente'])
    )
  );

create policy case_shares_delete on public.case_shares
  for delete
  using (
    public.is_admin()
    or exists (
      select 1
      from public.cases c
      join public.folders f on f.id = c.folder_id
      where c.id = case_shares.case_id
        and public.user_has_workspace_role(f.workspace_id, array['gerente'])
    )
  );

commit;
