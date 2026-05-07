-- Workspace tasks: asociación opcional a cliente del catálogo.
-- Si customer_id es NULL -> tarea interna.

alter table public.workspace_tasks
  add column if not exists customer_id uuid;

create index if not exists workspace_tasks_workspace_customer_idx
  on public.workspace_tasks (workspace_id, customer_id);

-- FK idempotente: customers(id) con ON DELETE SET NULL.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'workspace_tasks_customer_id_fkey'
      and conrelid = 'public.workspace_tasks'::regclass
  ) then
    alter table public.workspace_tasks
      add constraint workspace_tasks_customer_id_fkey
      foreign key (customer_id)
      references public.customers(id)
      on delete set null;
  end if;
end $$;

