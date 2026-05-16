-- Payload en notifications.data para correos enriquecidos (comentarios y cambios).

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
    jsonb_build_object(
      'note_id', new.id,
      'note_text', new.body,
      'note_created_at', new.created_at,
      'task_titulo', coalesce(task_title, '')
    ),
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
