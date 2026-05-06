begin;

-- Colaboración en equipo: internos y gerentes del mismo workspace que el caso
-- pueden invitar a cualquier miembro activo de ese workspace (como en Accesos).
-- Los externos siguen sin poder escribir en case_shares (políticas restrictivas).

drop policy if exists case_shares_insert on public.case_shares;
drop policy if exists case_shares_update on public.case_shares;
drop policy if exists case_shares_delete on public.case_shares;

create policy case_shares_insert on public.case_shares
  for insert
  with check (
    public.is_admin()
    or exists (
      select 1
      from public.cases c
      join public.folders f on f.id = c.folder_id
      where c.id = case_id
        and public.user_has_workspace_role(
          f.workspace_id,
          array['gerente', 'interno']
        )
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
        and public.user_has_workspace_role(
          f.workspace_id,
          array['gerente', 'interno']
        )
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1
      from public.cases c
      join public.folders f on f.id = c.folder_id
      where c.id = case_id
        and public.user_has_workspace_role(
          f.workspace_id,
          array['gerente', 'interno']
        )
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
        and public.user_has_workspace_role(
          f.workspace_id,
          array['gerente', 'interno']
        )
    )
  );

-- Catálogo para el desplegable: antes solo pasaban gerente / dueño / admin.
-- Sin esto, un interno solo veía su fila vía RLS en los fallbacks del cliente.

drop function if exists public.list_workspace_members_for_share(uuid);

create function public.list_workspace_members_for_share(p_workspace_id uuid)
returns table (
  member_id uuid,
  user_id uuid,
  email text,
  rol text,
  nombre text,
  apellido text,
  joined_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.id,
    m.user_id,
    m.email,
    m.rol,
    u.nombre,
    u.apellido,
    m.joined_at
  from public.workspace_members m
  left join public.users u on u.id = m.user_id
  where m.workspace_id = p_workspace_id
    and m.activo = true
    and (
      public.is_admin()
      or public.user_has_workspace_role(
        p_workspace_id,
        array['gerente', 'interno']
      )
      or exists (
        select 1
        from public.workspaces w
        where w.id = p_workspace_id
          and w.user_id = public.current_app_user_id()
      )
    );
$$;

grant execute on function public.list_workspace_members_for_share(uuid) to authenticated;

commit;
