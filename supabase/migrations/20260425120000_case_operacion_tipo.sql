-- Catálogo cerrado para el tipo de operación del caso.
-- Convive con la columna `operacion` (descripción libre) ya existente.
-- Idempotente: se puede correr varias veces sin romper.

alter table public.cases
  add column if not exists operacion_tipo text;

alter table public.cases
  drop constraint if exists cases_operacion_tipo_check;

alter table public.cases
  add constraint cases_operacion_tipo_check
  check (
    operacion_tipo is null
    or operacion_tipo in (
      'torneado',
      'fresado',
      'taladrado',
      'ranurado',
      'roscado',
      'portaherramientas',
      'otro'
    )
  );
