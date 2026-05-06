-- RLS policies for public.tasks with "owner fallback" behavior.
-- Goal: allow access when the row is owned by auth.uid(), and optionally
-- fall back to created_by when the owner column is NULL.
--
-- This migration is defensive/idempotent:
-- - If public.tasks doesn't exist, it no-ops.
-- - It detects whether the ownership column is owner_id or user_id.
-- - It uses created_by as a fallback only if that column exists.

do $$
declare
  owner_col text;
  fallback_col text;
  using_expr text;
  with_check_expr text;
begin
  if to_regclass('public.tasks') is null then
    raise notice 'Skipping tasks RLS: table public.tasks does not exist.';
    return;
  end if;

  select
    case
      when exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'tasks'
          and column_name = 'owner_id'
      ) then 'owner_id'
      when exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'tasks'
          and column_name = 'user_id'
      ) then 'user_id'
      else null
    end
  into owner_col;

  select
    case
      when exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'tasks'
          and column_name = 'created_by'
      ) then 'created_by'
      else null
    end
  into fallback_col;

  if owner_col is null then
    raise notice 'Skipping tasks RLS: no owner_id/user_id column found on public.tasks.';
    return;
  end if;

  execute 'alter table public.tasks enable row level security';

  -- Make policies predictable by recreating them.
  execute 'drop policy if exists tasks_select_own on public.tasks';
  execute 'drop policy if exists tasks_insert_own on public.tasks';
  execute 'drop policy if exists tasks_update_own on public.tasks';
  execute 'drop policy if exists tasks_delete_own on public.tasks';

  -- Build predicates.
  if fallback_col is not null then
    using_expr :=
      format(
        '(tasks.%1$I = auth.uid()) OR (tasks.%1$I is null AND tasks.%2$I = auth.uid())',
        owner_col,
        fallback_col
      );
    with_check_expr :=
      format(
        '(%1$I = auth.uid()) OR (%1$I is null AND %2$I = auth.uid())',
        owner_col,
        fallback_col
      );
  else
    using_expr := format('(tasks.%1$I = auth.uid())', owner_col);
    with_check_expr := format('(%1$I = auth.uid())', owner_col);
  end if;

  -- Authenticated users can CRUD their own tasks (with optional fallback).
  execute format(
    'create policy tasks_select_own on public.tasks for select to authenticated using (%s)',
    using_expr
  );

  execute format(
    'create policy tasks_insert_own on public.tasks for insert to authenticated with check (%s)',
    with_check_expr
  );

  execute format(
    'create policy tasks_update_own on public.tasks for update to authenticated using (%s) with check (%s)',
    using_expr,
    with_check_expr
  );

  execute format(
    'create policy tasks_delete_own on public.tasks for delete to authenticated using (%s)',
    using_expr
  );

  -- Tighten table privileges: allow authenticated, deny anon.
  execute 'revoke all on table public.tasks from anon';
  execute 'grant select, insert, update, delete on table public.tasks to authenticated';
end
$$;

