begin;

-- Objetivo: un "interno" debe poder ver TODO el catálogo de clientes del workspace.
-- Regla de seguridad: seguimos sin policies abiertas (no using(true)).
-- Nota: el filtrado para "externo" se maneja en la UI (customers visibles según casos),
-- mientras que los casos siguen restringidos por marca_preferida en RLS.

drop policy if exists customers_select on public.customers;

create policy customers_select on public.customers
  for select
  using (
    public.is_admin()
    or public.user_has_workspace_role(customers.workspace_id, array['gerente','interno','externo'])
  );

commit;

