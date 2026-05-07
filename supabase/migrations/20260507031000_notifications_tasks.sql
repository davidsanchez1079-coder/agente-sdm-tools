-- Notifications (in-app) — fase 1: solo eventos de tareas.
-- Objetivo: persistir notificaciones por usuario, con RLS.
--
-- Alcance:
-- - task_assigned
-- - task_reassigned
-- - task_note_added
-- - task_completed

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  recipient_user_id uuid not null references public.users(id) on delete cascade,
  actor_user_id uuid references public.users(id) on delete set null,
  kind text not null,
  entity_type text not null,
  entity_id uuid not null,
  title text not null,
  body text,
  href text not null,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications
  drop constraint if exists notifications_kind_check;

alter table public.notifications
  add constraint notifications_kind_check
  check (
    kind in (
      'task_assigned',
      'task_reassigned',
      'task_note_added',
      'task_completed'
    )
  );

alter table public.notifications
  drop constraint if exists notifications_entity_type_check;

alter table public.notifications
  add constraint notifications_entity_type_check
  check (entity_type in ('task'));

create index if not exists notifications_recipient_unread_created_idx
  on public.notifications (recipient_user_id, read_at, created_at desc);

create index if not exists notifications_workspace_recipient_created_idx
  on public.notifications (workspace_id, recipient_user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists notifications_select on public.notifications;
drop policy if exists notifications_update on public.notifications;

create policy notifications_select on public.notifications
  for select
  using (recipient_user_id = public.current_app_user_id());

create policy notifications_update on public.notifications
  for update
  using (recipient_user_id = public.current_app_user_id())
  with check (recipient_user_id = public.current_app_user_id());

-- Helpers

create or replace function public._notification_task_href(task_id uuid)
returns text
language sql
stable
security invoker
set search_path = public
as $func$
  select '/app/tareas/' || task_id::text;
$func$;

create or replace function public._insert_notification(
  workspace_id_input uuid,
  recipient_user_id_input uuid,
  actor_user_id_input uuid,
  kind_input text,
  entity_id_input uuid,
  title_input text,
  body_input text,
  href_input text,
  data_input jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (
    workspace_id,
    recipient_user_id,
    actor_user_id,
    kind,
    entity_type,
    entity_id,
    title,
    body,
    href,
    data
  )
  values (
    workspace_id_input,
    recipient_user_id_input,
    actor_user_id_input,
    kind_input,
    'task',
    entity_id_input,
    title_input,
    body_input,
    href_input,
    coalesce(data_input, '{}'::jsonb)
  );
end;
$$;

-- Trigger: asignación / reasignación / completada

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
begin
  actor_id := public.current_app_user_id();
  old_assignee := old.assigned_to_user_id;
  new_assignee := new.assigned_to_user_id;
  task_title := new.titulo;

  -- 1) assigned / reassigned
  if old_assignee is distinct from new_assignee then
    if new_assignee is not null then
      perform public._insert_notification(
        new.workspace_id,
        new_assignee,
        actor_id,
        case when old_assignee is null then 'task_assigned' else 'task_reassigned' end,
        new.id,
        case when old_assignee is null then 'Te asignaron una tarea' else 'Te reasignaron una tarea' end,
        task_title,
        public._notification_task_href(new.id),
        jsonb_build_object(
          'old_assignee_user_id', old_assignee,
          'new_assignee_user_id', new_assignee
        )
      );
    end if;
  end if;

  -- 4) task_completed
  if old.estado is distinct from new.estado and new.estado = 'hecha' then
    if new.assigned_to_user_id is not null then
      perform public._insert_notification(
        new.workspace_id,
        new.assigned_to_user_id,
        actor_id,
        'task_completed',
        new.id,
        'Una tarea se marcó como completada',
        task_title,
        public._notification_task_href(new.id),
        jsonb_build_object('old_estado', old.estado, 'new_estado', new.estado)
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_workspace_task_events on public.workspace_tasks;
create trigger trg_notify_workspace_task_events
  after update on public.workspace_tasks
  for each row
  execute function public.notify_workspace_task_events();

-- Trigger: nota agregada (si eres responsable)

create or replace function public.notify_workspace_task_note_added()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid;
  assignee_id uuid;
  task_title text;
begin
  actor_id := public.current_app_user_id();

  select t.assigned_to_user_id, t.titulo
    into assignee_id, task_title
  from public.workspace_tasks t
  where t.id = new.workspace_task_id;

  if assignee_id is null then
    return new;
  end if;

  -- No te notifiques a ti mismo por tu propia nota.
  if assignee_id = actor_id then
    return new;
  end if;

  perform public._insert_notification(
    new.workspace_id,
    assignee_id,
    actor_id,
    'task_note_added',
    new.workspace_task_id,
    'Agregaron una nota en tu tarea',
    task_title,
    public._notification_task_href(new.workspace_task_id),
    jsonb_build_object(
      'note_id', new.id
    )
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_workspace_task_note_added on public.workspace_task_notes;
create trigger trg_notify_workspace_task_note_added
  after insert on public.workspace_task_notes
  for each row
  execute function public.notify_workspace_task_note_added();

