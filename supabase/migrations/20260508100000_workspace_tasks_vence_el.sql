-- Vencimiento de tarea (columna ya presente en algunos entornos).

alter table public.workspace_tasks
  add column if not exists vence_el timestamptz;
