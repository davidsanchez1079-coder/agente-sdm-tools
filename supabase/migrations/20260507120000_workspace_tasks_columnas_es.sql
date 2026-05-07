-- Si workspace_tasks ya existía con columnas en inglés, alinear al dominio en español
-- que usa la app (titulo, descripcion, proximo_seguimiento).

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'workspace_tasks'
      and column_name = 'title'
  )
  and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'workspace_tasks'
      and column_name = 'titulo'
  ) then
    alter table public.workspace_tasks rename column title to titulo;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'workspace_tasks'
      and column_name = 'description'
  )
  and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'workspace_tasks'
      and column_name = 'descripcion'
  ) then
    alter table public.workspace_tasks rename column description to descripcion;
  end if;
end $$;

alter table public.workspace_tasks
  add column if not exists proximo_seguimiento text;
