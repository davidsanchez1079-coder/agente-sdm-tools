-- Agente SDM Tools
-- Fase 1: propuesta de esquema SQL para revisión
-- No aplicar hasta aprobación explícita

create extension if not exists vector;
create extension if not exists pgcrypto;

create table public.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  nombre text not null,
  apellido text,
  email text not null unique,
  telefono text,
  rol text not null default 'user' check (rol in ('admin','user')),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.folders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  parent_folder_id uuid references public.folders(id) on delete cascade,
  nombre text not null,
  created_at timestamptz not null default now(),
  constraint folders_max_two_levels check (id is not null)
);

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid not null references public.folders(id) on delete cascade,
  titulo text not null,
  cliente text,
  operacion text,
  material text,
  maquina text,
  marca_preferida text,
  estado text not null default 'abierto' check (
    estado in (
      'abierto',
      'en_proceso',
      'detenido',
      'cerrado'
    )
  ),
  prioridad text not null default 'media' check (
    prioridad in ('baja', 'media', 'alta', 'crítica')
  ),
  siguiente_accion text,
  resumen_ejecutivo text,
  shared_from_case_id uuid references public.cases(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  author text not null check (author in ('user','agent')),
  content text not null,
  mode_used text not null check (mode_used in ('general','sandvik','vargus','korloy','dormer','amec')),
  tokens_input integer not null default 0,
  tokens_output integer not null default 0,
  cost_usd numeric(12,6) not null default 0,
  created_at timestamptz not null default now()
);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  file_url text not null,
  file_type text not null check (file_type in ('image','pdf','other')),
  filename text not null,
  size_bytes bigint,
  analyzed_by_ai boolean not null default false,
  user_prompt text,
  created_at timestamptz not null default now()
);

create table public.test_results (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null unique references public.cases(id) on delete cascade,
  worked text not null check (worked in ('yes','partial','no')),
  final_parameters text,
  notes text,
  registered_at timestamptz not null default now()
);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  status text not null check (status in ('indexed','coming_soon')),
  created_at timestamptz not null default now()
);

create table public.indexed_chunks (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  family text,
  operation text,
  material_iso text,
  page integer,
  version text,
  content text not null,
  embedding vector(3072),
  created_at timestamptz not null default now()
);

