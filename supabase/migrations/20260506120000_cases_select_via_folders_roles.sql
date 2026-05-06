begin;

-- GOTIA / catálogo: cases no tiene workspace_id; el workspace real es
-- cases.folder_id → folders.id → folders.workspace_id.
--
-- Objetivo:
-- - gerente: todos los casos del workspace
-- - interno: todos los casos del workspace
-- - externo: solo casos con marca_preferida asignada al miembro vía workspace_member_brands
--   (si en tu BD existe cases.deleted_at y quieres ocultar papelera a externos, añade:
--   and cases.deleted_at is null en la rama externo)
-- - sin case_shares ni case_shared_with_current_user aquí
-- - user_has_workspace_role es security definer (estable; sin RLS sobre cases)

drop policy if exists cases_select on public.cases;

create policy cases_select on public.cases
  for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.folders f
      where f.id = cases.folder_id
        and (
          public.user_has_workspace_role(f.workspace_id, array['gerente', 'interno'])
          or (
            public.user_has_workspace_role(f.workspace_id, array['externo'])
            and cases.marca_preferida is not null
            and exists (
              select 1
              from public.workspace_members wm
              join public.users u on u.id = wm.user_id
              join public.workspace_member_brands wb on wb.member_id = wm.id
              where wm.workspace_id = f.workspace_id
                and wm.activo = true
                and wm.rol = 'externo'
                and u.auth_user_id = auth.uid()
                and wb.brand_id = cases.marca_preferida
            )
          )
        )
    )
  );

commit;
