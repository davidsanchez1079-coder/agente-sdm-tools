begin;

-- 1) Workspace "primario": preferir workspaces donde el usuario NO es el dueño
--    (w.user_id <> user_id_input), típico de invitados interno/externo/gerente
--    en el workspace de la empresa. Así no nos quedamos en el workspace vacío
--    auto-creado al registrarse cuando la actividad real es en otro.
--    Orden: gerente > interno > externo, luego joined_at.
--    Si no hay membresías "ajenas", caemos al workspace propio (owned) y
--    finalmente a membresía sobre el workspace que sí es propio.

create or replace function public.get_primary_workspace_for_user(user_id_input uuid)
returns table (id uuid, user_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  with invited as (
    select w.id, w.user_id
    from public.workspaces w
    join public.workspace_members m on m.workspace_id = w.id
    where m.user_id = user_id_input
      and m.activo = true
      and m.joined_at is not null
      and w.user_id is distinct from user_id_input
    order by
      case m.rol
        when 'gerente' then 1
        when 'interno' then 2
        when 'externo' then 3
        else 9
      end asc,
      m.joined_at asc
    limit 1
  ),
  owned_ws as (
    select w.id, w.user_id
    from public.workspaces w
    where w.user_id = user_id_input
    limit 1
  ),
  own_member as (
    select w.id, w.user_id
    from public.workspaces w
    join public.workspace_members m on m.workspace_id = w.id
    where m.user_id = user_id_input
      and m.activo = true
      and m.joined_at is not null
      and w.user_id is not distinct from user_id_input
    order by
      case m.rol
        when 'gerente' then 1
        when 'interno' then 2
        when 'externo' then 3
        else 9
      end asc,
      m.joined_at asc
    limit 1
  )
  select * from invited
  union all
  select * from owned_ws where not exists (select 1 from invited)
  union all
  select * from own_member
  where not exists (select 1 from invited)
    and not exists (select 1 from owned_ws)
  limit 1;
$$;

-- 2) Si en algún entorno sigue vigente customers_select → customer_visible_to_current_user,
--    los internos deben ver todo el catálogo del workspace (no solo clientes con casos propios).

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
        or public.user_has_workspace_role(cu.workspace_id, array['interno'])
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

commit;
