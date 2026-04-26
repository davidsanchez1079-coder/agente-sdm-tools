-- Agente SDM Tools — PR3 follow-up
-- Email opcional en agentes. Sin CHECK de formato — validación en
-- frontend si hace falta. Idempotente.

alter table public.agentes
  add column if not exists email text;
