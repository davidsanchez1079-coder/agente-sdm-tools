-- Audit: carpetas existentes que NO corresponden a un cliente actual.
--
-- No es una migración. Es una consulta de revisión que debes correr
-- después de aplicar el migration de customers para decidir caso por
-- caso qué hacer con carpetas legacy que no son clientes.
--
-- Uso:
--   1. Aplica primero la migración de customers.
--   2. Corre esta consulta en SQL Editor de Supabase.
--   3. Revisa el resultado fila por fila. Para cada folder:
--      a) Si el nombre representa un cliente real → INSERT manual en
--         customers con `label = folder.nombre`, `estado` y `ciudad`
--         apropiados. Después edita las filas de `cases` que apuntan
--         a ese folder para que `cliente = folder.nombre` (si todavía
--         no lo tienen).
--      b) Si el nombre NO es un cliente (e.g. "Pendientes Q2",
--         "Casos urgentes") → decide si quieres conservar el folder
--         como organización interna (PR2 lo oculta de UI pero lo
--         deja vivo) o borrarlo manualmente desde el panel de carpetas
--         antes de que PR2 lo oculte.
--
-- La consulta lista cada folder con su workspace, su contenido
-- (cantidad de casos) y si ya existe un customer con ese mismo label.

select
  w.id as workspace_id,
  f.id as folder_id,
  f.nombre as folder_nombre,
  count(c.id) as cases_count,
  exists (
    select 1 from public.customers cust
    where cust.workspace_id = w.id
      and lower(cust.label) = lower(f.nombre)
  ) as ya_es_customer
from public.folders f
join public.workspaces w on w.id = f.workspace_id
left join public.cases c on c.folder_id = f.id
group by w.id, f.id, f.nombre
order by w.id, f.nombre;
