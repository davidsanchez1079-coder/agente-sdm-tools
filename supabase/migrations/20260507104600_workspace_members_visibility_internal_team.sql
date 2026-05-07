-- Workspace members visibility:
-- - gerente: ve todo el roster del workspace
-- - interno: ve solo el equipo interno (gerente + interno) del workspace
-- - externo: solo ve su propia fila (workspace_members)
--
-- Objetivo: permitir asignar/reasignar/copia-para/filtros/seguimiento sin exponer roster completo a externos.

drop policy if exists workspace_members_select on public.workspace_members;

create policy workspace_members_select on public.workspace_members
  for select
  using (
    public.is_admin()
    or public.user_has_workspace_role(workspace_members.workspace_id, array['gerente'])
    or (
      -- Interno puede ver al equipo interno completo.
      public.user_has_workspace_role(workspace_members.workspace_id, array['interno'])
      and workspace_members.rol in ('gerente', 'interno')
    )
    or (
      -- Externo (y cualquier rol sin permiso anterior) solo ve su propia fila.
      workspace_members.user_id is not null
      and exists (
        select 1
        from public.users u
        where u.id = workspace_members.user_id
          and u.auth_user_id = auth.uid()
      )
    )
  );

