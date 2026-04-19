-- Agente SDM Tools
-- Fase 4: cierre formal + valor potencial del caso
--   - resultado_cierre
--   - requiere_rap
--   - potencial_usd
--
-- Correr en Supabase SQL Editor. Idempotente y atómica:
-- se puede correr una o varias veces sin efectos secundarios.
--
-- resultado_cierre: desenlace del cierre, independiente del estado.
--   valores permitidos: null, exito, parcial, sin_resultado, cancelado
--
-- requiere_rap: bandera booleana. true = el caso requiere Reporte de
-- Ahorros y Productividad (RAP) al cerrarse. Default false.
--
-- potencial_usd: valor potencial del caso en dólares enteros. Opcional.
-- Sirve para priorización. Independiente del flag RAP y del cierre.

begin;

-- 1) Columna resultado_cierre, nullable con CHECK.
alter table public.cases
add column if not exists resultado_cierre text;

alter table public.cases
drop constraint if exists cases_resultado_cierre_check;

alter table public.cases
add constraint cases_resultado_cierre_check
check (
  resultado_cierre is null
  or resultado_cierre in ('exito', 'parcial', 'sin_resultado', 'cancelado')
);

-- 2) Columna requiere_rap, booleana not null con default false.
alter table public.cases
add column if not exists requiere_rap boolean not null default false;

-- 3) Columna potencial_usd, integer nullable con CHECK >= 0.
alter table public.cases
add column if not exists potencial_usd integer;

alter table public.cases
drop constraint if exists cases_potencial_usd_check;

alter table public.cases
add constraint cases_potencial_usd_check
check (potencial_usd is null or potencial_usd >= 0);

commit;
