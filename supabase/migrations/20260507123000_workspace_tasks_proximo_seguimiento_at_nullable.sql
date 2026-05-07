-- Fecha de seguimiento opcional (la UI mínima no la envía).

alter table public.workspace_tasks
  alter column proximo_seguimiento_at drop not null;

alter table public.workspace_tasks
  alter column proximo_seguimiento_at drop default;
