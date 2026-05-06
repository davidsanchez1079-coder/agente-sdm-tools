begin;

-- Misma nómina que en Accesos (pendientes + activos): activo = true, aunque aún
-- no hayan aceptado la invitación (user_id / joined_at nulos).

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
      or public.user_has_workspace_role(p_workspace_id, array['gerente'])
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