create table public.agent_queries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  case_id uuid references public.cases(id) on delete set null,
  message_id uuid references public.messages(id) on delete set null,
  mode text not null check (mode in ('general','sandvik','vargus','korloy','dormer','amec')),
  response_time_ms integer,
  cost_usd numeric(12,6) not null default 0,
  sources_cited jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table public.share_events (
  id uuid primary key default gen_random_uuid(),
  sender_case_id uuid not null references public.cases(id) on delete cascade,
  receiver_case_id uuid not null references public.cases(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  receiver_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index idx_users_auth_user_id on public.users(auth_user_id);
create index idx_users_email on public.users(email);
create index idx_workspaces_user_id on public.workspaces(user_id);
create index idx_folders_workspace_id on public.folders(workspace_id);
create index idx_folders_parent_folder_id on public.folders(parent_folder_id);
create index idx_cases_folder_id on public.cases(folder_id);
create index idx_cases_estado on public.cases(estado);
create index idx_cases_cliente on public.cases(cliente);
create index idx_messages_case_id on public.messages(case_id);
create index idx_messages_created_at on public.messages(created_at);
create index idx_attachments_case_id on public.attachments(case_id);
create index idx_test_results_case_id on public.test_results(case_id);
create index idx_brands_nombre on public.brands(nombre);
create index idx_indexed_chunks_brand_id on public.indexed_chunks(brand_id);
create index idx_indexed_chunks_family on public.indexed_chunks(family);
create index idx_indexed_chunks_operation on public.indexed_chunks(operation);
create index idx_indexed_chunks_material_iso on public.indexed_chunks(material_iso);
create index idx_agent_queries_user_id on public.agent_queries(user_id);
create index idx_agent_queries_case_id on public.agent_queries(case_id);
create index idx_share_events_sender_id on public.share_events(sender_id);
create index idx_share_events_receiver_id on public.share_events(receiver_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

create trigger trg_cases_updated_at
before update on public.cases
for each row execute function public.set_updated_at();

alter table public.users enable row level security;
alter table public.workspaces enable row level security;
alter table public.folders enable row level security;
alter table public.cases enable row level security;
alter table public.messages enable row level security;
alter table public.attachments enable row level security;
alter table public.test_results enable row level security;
alter table public.brands enable row level security;
alter table public.indexed_chunks enable row level security;
alter table public.agent_queries enable row level security;
alter table public.share_events enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.users u
    where u.auth_user_id = auth.uid() and u.rol = 'admin' and u.activo = true
  );
$$;

create policy users_select_self_or_admin on public.users
for select
using (auth.uid() = auth_user_id or public.is_admin());

create policy users_update_self_or_admin on public.users
for update
using (auth.uid() = auth_user_id or public.is_admin())
with check (auth.uid() = auth_user_id or public.is_admin());

create policy workspaces_select_owner_or_admin on public.workspaces
for select
using (
  exists (
    select 1 from public.users u
    where u.id = workspaces.user_id and (u.auth_user_id = auth.uid() or public.is_admin())
  )
);

create policy folders_select_owner_or_admin on public.folders
for select
using (
  exists (
    select 1
    from public.workspaces w
    join public.users u on u.id = w.user_id
    where w.id = folders.workspace_id and (u.auth_user_id = auth.uid() or public.is_admin())
  )
);

create policy folders_modify_owner_or_admin on public.folders
for all
using (
  exists (
    select 1
    from public.workspaces w
    join public.users u on u.id = w.user_id
    where w.id = folders.workspace_id and (u.auth_user_id = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1
    from public.workspaces w
    join public.users u on u.id = w.user_id
    where w.id = folders.workspace_id and (u.auth_user_id = auth.uid() or public.is_admin())
  )
);

create policy cases_owner_or_admin on public.cases
for all
using (
  exists (
    select 1
    from public.folders f
    join public.workspaces w on w.id = f.workspace_id
    join public.users u on u.id = w.user_id
    where f.id = cases.folder_id and (u.auth_user_id = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1
    from public.folders f
    join public.workspaces w on w.id = f.workspace_id
    join public.users u on u.id = w.user_id
    where f.id = cases.folder_id and (u.auth_user_id = auth.uid() or public.is_admin())
  )
);

create policy messages_owner_or_admin on public.messages
for all
using (
  exists (
    select 1
    from public.cases c
    join public.folders f on f.id = c.folder_id
    join public.workspaces w on w.id = f.workspace_id
    join public.users u on u.id = w.user_id
    where c.id = messages.case_id and (u.auth_user_id = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1
    from public.cases c
    join public.folders f on f.id = c.folder_id
    join public.workspaces w on w.id = f.workspace_id
    join public.users u on u.id = w.user_id
    where c.id = messages.case_id and (u.auth_user_id = auth.uid() or public.is_admin())
  )
);

create policy attachments_owner_or_admin on public.attachments
for all
using (
  exists (
    select 1
    from public.cases c
    join public.folders f on f.id = c.folder_id
    join public.workspaces w on w.id = f.workspace_id
    join public.users u on u.id = w.user_id
    where c.id = attachments.case_id and (u.auth_user_id = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1
    from public.cases c
    join public.folders f on f.id = c.folder_id
    join public.workspaces w on w.id = f.workspace_id
    join public.users u on u.id = w.user_id
    where c.id = attachments.case_id and (u.auth_user_id = auth.uid() or public.is_admin())
  )
);

create policy test_results_owner_or_admin on public.test_results
for all
using (
  exists (
    select 1
    from public.cases c
    join public.folders f on f.id = c.folder_id
    join public.workspaces w on w.id = f.workspace_id
    join public.users u on u.id = w.user_id
    where c.id = test_results.case_id and (u.auth_user_id = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1
    from public.cases c
    join public.folders f on f.id = c.folder_id
    join public.workspaces w on w.id = f.workspace_id
    join public.users u on u.id = w.user_id
    where c.id = test_results.case_id and (u.auth_user_id = auth.uid() or public.is_admin())
  )
);

create policy brands_read_all on public.brands
for select
using (true);

create policy brands_admin_write on public.brands
for all
using (public.is_admin())
with check (public.is_admin());

create policy indexed_chunks_read_all on public.indexed_chunks
for select
using (true);

create policy indexed_chunks_admin_write on public.indexed_chunks
for all
using (public.is_admin())
with check (public.is_admin());

create policy agent_queries_owner_or_admin on public.agent_queries
for select
using (
  exists (
    select 1 from public.users u
    where u.id = agent_queries.user_id and (u.auth_user_id = auth.uid() or public.is_admin())
  )
);

create policy agent_queries_insert_owner_or_admin on public.agent_queries
for insert
with check (
  exists (
    select 1 from public.users u
    where u.id = agent_queries.user_id and (u.auth_user_id = auth.uid() or public.is_admin())
  )
);

create policy share_events_owner_or_admin on public.share_events
for select
using (
  exists (
    select 1 from public.users u
    where (u.id = share_events.sender_id or u.id = share_events.receiver_id)
      and (u.auth_user_id = auth.uid() or public.is_admin())
  )
);

create policy share_events_insert_owner_or_admin on public.share_events
for insert
with check (
  exists (
    select 1 from public.users u
    where u.id = share_events.sender_id and (u.auth_user_id = auth.uid() or public.is_admin())
  )
);
