-- Workspace tasks visibility (RLS):
-- Permite que un usuario interno vea una tarea si:
-- - es gerente del workspace (ve todo, incluyendo papelera)
-- - es creador de la tarea
-- - es responsable (assigned_to_user_id)
-- - está en "copia para" (workspace_task_copies)
--
-- Nota: tareas en papelera (deleted_at not null) solo las ve gerente.

drop policy if exists workspace_tasks_select on public.workspace_tasks;

create policy workspace_tasks_select on public.workspace_tasks
  for select
  using (
    public.user_has_workspace_role(workspace_tasks.workspace_id, array['gerente'])
    or (
      public.user_has_workspace_role(workspace_tasks.workspace_id, array['interno'])
      and workspace_tasks.deleted_at is null
      and (
        workspace_tasks.created_by_user_id = public.current_app_user_id()
        or workspace_tasks.assigned_to_user_id = public.current_app_user_id()
        or exists (
          select 1
          from public.workspace_task_copies c
          where c.workspace_id = workspace_tasks.workspace_id
            and c.workspace_task_id = workspace_tasks.id
            and c.copied_user_id = public.current_app_user_id()
        )
      )
    )
  );

-- Alinea notas: solo visibles para quien puede ver la tarea.
drop policy if exists workspace_task_notes_select on public.workspace_task_notes;

create policy workspace_task_notes_select on public.workspace_task_notes
  for select
  using (
    exists (
      select 1
      from public.workspace_tasks t
      where t.id = workspace_task_notes.workspace_task_id
        and t.workspace_id = workspace_task_notes.workspace_id
        and (
          public.user_has_workspace_role(t.workspace_id, array['gerente'])
          or (
            public.user_has_workspace_role(t.workspace_id, array['interno'])
            and t.deleted_at is null
            and (
              t.created_by_user_id = public.current_app_user_id()
              or t.assigned_to_user_id = public.current_app_user_id()
              or exists (
                select 1
                from public.workspace_task_copies c
                where c.workspace_id = t.workspace_id
                  and c.workspace_task_id = t.id
                  and c.copied_user_id = public.current_app_user_id()
              )
            )
          )
        )
    )
  );

