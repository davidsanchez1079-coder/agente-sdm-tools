begin;

-- Refuerzo RLS Tareas: dueño del workspace vía auth.uid() (no vía current_app_user_id).
-- Evita NULL / edge cases cuando current_app_user_id no resuelve dentro del flujo RLS.

create or replace function public.task_workspace_owned_by_current_user(ws_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspaces w
    join public.users u on u.id = w.user_id
    where w.id = ws_id
      and u.auth_user_id = auth.uid()
  );
$$;

grant execute on function public.task_workspace_owned_by_current_user(uuid) to authenticated;

-- Idempotente: asegura política INSERT alineada con la función anterior.
drop policy if exists workspace_tasks_insert on public.workspace_tasks;
create policy workspace_tasks_insert on public.workspace_tasks
  for insert to authenticated
  with check (
    public.is_admin()
    or public.task_workspace_owned_by_current_user(workspace_id)
    or public.user_has_workspace_role(workspace_id, array['gerente', 'interno'])
  );

commit;
