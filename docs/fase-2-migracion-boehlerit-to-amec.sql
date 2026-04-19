-- Agente SDM Tools
-- Fase 2: migración Boehlerit → Amec
--
-- Correr en Supabase SQL Editor SOLO si ya aplicaste el esquema de fase 1
-- con el CHECK constraint que aceptaba 'boehlerit'. Si el esquema todavía
-- no está desplegado (los CHECK aún no existen en la base), no es necesario
-- correr este archivo: el esquema ya viene con 'amec' en fase 1.

-- 1) Normalizar cualquier registro previo que haya quedado en modo boehlerit.
update public.messages
set mode_used = 'amec'
where mode_used = 'boehlerit';

update public.agent_queries
set mode = 'amec'
where mode = 'boehlerit';

-- 2) Reemplazar el CHECK constraint de messages.mode_used.
alter table public.messages
drop constraint if exists messages_mode_used_check;

alter table public.messages
add constraint messages_mode_used_check
check (
  mode_used in (
    'general',
    'sandvik',
    'vargus',
    'korloy',
    'dormer',
    'amec'
  )
);

-- 3) Reemplazar el CHECK constraint de agent_queries.mode.
alter table public.agent_queries
drop constraint if exists agent_queries_mode_check;

alter table public.agent_queries
add constraint agent_queries_mode_check
check (
  mode in (
    'general',
    'sandvik',
    'vargus',
    'korloy',
    'dormer',
    'amec'
  )
);

-- 4) Actualizar la fila de brands si Boehlerit ya existía como catálogo.
update public.brands
set nombre = 'Amec'
where nombre = 'Boehlerit';
