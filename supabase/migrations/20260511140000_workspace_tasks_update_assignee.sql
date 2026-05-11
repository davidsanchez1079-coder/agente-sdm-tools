-- Permite que el responsable actual (interno) también pueda actualizar la tarea,
-- p. ej. reasignar al creador. Antes solo el creador o gerente pasaban USING/WITH CHECK,
-- y el UPDATE devolvía 0 filas → PostgREST PGRST116 con .single().
--
-- Reglas:
-- USING: gerente, o interno que sea creador O responsable actual.
-- WITH CHECK: gerente, o interno que sea creador, o nuevo responsable sea el usuario
-- actual, o la tarea quede "en manos del creador" (assigned_to = created_by).

drop policy if exists workspace_tasks_update on public.workspace_tasks;

create policy workspace_tasks_update on public.workspace_tasks
  for update
  using (
    public.user_has_workspace_role(workspace_tasks.workspace_id, array['gerente'])
    or (
      public.user_has_workspace_role(workspace_tasks.workspace_id, array['interno'])
      and (
        workspace_tasks.created_by_user_id = public.current_app_user_id()
        or workspace_tasks.assigned_to_user_id = public.current_app_user_id()
      )
    )
  )
  with check (
    public.user_has_workspace_role(workspace_id, array['gerente'])
    or (
      public.user_has_workspace_role(workspace_id, array['interno'])
      and (
        created_by_user_id = public.current_app_user_id()
        or assigned_to_user_id = public.current_app_user_id()
        or (
          assigned_to_user_id is not null
          and created_by_user_id is not null
          and assigned_to_user_id = created_by_user_id
        )
      )
    )
  );
