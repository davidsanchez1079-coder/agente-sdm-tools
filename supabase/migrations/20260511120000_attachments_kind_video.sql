-- Permitir adjuntos de video informativos (mp4/mov) en kind.
alter table public.attachments
  drop constraint if exists attachments_kind_check;

alter table public.attachments
  add constraint attachments_kind_check
  check (kind in ('image', 'pdf', 'video', 'other'));
