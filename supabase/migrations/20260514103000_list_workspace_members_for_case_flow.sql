-- Lista miembros elegibles del workspace para compartir casos / usuarios secundarios
-- sin depender del SELECT directo a workspace_members (RLS). SECURITY DEFINER +
-- validación explícita de permisos.

create or replace function public.list_workspace_members_for_case_flow(
  workspace_id_input uuid,
  case_id_input uuid default null
)
returns table (
  member_id uuid,
  user_id uuid,
  email text,
  rol text,
  display_name text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  if case_id_input is null then
    if not (
      public.is_admin()
      or public.user_has_workspace_role(
        workspace_id_input,
        array['gerente', 'interno']
      )
    ) then
      raise exception 'No autorizado';
    end if;
  else
    if not exists (
      select 1
      from public.cases c
      join public.folders f on f.id = c.folder_id
      where c.id = case_id_input
        and f.workspace_id = workspace_id_input
    ) then
      raise exception 'Caso no encontrado en el workspace';
    end if;

    if not (
      public.is_admin()
      or public.user_has_workspace_role(workspace_id_input, array['gerente'])
      or (
        public.user_has_workspace_role(workspace_id_input, array['interno'])
        and (
          exists (
            select 1
            from public.cases c
            where c.id = case_id_input
              and c.created_by is not distinct from public.current_app_user_id()
          )
          or public.case_shared_edit_with_current_user(case_id_input)
        )
      )
    ) then
      raise exception 'No autorizado';
    end if;
  end if;

  return query
  select
    wm.id as member_id,
    wm.user_id,
    coalesce(nullif(trim(wm.email), ''), u.email)::text as email,
    wm.rol::text,
    coalesce(
      nullif(
        trim(concat_ws(' ', nullif(trim(u.nombre), ''), nullif(trim(u.apellido), ''))),
        ''
      ),
      coalesce(nullif(trim(wm.email), ''), u.email)::text
    ) as display_name
  from public.workspace_members wm
  join public.users u on u.id = wm.user_id
  where wm.workspace_id = workspace_id_input
    and wm.activo = true
    and wm.user_id is not null
    and wm.joined_at is not null
  order by lower(coalesce(nullif(trim(wm.email), ''), u.email));
end;
$$;

comment on function public.list_workspace_members_for_case_flow(uuid, uuid) is
  'Miembros del workspace elegibles para compartir / secundarios de caso. No sustituye el RLS general de workspace_members.';

revoke all on function public.list_workspace_members_for_case_flow(uuid, uuid) from public;

grant execute on function public.list_workspace_members_for_case_flow(uuid, uuid) to authenticated;

grant execute on function public.list_workspace_members_for_case_flow(uuid, uuid) to service_role;
