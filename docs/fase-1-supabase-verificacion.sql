-- Verificación posterior a la aplicación del esquema
-- Correr estas consultas en Supabase SQL Editor

-- 1) Verificar extensiones
select extname
from pg_extension
where extname in ('vector', 'pgcrypto')
order by extname;

-- 2) Verificar tablas creadas
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'users',
    'workspaces',
    'folders',
    'cases',
    'messages',
    'attachments',
    'test_results',
    'brands',
    'indexed_chunks',
    'agent_queries',
    'share_events'
  )
order by table_name;

-- 3) Verificar columnas vector
select table_name, column_name, udt_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'indexed_chunks'
order by ordinal_position;

-- 4) Verificar RLS activa
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'users',
    'workspaces',
    'folders',
    'cases',
    'messages',
    'attachments',
    'test_results',
    'brands',
    'indexed_chunks',
    'agent_queries',
    'share_events'
  )
order by tablename;

-- 5) Ver políticas creadas
select schemaname, tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 6) Ver triggers updated_at
select event_object_table as table_name, trigger_name
from information_schema.triggers
where trigger_schema = 'public'
  and event_object_table in ('users', 'cases')
order by event_object_table, trigger_name;

-- 7) Smoke test de lectura simple por tabla
select count(*) as users_count from public.users;
select count(*) as workspaces_count from public.workspaces;
select count(*) as folders_count from public.folders;
select count(*) as cases_count from public.cases;
select count(*) as messages_count from public.messages;
select count(*) as attachments_count from public.attachments;
select count(*) as test_results_count from public.test_results;
select count(*) as brands_count from public.brands;
select count(*) as indexed_chunks_count from public.indexed_chunks;
select count(*) as agent_queries_count from public.agent_queries;
select count(*) as share_events_count from public.share_events;
