begin;

-- Fix: si un usuario pertenece a varios workspaces, elegir como "primario"
-- el de mayor privilegio (gerente > interno > externo). Antes se elegía
-- por joined_at más antiguo, lo cual puede dejar a un interno “atorado”
-- en un workspace donde solo es externo.

create or replace function public.get_primary_workspace_for_user(user_id_input uuid)
returns table (id uuid, user_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  with membered as (
    select w.id, w.user_id
    from public.workspaces w
    join public.workspace_members m on m.workspace_id = w.id
    where m.user_id = user_id_input
      and m.activo = true
      and m.joined_at is not null
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
  owned as (
    select w.id, w.user_id
    from public.workspaces w
    where w.user_id = user_id_input
    limit 1
  )
  select * from membered
  union all
  select * from owned where not exists (select 1 from membered)
  limit 1;
$$;

commit;

