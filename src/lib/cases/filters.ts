import { BRANDS, type BrandId } from "@/lib/brands/brands";
import { CUSTOMERS, type CustomerId } from "@/lib/customers/customers";
import type { CaseRow } from "@/lib/workspace/folders";
import { operacionTipoLabel } from "./cases";
import type { CaseEstado, CasePrioridad } from "./cases";

const VALID_ESTADOS: CaseEstado[] = [
  "abierto",
  "en_proceso",
  "detenido",
  "cerrado",
];

const VALID_PRIORIDADES: CasePrioridad[] = [
  "baja",
  "media",
  "alta",
  "crítica",
];

const VALID_BRAND_IDS: BrandId[] = BRANDS.filter(
  (brand) => brand.id !== "general",
).map((brand) => brand.id);

const VALID_CUSTOMER_IDS: CustomerId[] = CUSTOMERS.map((customer) => customer.id);

export type RapFilter = "all" | "yes" | "no";

export type SortKey = "recent" | "potencial" | "prioridad";

export type CaseFilters = {
  q: string;
  estados: CaseEstado[];
  prioridades: CasePrioridad[];
  clientes: CustomerId[];
  fabricantes: BrandId[];
  rap: RapFilter;
  sort: SortKey;
};

const PRIORIDAD_ORDER: Record<CasePrioridad, number> = {
  "crítica": 0,
  alta: 1,
  media: 2,
  baja: 3,
};

export const EMPTY_FILTERS: CaseFilters = {
  q: "",
  estados: [],
  prioridades: [],
  clientes: [],
  fabricantes: [],
  rap: "all",
  sort: "recent",
};

function splitList(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function parseFiltersFromParams(
  params: URLSearchParams,
): CaseFilters {
  const estados = splitList(params.get("estado")).filter(
    (value): value is CaseEstado =>
      VALID_ESTADOS.includes(value as CaseEstado),
  );
  const prioridades = splitList(params.get("prioridad")).filter(
    (value): value is CasePrioridad =>
      VALID_PRIORIDADES.includes(value as CasePrioridad),
  );
  const clientes = splitList(params.get("cliente")).filter(
    (value): value is CustomerId =>
      VALID_CUSTOMER_IDS.includes(value as CustomerId),
  );
  const fabricantes = splitList(params.get("fabricante")).filter(
    (value): value is BrandId =>
      VALID_BRAND_IDS.includes(value as BrandId),
  );

  const rapRaw = params.get("rap");
  const rap: RapFilter =
    rapRaw === "yes" || rapRaw === "no" ? rapRaw : "all";

  const sortRaw = params.get("sort");
  const sort: SortKey =
    sortRaw === "potencial" || sortRaw === "prioridad"
      ? sortRaw
      : "recent";

  return {
    q: (params.get("q") ?? "").trim(),
    estados,
    prioridades,
    clientes,
    fabricantes,
    rap,
    sort,
  };
}

export function serializeFiltersToParams(
  filters: CaseFilters,
  base?: URLSearchParams,
): URLSearchParams {
  const params = new URLSearchParams(base ? base.toString() : "");

  if (filters.q.trim()) params.set("q", filters.q.trim());
  else params.delete("q");

  if (filters.estados.length) params.set("estado", filters.estados.join(","));
  else params.delete("estado");

  if (filters.prioridades.length)
    params.set("prioridad", filters.prioridades.join(","));
  else params.delete("prioridad");

  if (filters.clientes.length)
    params.set("cliente", filters.clientes.join(","));
  else params.delete("cliente");

  if (filters.fabricantes.length)
    params.set("fabricante", filters.fabricantes.join(","));
  else params.delete("fabricante");

  if (filters.rap !== "all") params.set("rap", filters.rap);
  else params.delete("rap");

  if (filters.sort !== "recent") params.set("sort", filters.sort);
  else params.delete("sort");

  return params;
}

export function countActivePanelFilters(filters: CaseFilters): number {
  return (
    filters.estados.length +
    filters.prioridades.length +
    filters.clientes.length +
    filters.fabricantes.length +
    (filters.rap !== "all" ? 1 : 0)
  );
}

export function hasAnyFilterOrQuery(filters: CaseFilters): boolean {
  return filters.q.trim() !== "" || countActivePanelFilters(filters) > 0;
}

function matchesSearch(row: CaseRow, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  const fields: (string | null)[] = [
    row.titulo,
    row.cliente,
    row.operacion_tipo ? operacionTipoLabel(row.operacion_tipo) : null,
    row.operacion,
    row.material,
    row.maquina,
    row.siguiente_accion,
    row.resumen_ejecutivo,
  ];
  return fields.some(
    (field) => field != null && field.toLowerCase().includes(needle),
  );
}

function clienteLabelsFromIds(ids: CustomerId[]): Set<string> {
  const labels = new Set<string>();
  for (const id of ids) {
    const customer = CUSTOMERS.find((c) => c.id === id);
    if (customer) labels.add(customer.label.toLowerCase());
  }
  return labels;
}

function brandMatches(
  marcaPreferida: string | null,
  fabricantes: BrandId[],
): boolean {
  if (!marcaPreferida) return false;
  const normalized = marcaPreferida.trim().toLowerCase();
  return fabricantes.some((id) => {
    if (id === normalized) return true;
    const brand = BRANDS.find((b) => b.id === id);
    return brand ? brand.label.toLowerCase() === normalized : false;
  });
}

export function applyFilters(
  rows: CaseRow[],
  filters: CaseFilters,
): CaseRow[] {
  const clienteLabels = clienteLabelsFromIds(filters.clientes);

  return rows.filter((row) => {
    if (filters.estados.length && !filters.estados.includes(row.estado))
      return false;
    if (
      filters.prioridades.length &&
      !filters.prioridades.includes(row.prioridad)
    )
      return false;
    if (filters.clientes.length) {
      if (!row.cliente) return false;
      if (!clienteLabels.has(row.cliente.trim().toLowerCase())) return false;
    }
    if (
      filters.fabricantes.length &&
      !brandMatches(row.marca_preferida, filters.fabricantes)
    )
      return false;
    if (filters.rap === "yes" && !row.requiere_rap) return false;
    if (filters.rap === "no" && row.requiere_rap) return false;
    if (filters.q.trim() && !matchesSearch(row, filters.q.trim().toLowerCase()))
      return false;
    return true;
  });
}

export function sortCases(rows: CaseRow[], sort: SortKey): CaseRow[] {
  const copy = [...rows];
  switch (sort) {
    case "potencial":
      return copy.sort((a, b) => {
        const av = a.potencial_usd ?? -1;
        const bv = b.potencial_usd ?? -1;
        if (bv !== av) return bv - av;
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });
    case "prioridad":
      return copy.sort((a, b) => {
        const diff =
          PRIORIDAD_ORDER[a.prioridad] - PRIORIDAD_ORDER[b.prioridad];
        if (diff !== 0) return diff;
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });
    case "recent":
    default:
      return copy.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
  }
}

export const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: "recent", label: "Más recientes" },
  { id: "potencial", label: "Mayor potencial USD" },
  { id: "prioridad", label: "Prioridad crítica primero" },
];
