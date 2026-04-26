-- GOTIA — PR-A: schema de permisos
-- Roles, invitaciones, marcas asignadas, compartición puntual de cases.
--
-- IMPORTANTE: este migration NO toca RLS de tablas existentes (cases,
-- customers, agentes, folders, messages, attachments). Esas se
-- reescriben en PR-D, que es el corte crítico documentado.
--
-- Backfill al final: cada workspace owner actual queda como gerente
-- activo en su propio workspace.
--
-- Idempotente. Sin begin/commit explícito (cada statement en su propia
-- transacción para que cualquier error se vea aislado en SQL Editor).

-- ============================================================
-- workspace_members: membresía de cada persona en cada workspace
-- ============================================================

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  email text not null,
  rol text not null,
  activo boolean not null default true,
  invited_by uuid references public.users(id) on delete set null,
  invited_at timestamptz not null default now(),
  joined_at timestamptz,
  invitation_token text,
  invitation_expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.workspace_members
  drop constraint if exists workspace_members_rol_check;
alter table public.workspace_members
  add constraint workspace_members_rol_check
  check (rol in ('gerente','interno','externo'));

create unique index if not exists workspace_members_workspace_email_uniq
  on public.workspace_members (workspace_id, lower(email));

create index if not exists workspace_members_workspace_idx
  on public.workspace_members (workspace_id);

create index if not exists workspace_members_user_idx
  on public.workspace_members (user_id);

create index if not exists workspace_members_token_idx
  on public.workspace_members (invitation_token)
  where invitation_token is not null;

-- ============================================================
-- workspace_member_brands: marcas asignadas a cada externo
-- ============================================================

create table if not exists public.workspace_member_brands (
  member_id uuid not null references public.workspace_members(id) on delete cascade,
  brand_id text not null,
  created_at timestamptz not null default now(),
  primary key (member_id, brand_id)
);

create index if not exists workspace_member_brands_member_idx
  on public.workspace_member_brands (member_id);

create index if not exists workspace_member_brands_brand_idx
  on public.workspace_member_brands (brand_id);

-- ============================================================
-- case_shares: compartición puntual de un caso a un correo
-- ============================================================

create table if not exists public.case_shares (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  shared_with_email text not null,
  shared_with_member_id uuid references public.workspace_members(id) on delete cascade,
  shared_by uuid references public.users(id) on delete set null,
  shared_at timestamptz not null default now(),
  revoked_at timestamptz
);

create unique index if not exists case_shares_case_email_uniq
  on public.case_shares (case_id, lower(shared_with_email));

create index if not exists case_shares_case_idx
  on public.case_shares (case_id);

create index if not exists case_shares_member_idx
  on public.case_shares (shared_with_member_id);

create index if not exists case_shares_active_idx
  on public.case_shares (case_id)
  where revoked_at is null;

-- ============================================================
-- Helpers SQL — usadas por RLS de PR-D y por la app
-- ============================================================

-- True si el auth user actual es member activo del workspace con
-- alguno de los roles dados. Stable + security invoker para respetar
-- el contexto del caller.
create or replace function public.user_has_workspace_role(
  ws_id uuid,
  roles text[]
) returns boolean
language sql
stable
security invoker
as $$
  select exists (
    select 1
    from public.workspace_members m
    join public.users u on u.id = m.user_id
    where m.workspace_id = ws_id
      and m.user_id is not null
      and m.activo = true
      and u.auth_user_id = auth.uid()
      and m.rol = any(roles)
  );
$$;

-- Set de brand_ids asignados al auth user actual como externo en el
-- workspace. Vacío si no es externo.
create or replace function public.user_brand_ids_for_workspace(
  ws_id uuid
) returns setof text
language sql
stable
security invoker
as $$
  select b.brand_id
  from public.workspace_member_brands b
  join public.workspace_members m on m.id = b.member_id
  join public.users u on u.id = m.user_id
  where m.workspace_id = ws_id
    and m.activo = true
    and m.rol = 'externo'
    and u.auth_user_id = auth.uid();
$$;

-- ============================================================
-- Función de aceptación de invitación (SECURITY DEFINER)
-- Bypassa RLS porque el invitee aún no es member visible para sí
-- mismo. Valida token y bind contra el users.id del auth.uid() actual.
-- ============================================================

