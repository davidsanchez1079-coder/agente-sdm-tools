create or replace function public.email_has_workspace_membership(email_input text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where lower(email) = lower(email_input)
      and joined_at is not null
  );
$$;
