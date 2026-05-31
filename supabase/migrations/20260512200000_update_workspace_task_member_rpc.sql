-- Actualización de tareas vía RPC SECURITY DEFINER: evita depender de OLD/NEW en RLS
-- y centraliza reglas (gerente / creador / responsable, reasignación en el workspace,
-- sin mutar created_by ni workspace_id).

create or replace function public.update_workspace_task_member(
  workspace_id_input uuid,
  task_id_input uuid,
  patch jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := public.current_app_user_id();
  t public.workspace_tasks%rowtype;
  k text;
  allowed text[] := array[
    'titulo',
    'descripcion',
    'estado',
    'prioridad',
    'assigned_to_user_id',
    'vence_el',
    'proximo_seguimiento',
    'proximo_seguimiento_at',
    'customer_id'
  ];
  new_assignee uuid;
  result jsonb;
begin
  if actor is null then
    raise exception 'No autenticado';
  end if;

  if patch is null or patch = '{}'::jsonb then
    raise exception 'Sin cambios';
  end if;

  for k in
    select jsonb_object_keys(patch)
  loop
    if not (k = any(allowed)) then
      raise exception 'Campo no permitido: %', k;
    end if;
  end loop;

  if not (
    public.user_has_workspace_role(workspace_id_input, array['gerente'])
    or public.user_has_workspace_role(workspace_id_input, array['interno'])
  ) then
    raise exception 'Sin membresía en el workspace';
  end if;

  select *
    into strict t
  from public.workspace_tasks
  where id = task_id_input
    and workspace_id = workspace_id_input
    and deleted_at is null
  for update;

  if public.user_has_workspace_role(workspace_id_input, array['gerente']) then
    null;
  elsif t.created_by_user_id = actor or t.assigned_to_user_id is not distinct from actor then
    null;
  else
    raise exception 'No autorizado a modificar esta tarea';
  end if;

  if patch ? 'titulo' then
    if length(trim(patch->>'titulo')) = 0 then
      raise exception 'El título no puede quedar vacío';
    end if;
  end if;

  if patch ? 'assigned_to_user_id' then
    if patch->'assigned_to_user_id' is null
      or jsonb_typeof(patch->'assigned_to_user_id') = 'null' then
      new_assignee := null;
    else
      new_assignee := (patch->>'assigned_to_user_id')::uuid;
    end if;

    if new_assignee is not null then
      if not exists (
        select 1
        from public.workspace_members m
        where m.workspace_id = workspace_id_input
          and m.user_id = new_assignee
          and m.activo = true
          and m.user_id is not null
          and m.joined_at is not null
      ) then
        raise exception 'Responsable no válido para este workspace';
      end if;
    end if;
  end if;

  update public.workspace_tasks w
  set
    titulo = case
      when patch ? 'titulo' then trim(patch->>'titulo')
      else w.titulo
    end,
    descripcion = case
      when patch ? 'descripcion' then
        case
          when patch->'descripcion' is null or jsonb_typeof(patch->'descripcion') = 'null' then null
          else nullif(trim(patch->>'descripcion'), '')
        end
      else w.descripcion
    end,
    estado = case
      when patch ? 'estado' then (patch->>'estado')::text
      else w.estado
    end,
    prioridad = case
      when patch ? 'prioridad' then (patch->>'prioridad')::text
      else w.prioridad
    end,
    assigned_to_user_id = case
      when patch ? 'assigned_to_user_id' then new_assignee
      else w.assigned_to_user_id
    end,
    vence_el = case
      when patch ? 'vence_el' then
        case
          when patch->'vence_el' is null or jsonb_typeof(patch->'vence_el') = 'null' then null
          else (patch->>'vence_el')::timestamptz
        end
      else w.vence_el
    end,
    proximo_seguimiento = case
      when patch ? 'proximo_seguimiento' then nullif(trim(patch->>'proximo_seguimiento'), '')
      else w.proximo_seguimiento
    end,
    proximo_seguimiento_at = case
      when patch ? 'proximo_seguimiento_at' then
        case
          when patch->'proximo_seguimiento_at' is null
            or jsonb_typeof(patch->'proximo_seguimiento_at') = 'null' then null
          else (patch->>'proximo_seguimiento_at')::timestamptz
        end
      else w.proximo_seguimiento_at
    end,
    customer_id = case
      when patch ? 'customer_id' then
        case
          when patch->'customer_id' is null or jsonb_typeof(patch->'customer_id') = 'null' then null
          else (patch->>'customer_id')::uuid
        end
      else w.customer_id
    end
  where w.id = task_id_input
    and w.workspace_id = workspace_id_input;

  select to_jsonb(w)
    into result
  from public.workspace_tasks w
  where w.id = task_id_input
    and w.workspace_id = workspace_id_input;

  if result is null then
    raise exception 'Tarea no encontrada';
  end if;

  return result;
end;
$$;

revoke all on function public.update_workspace_task_member(uuid, uuid, jsonb) from public;

grant execute on function public.update_workspace_task_member(uuid, uuid, jsonb) to authenticated;

grant execute on function public.update_workspace_task_member(uuid, uuid, jsonb) to service_role;
