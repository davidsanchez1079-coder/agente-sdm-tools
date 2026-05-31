-- Opción B: notificaciones de tareas por partes interesadas
-- (responsable, creador, copias) con exclusión del actor y deduplicación.

alter table public.notifications
  drop constraint if exists notifications_kind_check;

alter table public.notifications
  add constraint notifications_kind_check
  check (
    kind in (
      'task_assigned',
      'task_reassigned',
      'task_note_added',
      'task_completed',
      'task_created_assigned',
      'task_due_changed',
      'task_unassigned'
    )
  );

-- IDs únicos de destinatarios: responsable, creador, CC y extras opcionales.
create or replace function public._collect_task_notify_recipients(
  task_id_input uuid,
  include_assignee boolean default true,
  include_creator boolean default true,
  include_cc boolean default true,
  extra_user_ids uuid[] default '{}'::uuid[]
)
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    array_agg(distinct u order by u),
    '{}'::uuid[]
  )
  from (
    select t.assigned_to_user_id as u
    from public.workspace_tasks t
    where t.id = task_id_input
      and include_assignee
      and t.assigned_to_user_id is not null
    union
    select t.created_by_user_id as u
    from public.workspace_tasks t
    where t.id = task_id_input
      and include_creator
      and t.created_by_user_id is not null
    union
    select c.copied_user_id as u
    from public.workspace_task_copies c
    where c.workspace_task_id = task_id_input
      and include_cc
    union
    select unnest(coalesce(extra_user_ids, '{}'::uuid[])) as u
  ) recipients
  where u is not null;
$$;

-- Inserta la misma notificación para cada destinatario (salta al actor).
create or replace function public._notify_task_recipients(
  workspace_id_input uuid,
  task_id_input uuid,
  actor_user_id_input uuid,
  kind_input text,
  title_input text,
  body_input text,
  data_input jsonb,
  recipient_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rid uuid;
begin
  if recipient_ids is null then
    return;
  end if;

  foreach rid in array recipient_ids
  loop
    if rid is null then
      continue;
    end if;
    if rid is not distinct from actor_user_id_input then
      continue;
    end if;

    perform public._insert_notification(
      workspace_id_input,
      rid,
      actor_user_id_input,
      kind_input,
      task_id_input,
      title_input,
      body_input,
      public._notification_task_href(task_id_input),
      coalesce(data_input, '{}'::jsonb)
    );
  end loop;
end;
$$;

-- UPDATE: reasignación, vencimiento, completada
create or replace function public.notify_workspace_task_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid;
  old_assignee uuid;
  new_assignee uuid;
  task_title text;
  assign_kind text;
  assign_title text;
begin
  actor_id := public.current_app_user_id();
  old_assignee := old.assigned_to_user_id;
  new_assignee := new.assigned_to_user_id;
  task_title := new.titulo;

  -- Reasignación / asignación / desasignación
  if old_assignee is distinct from new_assignee then
    if new_assignee is not null then
      assign_kind := case
        when old_assignee is null then 'task_assigned'
        else 'task_reassigned'
      end;
      assign_title := case
        when old_assignee is null then 'Te asignaron una tarea'
        else 'Te reasignaron una tarea'
      end;

      perform public._notify_task_recipients(
        new.workspace_id,
        new.id,
        actor_id,
        assign_kind,
        assign_title,
        task_title,
        jsonb_build_object(
          'old_assignee_user_id', old_assignee,
          'new_assignee_user_id', new_assignee
        ),
        array[new_assignee]
      );
    end if;

    if old_assignee is not null then
      perform public._notify_task_recipients(
        new.workspace_id,
        new.id,
        actor_id,
        'task_unassigned',
        'Te quitaron como responsable de una tarea',
        task_title,
        jsonb_build_object(
          'old_assignee_user_id', old_assignee,
          'new_assignee_user_id', new_assignee
        ),
        array[old_assignee]
      );
    end if;

    if new.created_by_user_id is not null
      and new.created_by_user_id is distinct from actor_id
      and new.created_by_user_id is distinct from old_assignee
      and new.created_by_user_id is distinct from new_assignee then
      perform public._notify_task_recipients(
        new.workspace_id,
        new.id,
        actor_id,
        'task_reassigned',
        'Cambió el responsable de una tarea que creaste',
        task_title,
        jsonb_build_object(
          'old_assignee_user_id', old_assignee,
          'new_assignee_user_id', new_assignee
        ),
        array[new.created_by_user_id]
      );
    end if;
  end if;

  -- Vencimiento
  if old.vence_el is distinct from new.vence_el then
    perform public._notify_task_recipients(
      new.workspace_id,
      new.id,
      actor_id,
      'task_due_changed',
      'Cambió la fecha de vencimiento de una tarea',
      task_title,
      jsonb_build_object(
        'old_vence_el', old.vence_el,
        'new_vence_el', new.vence_el
      ),
      public._collect_task_notify_recipients(
        new.id,
        true,
        false,
        true
      )
    );
  end if;

  -- Completada: responsable + creador (menos actor)
  if old.estado is distinct from new.estado and new.estado = 'hecha' then
    perform public._notify_task_recipients(
      new.workspace_id,
      new.id,
      actor_id,
      'task_completed',
      'Una tarea se marcó como completada',
      task_title,
      jsonb_build_object(
        'old_estado', old.estado,
        'new_estado', new.estado
      ),
      public._collect_task_notify_recipients(
        new.id,
        true,
        true,
        false
      )
    );
  end if;

  return new;
end;
$$;

-- INSERT nota: responsable + creador + copias (menos actor)
create or replace function public.notify_workspace_task_note_added()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid;
  task_title text;
begin
  actor_id := public.current_app_user_id();

  select t.titulo
    into task_title
  from public.workspace_tasks t
  where t.id = new.workspace_task_id;

  perform public._notify_task_recipients(
    new.workspace_id,
    new.workspace_task_id,
    actor_id,
    'task_note_added',
    'Nuevo comentario en una tarea',
    coalesce(task_title, ''),
    jsonb_build_object('note_id', new.id),
    public._collect_task_notify_recipients(
      new.workspace_task_id,
      true,
      true,
      true
    )
  );

  return new;
end;
$$;

-- INSERT tarea con responsable (menos actor)
create or replace function public.notify_workspace_task_created_assigned()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid;
begin
  if new.assigned_to_user_id is null then
    return new;
  end if;

  if new.deleted_at is not null then
    return new;
  end if;

  actor_id := public.current_app_user_id();

  perform public._notify_task_recipients(
    new.workspace_id,
    new.id,
    actor_id,
    'task_created_assigned',
    'Nueva tarea asignada',
    new.titulo,
    jsonb_build_object('assigned_to_user_id', new.assigned_to_user_id),
    array[new.assigned_to_user_id]
  );

  return new;
end;
$$;
