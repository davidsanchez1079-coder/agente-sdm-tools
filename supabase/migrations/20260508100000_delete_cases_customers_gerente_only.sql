begin;

-- Borrado duro: solo gerente del workspace (o admin de app).
-- Quita la rama "interno y created_by" en cases_delete y customers_delete.

drop policy if exists cases_delete on public.cases;

create policy cases_delete on public.cases
  for delete
  using (
    public.is_admin()
    or exists (
      select 1
      from public.folders f
      where f.id = cases.folder_id
        and public.user_has_workspace_role(f.workspace_id, array['gerente'])
    )
  );

drop policy if exists customers_delete on public.customers;

create policy customers_delete on public.customers
  for delete
  using (
    public.is_admin()
    or public.user_has_workspace_role(customers.workspace_id, array['gerente'])
  );

-- Papelera (soft delete): si existe la columna deleted_at, solo gerente/admin
-- puede cambiarla; los internos siguen pudiendo actualizar el resto de campos
-- vía cases_update.

create or replace function public.cases_enforce_trash_gerente_only()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.deleted_at is not distinct from old.deleted_at then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  if exists (
    select 1
    from public.folders f
    where f.id = old.folder_id
      and public.user_has_workspace_role(f.workspace_id, array['gerente'])
  ) then
    return new;
  end if;

  raise exception 'Solo un gerente del workspace puede enviar a la papelera o restaurar casos.'
    using errcode = '42501';
end;
$$;

drop trigger if exists cases_trash_gerente_only on public.cases;

do $t$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cases'
      and column_name = 'deleted_at'
  ) then
    create trigger cases_trash_gerente_only
      before update of deleted_at on public.cases
      for each row
      execute function public.cases_enforce_trash_gerente_only();
  end if;
end;
$t$;

commit;
