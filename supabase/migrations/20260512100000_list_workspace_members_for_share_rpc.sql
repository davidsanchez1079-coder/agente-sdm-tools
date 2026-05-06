begin;

-- Lista miembros compartibles evitando huecos de RLS (dueño sin fila gerente,
-- embed users, etc.). Solo admin, gerente del workspace o dueño del workspace.

create or replace function public.list_workspace_members_for_share(p_workspace_id uuid)
returns table (
  member_id uuid,
  user_id uuid,
  email text,
  rol text,
  nombre text,
  apellido text
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
    u.apellido
  from public.workspace_members m
  left join public.users u on u.id = m.user_id
  where m.workspace_id = p_workspace_id
    and m.activo = true
    and m.user_id is not null
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
