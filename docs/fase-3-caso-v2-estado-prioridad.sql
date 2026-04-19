-- Agente SDM Tools
-- Fase 3: Caso v2 — nuevo enum de estado, prioridad, siguiente_accion, resumen_ejecutivo
--
-- Correr en Supabase SQL Editor. Todo el script es idempotente:
-- se puede correr una o varias veces sin efectos secundarios.
--
-- Los datos existentes con valores viejos de estado se migran automáticamente:
--   en_prueba        -> en_proceso
--   cerrado_exito    -> cerrado
--   cerrado_sin_exito-> cerrado
--   cerrado_sin_datos-> cerrado

begin;

-- 1) Migrar valores viejos de cases.estado al nuevo vocabulario.
update public.cases
set estado = 'en_proceso'
where estado = 'en_prueba';

update public.cases
set estado = 'cerrado'
where estado in ('cerrado_exito', 'cerrado_sin_exito', 'cerrado_sin_datos');

-- 2) Reemplazar el CHECK de cases.estado.
alter table public.cases
drop constraint if exists cases_estado_check;

alter table public.cases
add constraint cases_estado_check
check (estado in ('abierto', 'en_proceso', 'detenido', 'cerrado'));

-- 3) Agregar columna prioridad con default 'media' y CHECK.
alter table public.cases
add column if not exists prioridad text not null default 'media';

alter table public.cases
drop constraint if exists cases_prioridad_check;

alter table public.cases
add constraint cases_prioridad_check
check (prioridad in ('baja', 'media', 'alta', 'crítica'));

-- 4) Agregar columnas de texto libre.
alter table public.cases
add column if not exists siguiente_accion text;

alter table public.cases
add column if not exists resumen_ejecutivo text;

commit;
