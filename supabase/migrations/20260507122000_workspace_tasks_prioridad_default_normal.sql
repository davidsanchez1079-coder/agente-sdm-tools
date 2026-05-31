-- Default coherente con workspace_tasks_prioridad_check (sin valor 'media').

alter table public.workspace_tasks
  alter column prioridad set default 'normal';
