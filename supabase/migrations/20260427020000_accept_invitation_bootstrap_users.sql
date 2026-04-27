create or replace function public.accept_workspace_invitation(token text)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  member_row public.workspace_members%rowtype;
  current_user_id uuid;
  auth_user_email text;
begin
  select id into current_user_id
  from public.users
  where auth_user_id = auth.uid();

  if current_user_id is null then
    select email into auth_user_email
    from auth.users
    where id = auth.uid();

    if auth_user_email is null then
      raise exception 'No auth user encontrado para auth.uid()';
    end if;

    insert into public.users (auth_user_id, nombre, email, rol, activo)
    values (
      auth.uid(),
      split_part(auth_user_email, '@', 1),
      auth_user_email,
      'user',
      true
    )
    returning id into current_user_id;
  end if;

  select * into member_row
  from public.workspace_members
  where invitation_token = token
    and joined_at is null
    and (invitation_expires_at is null or invitation_expires_at > now())
  limit 1;

  if member_row.id is null then
    raise exception 'Token de invitacion invalido o expirado';
  end if;

  update public.workspace_members
  set user_id = current_user_id,
      joined_at = now(),
      invitation_token = null,
      invitation_expires_at = null,
      activo = true
  where id = member_row.id;

  update public.case_shares
  set shared_with_member_id = member_row.id
  where lower(shared_with_email) = lower(member_row.email)
    and shared_with_member_id is null
    and revoked_at is null;

  return member_row.id;
end;
$$;
