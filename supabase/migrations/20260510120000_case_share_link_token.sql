begin;

-- Enlace copiable para compartir un caso: token opaco por fila en case_shares.
-- Tras iniciar sesión, el invitado abre /app/caso/compartir?t=... y la RPC
-- comprueba que su usuario.users.email coincide con shared_with_email.

alter table public.case_shares
  add column if not exists link_token text;

create unique index if not exists case_shares_link_token_uniq
  on public.case_shares (link_token)
  where link_token is not null;

create or replace function public.resolve_share_link_access(token_input text)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  cid uuid;
  em text;
begin
  if token_input is null or length(trim(token_input)) < 16 then
    return null;
  end if;

  if auth.uid() is null then
    return null;
  end if;

  select cs.case_id, cs.shared_with_email
  into cid, em
  from public.case_shares cs
  where cs.link_token = token_input
    and cs.revoked_at is null
  limit 1;

  if cid is null or em is null then
    return null;
  end if;

  if not exists (
    select 1
    from public.users u
    where u.auth_user_id = auth.uid()
      and lower(u.email) = lower(em)
  ) then
    return null;
  end if;

  return cid;
end;
$$;

grant execute on function public.resolve_share_link_access(text) to authenticated;

commit;
