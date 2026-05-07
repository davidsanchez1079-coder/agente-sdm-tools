-- Alinear con modelo mínimo: asignación opcional; creador por defecto vía current_app_user_id().

alter table public.workspace_tasks
  alter column assigned_to_user_id drop not null;

alter table public.workspace_tasks
  alter column created_by_user_id set default public.current_app_user_id();
