do $$
declare
  null_count int;
begin
  select count(*) into null_count
  from public.cases
  where marca_preferida is null
     or length(trim(marca_preferida)) = 0;
  raise notice 'Casos historicos con marca_preferida vacia o NULL: %', null_count;
end $$;

alter table public.cases
  drop constraint if exists cases_marca_preferida_required;

alter table public.cases
  add constraint cases_marca_preferida_required
  check (marca_preferida is not null and length(trim(marca_preferida)) > 0)
  not valid;
