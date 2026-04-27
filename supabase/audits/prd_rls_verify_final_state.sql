select tablename, policyname, permissive, cmd
from pg_policies
where schemaname = 'public'
  and tablename in (
    'folders','cases','customers','agentes','messages','attachments','message_attachments'
  )
order by tablename, permissive desc, cmd, policyname;

select tablename, count(*) filter (where permissive = 'PERMISSIVE') as permissive_count,
       count(*) filter (where permissive = 'RESTRICTIVE') as restrictive_count
from pg_policies
where schemaname = 'public'
  and tablename in (
    'folders','cases','customers','agentes','messages','attachments','message_attachments'
  )
group by tablename
order by tablename;
