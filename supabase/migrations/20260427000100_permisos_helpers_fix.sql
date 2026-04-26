create or replace function public.user_has_workspace_role(
  ws_id uuid,
  roles text[]
) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members m
    join public.users u on u.id = m.user_id
    where m.workspace_id = ws_id
      and m.user_id is not null
      and m.activo = true
      and u.auth_user_id = auth.uid()
      and m.rol = any(roles)
  );
$$;

create or replace function public.user_brand_ids_for_workspace(
  ws_id uuid
) returns setof text
language sql
stable
security definer
set search_path = public
as $$
  select b.brand_id
  from public.workspace_member_brands b
  join public.workspace_members m on m.id = b.member_id
  join public.users u on u.id = m.user_id
  where m.workspace_id = ws_id
    and m.activo = true
    and m.rol = 'externo'
    and u.auth_user_id = auth.uid();
$$;
