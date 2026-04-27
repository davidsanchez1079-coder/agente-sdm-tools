alter table public.cases
  add column if not exists conversion_nivel text not null default 'media';

alter table public.cases
  drop constraint if exists cases_conversion_nivel_check;

alter table public.cases
  add constraint cases_conversion_nivel_check
  check (conversion_nivel in ('alta', 'media', 'baja'));
