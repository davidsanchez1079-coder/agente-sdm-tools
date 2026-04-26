-- Agente SDM Tools
-- Fase: customers como ciudadano de primera clase
--
-- Crea la tabla `customers` workspace-scoped con catálogo cerrado de
-- estados de México y campos para ciudad, segmento, estatus, notas y
-- potencial mensual objetivo en USD.
--
-- Backfill controlado:
--   1. Catálogo hardcoded actual (7 clientes) → un INSERT por cada
--      workspace existente, con segmento/estatus/notas que ya teníamos
--      en CUSTOMERS de TS. Una INSERT por cliente (en lugar de
--      CROSS JOIN VALUES) porque el editor SQL de Supabase rechazó la
--      forma con VALUES — esta es más portable.
--   2. Cualquier `cases.cliente` distinto (por workspace, vía folder)
--      que no quede ya cubierto por el catálogo → registro mínimo.
--      Estos clientes ya están en uso real en casos, así que se
--      promueven al catálogo automáticamente sin pedir decisión.
--   3. `folders.nombre` que NO sea cliente NO se promueve automáticamente.
--      Esos quedan para revisión manual: ver script en
--      `supabase/audits/legacy_folders.sql`.
--
-- RLS: mismo patrón que message_attachments — un usuario ve/edita solo
-- los customers cuyo workspace_id pertenece a su user_id (vía
-- workspaces.user_id → users.id), o si es admin.
--
-- Sin `begin/commit` explícito. Cada statement en su propia
-- auto-transacción para que cualquier error se vea aislado en el panel
-- de resultados. Todas idempotentes (`if not exists`, `drop ... if exists`,
-- `on conflict do nothing`).

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  label text not null,
  estado text,
  ciudad text,
  segmento text,
  estatus text not null default 'activo',
  notas text,
  potencial_mensual_usd numeric(12,2),
  created_at timestamptz not null default now()
);

alter table public.customers
  drop constraint if exists customers_estatus_check;
alter table public.customers
  add constraint customers_estatus_check
  check (estatus in ('activo','prospecto','inactivo','pausado'));

alter table public.customers
  drop constraint if exists customers_estado_check;
alter table public.customers
  add constraint customers_estado_check
  check (estado is null or estado in (
    'Aguascalientes','Baja California','Baja California Sur','Campeche',
    'Chiapas','Chihuahua','Ciudad de México','Coahuila','Colima',
    'Durango','Guanajuato','Guerrero','Hidalgo','Jalisco','México',
    'Michoacán','Morelos','Nayarit','Nuevo León','Oaxaca','Puebla',
    'Querétaro','Quintana Roo','San Luis Potosí','Sinaloa','Sonora',
    'Tabasco','Tamaulipas','Tlaxcala','Veracruz','Yucatán','Zacatecas'
  ));

alter table public.customers
  drop constraint if exists customers_potencial_check;
alter table public.customers
  add constraint customers_potencial_check
  check (potencial_mensual_usd is null or potencial_mensual_usd >= 0);

create unique index if not exists customers_workspace_label_uniq
  on public.customers (workspace_id, lower(label));

create index if not exists customers_workspace_idx
  on public.customers(workspace_id);

alter table public.customers enable row level security;

-- Cuatro policies explícitas en lugar de FOR ALL. La policy original
-- con FOR ALL + WITH CHECK referenciando `customers.workspace_id`
-- rechazaba INSERT con 42501, posiblemente por cómo PG resuelve la
-- referencia a la fila nueva en ese caso. Con policies separadas y
-- columna pelada `workspace_id` (sin prefijo) en WITH CHECK la
-- evaluación es inequívoca contra la fila propuesta.
drop policy if exists customers_owner_or_admin on public.customers;
drop policy if exists customers_owner_select on public.customers;
drop policy if exists customers_owner_insert on public.customers;
drop policy if exists customers_owner_update on public.customers;
drop policy if exists customers_owner_delete on public.customers;

create policy customers_owner_select on public.customers
  for select
  using (
    public.is_admin()
    or exists (
      select 1
      from public.workspaces w
      join public.users u on u.id = w.user_id
      where w.id = customers.workspace_id
        and u.auth_user_id = auth.uid()
    )
  );

create policy customers_owner_insert on public.customers
  for insert
  with check (
    public.is_admin()
    or exists (
      select 1
      from public.workspaces w
      join public.users u on u.id = w.user_id
      where w.id = workspace_id
        and u.auth_user_id = auth.uid()
    )
  );

create policy customers_owner_update on public.customers
  for update
  using (
    public.is_admin()
    or exists (
      select 1
      from public.workspaces w
      join public.users u on u.id = w.user_id
      where w.id = customers.workspace_id
        and u.auth_user_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1
      from public.workspaces w
      join public.users u on u.id = w.user_id
      where w.id = workspace_id
        and u.auth_user_id = auth.uid()
    )
  );

create policy customers_owner_delete on public.customers
  for delete
  using (
    public.is_admin()
    or exists (
      select 1
      from public.workspaces w
      join public.users u on u.id = w.user_id
      where w.id = customers.workspace_id
        and u.auth_user_id = auth.uid()
    )
  );

insert into public.customers (workspace_id, label, segmento, estatus, notas)
select w.id, 'PCNC', 'Industrial', 'activo', 'Cliente industrial relevante para seguimiento técnico y comercial.'
from public.workspaces w
on conflict (workspace_id, lower(label)) do nothing;

insert into public.customers (workspace_id, label, segmento, estatus, notas)
select w.id, 'Magna', 'Automotriz', 'activo', 'Cliente automotriz. Seguimiento técnico y comercial regular.'
from public.workspaces w
on conflict (workspace_id, lower(label)) do nothing;

insert into public.customers (workspace_id, label, segmento, estatus, notas)
select w.id, 'John Deere', 'Maquinaria / manufactura', 'activo', 'Cliente de maquinaria y manufactura. Seguimiento técnico y comercial.'
from public.workspaces w
on conflict (workspace_id, lower(label)) do nothing;

insert into public.customers (workspace_id, label, segmento, estatus, notas)
select w.id, 'Parker Stratoflex Hannifin', 'Industrial', 'activo', 'Cliente industrial. Seguimiento técnico y comercial estándar.'
from public.workspaces w
on conflict (workspace_id, lower(label)) do nothing;

insert into public.customers (workspace_id, label, segmento, estatus, notas)
select w.id, 'Collado', 'Industrial', 'activo', 'Cliente industrial. Seguimiento comercial regular.'
from public.workspaces w
on conflict (workspace_id, lower(label)) do nothing;

insert into public.customers (workspace_id, label, segmento, estatus, notas)
select w.id, 'Neapco', 'Automotriz / industrial', 'activo', 'Cliente automotriz e industrial. Seguimiento técnico y comercial.'
from public.workspaces w
on conflict (workspace_id, lower(label)) do nothing;

insert into public.customers (workspace_id, label, segmento, estatus, notas)
select w.id, 'Turbomáquinas', 'Energía / industrial', 'activo', 'Cliente del sector energía e industrial. Aplicaciones con atención técnica.'
from public.workspaces w
on conflict (workspace_id, lower(label)) do nothing;

insert into public.customers (workspace_id, label, estatus)
select distinct f.workspace_id, trim(c.cliente), 'activo'
from public.cases c
join public.folders f on f.id = c.folder_id
where c.cliente is not null
  and trim(c.cliente) <> ''
on conflict (workspace_id, lower(label)) do nothing;
