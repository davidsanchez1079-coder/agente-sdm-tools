alter table public.cases
  add column if not exists deleted_at timestamptz;

create index if not exists cases_deleted_at_idx
  on public.cases (deleted_at)
  where deleted_at is not null;

drop policy if exists cases_select on public.cases;
create policy cases_select on public.cases
  for select to authenticated
  using (
    public.case_shared_with_current_user(cases.id)
    or exists (
      select 1
      from public.workspace_members wm
      join public.users u on u.id = wm.user_id
      join public.folders f on f.id = cases.folder_id
      where wm.workspace_id = f.workspace_id
        and wm.activo = true
        and u.auth_user_id = auth.uid()
        and (
          wm.rol = 'gerente'
          or (
            cases.deleted_at is null
            and (
              (wm.rol = 'interno' and cases.created_by = u.id)
              or (
                wm.rol = 'externo'
                and cases.marca_preferida is not null
                and exists (
                  select 1
                  from public.workspace_member_brands wb
                  where wb.member_id = wm.id
                    and wb.brand_id = cases.marca_preferida
                )
              )
            )
          )
        )
    )
  );

create extension if not exists pg_cron with schema extensions;

select cron.unschedule('purge_trashed_cases_15d')
where exists (select 1 from cron.job where jobname = 'purge_trashed_cases_15d');

select cron.schedule(
  'purge_trashed_cases_15d',
  '0 3 * * *',
  $$ delete from public.cases where deleted_at is not null and deleted_at < now() - interval '15 days' $$
);