create or replace function public.accept_workspace_invitation(token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  member_row public.workspace_members%rowtype;
  current_user_id uuid;
begin
  select id into current_user_id
  from public.users
  where auth_user_id = auth.uid();

  if current_user_id is null then
    raise exception 'No app user encontrado para auth.uid() actual';
  end if;

  select * into member_row
  from public.workspace_members
  where invitation_token = token
    and joined_at is null
    and (invitation_expires_at is null or invitation_expires_at > now())
  limit 1;

  if member_row.id is null then
    raise exception 'Token de invitación inválido o expirado';
  end if;

  update public.workspace_members
  set user_id = current_user_id,
      joined_at = now(),
      invitation_token = null,
      invitation_expires_at = null,
      activo = true
  where id = member_row.id;

  -- Liga case_shares pendientes que apuntaban al email del invitee.
  update public.case_shares
  set shared_with_member_id = member_row.id
  where lower(shared_with_email) = lower(member_row.email)
    and shared_with_member_id is null
    and revoked_at is null;

  return member_row.id;
end;
$$;

-- ============================================================
-- Función para preview de una invitación por token (read-only).
-- Devuelve los datos básicos de la invitación pendiente para que la
-- página /invitacion/{token} muestre contexto antes del accept.
-- ============================================================

create or replace function public.preview_workspace_invitation(token text)
returns table (
  workspace_id uuid,
  email text,
  rol text,
  invited_at timestamptz,
  invitation_expires_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    workspace_id,
    email,
    rol,
    invited_at,
    invitation_expires_at
  from public.workspace_members
  where invitation_token = token
    and joined_at is null
    and (invitation_expires_at is null or invitation_expires_at > now())
  limit 1;
$$;

-- ============================================================
-- RLS — sobre las tres tablas nuevas
-- ============================================================

alter table public.workspace_members enable row level security;
alter table public.workspace_member_brands enable row level security;
alter table public.case_shares enable row level security;

-- workspace_members
drop policy if exists workspace_members_select on public.workspace_members;
drop policy if exists workspace_members_insert on public.workspace_members;
drop policy if exists workspace_members_update on public.workspace_members;
drop policy if exists workspace_members_delete on public.workspace_members;

create policy workspace_members_select on public.workspace_members
  for select
  using (
    public.is_admin()
    or public.user_has_workspace_role(workspace_members.workspace_id, array['gerente'])
    or (
      workspace_members.user_id is not null
      and exists (
        select 1 from public.users u
        where u.id = workspace_members.user_id
          and u.auth_user_id = auth.uid()
      )
    )
  );

create policy workspace_members_insert on public.workspace_members
  for insert
  with check (
    public.is_admin()
    or public.user_has_workspace_role(workspace_id, array['gerente'])
  );

create policy workspace_members_update on public.workspace_members
  for update
  using (
    public.is_admin()
    or public.user_has_workspace_role(workspace_members.workspace_id, array['gerente'])
  )
  with check (
    public.is_admin()
    or public.user_has_workspace_role(workspace_id, array['gerente'])
  );

create policy workspace_members_delete on public.workspace_members
  for delete
  using (
    public.is_admin()
    or public.user_has_workspace_role(workspace_members.workspace_id, array['gerente'])
  );

-- workspace_member_brands
drop policy if exists workspace_member_brands_select on public.workspace_member_brands;
drop policy if exists workspace_member_brands_insert on public.workspace_member_brands;
drop policy if exists workspace_member_brands_update on public.workspace_member_brands;
drop policy if exists workspace_member_brands_delete on public.workspace_member_brands;

create policy workspace_member_brands_select on public.workspace_member_brands
  for select
  using (
    public.is_admin()
    or exists (
      select 1
      from public.workspace_members m
      where m.id = workspace_member_brands.member_id
        and (
          public.user_has_workspace_role(m.workspace_id, array['gerente'])
          or (
            m.user_id is not null
            and exists (
              select 1 from public.users u
              where u.id = m.user_id and u.auth_user_id = auth.uid()
            )
          )
        )
    )
  );

create policy workspace_member_brands_insert on public.workspace_member_brands
  for insert
  with check (
    public.is_admin()
    or exists (
      select 1
      from public.workspace_members m
      where m.id = member_id
        and public.user_has_workspace_role(m.workspace_id, array['gerente'])
    )
  );

create policy workspace_member_brands_update on public.workspace_member_brands
  for update
  using (
    public.is_admin()
    or exists (
      select 1
      from public.workspace_members m
      where m.id = workspace_member_brands.member_id
        and public.user_has_workspace_role(m.workspace_id, array['gerente'])
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1
      from public.workspace_members m
      where m.id = member_id
        and public.user_has_workspace_role(m.workspace_id, array['gerente'])
    )
  );

create policy workspace_member_brands_delete on public.workspace_member_brands
  for delete
  using (
    public.is_admin()
    or exists (
      select 1
      from public.workspace_members m
      where m.id = workspace_member_brands.member_id
        and public.user_has_workspace_role(m.workspace_id, array['gerente'])
    )
  );

-- case_shares
drop policy if exists case_shares_select on public.case_shares;
drop policy if exists case_shares_insert on public.case_shares;
drop policy if exists case_shares_update on public.case_shares;
drop policy if exists case_shares_delete on public.case_shares;

-- SELECT: gerente del workspace del case; quien creó el share; quien recibió el share
create policy case_shares_select on public.case_shares
  for select
  using (
    public.is_admin()
    or exists (
      select 1
      from public.cases c
      join public.folders f on f.id = c.folder_id
      where c.id = case_shares.case_id
        and public.user_has_workspace_role(f.workspace_id, array['gerente'])
    )
    or (
      case_shares.shared_by is not null
      and exists (
        select 1 from public.users u
        where u.id = case_shares.shared_by and u.auth_user_id = auth.uid()
      )
    )
    or (
      case_shares.shared_with_member_id is not null
      and exists (
        select 1
        from public.workspace_members m
        join public.users u on u.id = m.user_id
        where m.id = case_shares.shared_with_member_id
          and u.auth_user_id = auth.uid()
      )
    )
  );

-- INSERT: gerente del workspace del case; o cualquier member activo
-- (interno/gerente) del workspace que creó el case
create policy case_shares_insert on public.case_shares
  for insert
  with check (
    public.is_admin()
    or exists (
      select 1
      from public.cases c
      join public.folders f on f.id = c.folder_id
      where c.id = case_id
        and public.user_has_workspace_role(f.workspace_id, array['gerente','interno'])
    )
  );

-- UPDATE / DELETE: gerente del workspace; o el creador del share
create policy case_shares_update on public.case_shares
  for update
  using (
    public.is_admin()
    or exists (
      select 1
      from public.cases c
      join public.folders f on f.id = c.folder_id
      where c.id = case_shares.case_id
        and public.user_has_workspace_role(f.workspace_id, array['gerente'])
    )
    or (
      case_shares.shared_by is not null
      and exists (
        select 1 from public.users u
        where u.id = case_shares.shared_by and u.auth_user_id = auth.uid()
      )
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1
      from public.cases c
      join public.folders f on f.id = c.folder_id
      where c.id = case_id
        and public.user_has_workspace_role(f.workspace_id, array['gerente'])
    )
    or (
      shared_by is not null
      and exists (
        select 1 from public.users u
        where u.id = shared_by and u.auth_user_id = auth.uid()
      )
    )
  );

create policy case_shares_delete on public.case_shares
  for delete
  using (
    public.is_admin()
    or exists (
      select 1
      from public.cases c
      join public.folders f on f.id = c.folder_id
      where c.id = case_shares.case_id
        and public.user_has_workspace_role(f.workspace_id, array['gerente'])
    )
    or (
      case_shares.shared_by is not null
      and exists (
        select 1 from public.users u
        where u.id = case_shares.shared_by and u.auth_user_id = auth.uid()
      )
    )
  );

-- ============================================================
-- Backfill: cada workspace owner queda como gerente activo
-- ============================================================

insert into public.workspace_members
  (workspace_id, user_id, email, rol, activo, joined_at)
select
  w.id,
  u.id,
  u.email,
  'gerente',
  true,
  now()
from public.workspaces w
join public.users u on u.id = w.user_id
on conflict (workspace_id, lower(email)) do nothing;
