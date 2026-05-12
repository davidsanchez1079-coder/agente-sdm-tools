-- Retira case_secondary_users: el producto usa solo case_shares para colaboradores.
-- Idempotente: seguro si la tabla no existe (entornos nuevos sin migraciones previas).

drop table if exists public.case_secondary_users cascade;
