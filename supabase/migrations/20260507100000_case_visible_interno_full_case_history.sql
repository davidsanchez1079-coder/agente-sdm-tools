begin;

-- Mensajes, attachments y message_attachments usan
-- case_visible_to_current_user(case_id) en sus policies SELECT.
-- Tras abrir cases_select a todo interno del workspace, esta función
-- seguía limitando interno a created_by / case_shares → historial vacío.
-- Alineación con cases_select: gerente e interno ven todo el caso;
-- externo solo con marcas asignadas (user_brand_ids_for_workspace).

create or replace function public.case_visible_to_current_user(case_id_input uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.cases c
    join public.folders f on f.id = c.folder_id
    where c.id = case_id_input
      and (
        public.is_admin()
        or public.user_has_workspace_role(f.workspace_id, array['gerente', 'interno'])
        or (
          public.user_has_workspace_role(f.workspace_id, array['externo'])
          and c.marca_preferida is not null
          and c.marca_preferida = any(array(
            select public.user_brand_ids_for_workspace(f.workspace_id)
          ))
        )
      )
  );
$$;

-- Lectura de archivos en bucket case-attachments: misma regla + compartidos
-- (case_shared_with_current_user) para no romper accesos por share.

drop policy if exists "case attachments read" on storage.objects;

create policy "case attachments read" on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'case-attachments'
    and exists (
      select 1
      from public.cases c
      where c.id::text = split_part(objects.name, '/'::text, 1)
        and (
          public.case_visible_to_current_user(c.id)
          or public.case_shared_with_current_user(c.id)
        )
    )
  );

commit;
