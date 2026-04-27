import { BRANDS, type BrandId } from "@/lib/brands/brands";
import type { CaseRow } from "@/lib/workspace/folders";
import { operacionTipoLabel } from "./cases";
import type {
  CaseConversionNivel,
  CaseEstado,
  CasePrioridad,
} from "./cases";

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

const VALID_CONVERSION_NIVELES: CaseConversionNivel[] = [
  "alta",
  "media",
  "baja",
];

const VALID_BRAND_IDS: BrandId[] = BRANDS.filter(
  (brand) => brand.id !== "general",
).map((brand) => brand.id);

export type RapFilter = "all" | "yes" | "no";

export type SortKey = "recent" | "potencial" | "prioridad" | "conversion";

export type CaseFilters = {
  q: string;
  estados: CaseEstado[];
  prioridades: CasePrioridad[];
  conversiones: CaseConversionNivel[];
  // Labels de cliente. Antes era CustomerId[] (enum). Ahora son strings
  // libres porque los clientes viven en BD y se identifican por label
  // case-sensitive en URL (ej. ?cliente=Magna,PCNC). Comparación contra
  // row.cliente es case-insensitive.
  clientes: string[];
  // IDs (uuid) de agentes secundarios. Filtra casos donde
  // cases.secondary_agente_id está en la lista. Vacío = no filtrar.
  agentes: string[];
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

const CONVERSION_ORDER: Record<CaseConversionNivel, number> = {
  alta: 0,
  media: 1,
  baja: 2,
};

export const EMPTY_FILTERS: CaseFilters = {
  q: "",
  estados: [],
  prioridades: [],
  conversiones: [],
  clientes: [],
  agentes: [],
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
  const conversiones = splitList(params.get("conversion")).filter(
    (value): value is CaseConversionNivel =>
      VALID_CONVERSION_NIVELES.includes(value as CaseConversionNivel),
  );
  // Cliente: cualquier label no vacío. La validación contra catálogo
  // real ocurre en case-filters.tsx donde se comparan contra customers
  // cargados de BD.
  const clientes = splitList(params.get("cliente"));
  const agentes = splitList(params.get("agente"));
  const fabricantes = splitList(params.get("fabricante")).filter(
    (value): value is BrandId =>
      VALID_BRAND_IDS.includes(value as BrandId),
  );

  const rapRaw = params.get("rap");
  const rap: RapFilter =
    rapRaw === "yes" || rapRaw === "no" ? rapRaw : "all";

  const sortRaw = params.get("sort");
  const sort: SortKey =
    sortRaw === "potencial" ||
    sortRaw === "prioridad" ||
    sortRaw === "conversion"
      ? sortRaw
      : "recent";

  return {
    q: (params.get("q") ?? "").trim(),
    estados,
    prioridades,
    conversiones,
    clientes,
    agentes,
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

  if (filters.conversiones.length)
    params.set("conversion", filters.conversiones.join(","));
  else params.delete("conversion");

  if (filters.clientes.length)
    params.set("cliente", filters.clientes.join(","));
  else params.delete("cliente");

  if (filters.agentes.length)
    params.set("agente", filters.agentes.join(","));
  else params.delete("agente");

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
    filters.conversiones.length +
    filters.clientes.length +
    filters.agentes.length +
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
  const clienteLabelsLower = new Set(
    filters.clientes.map((label) => label.trim().toLowerCase()),
  );

  const agenteIdsSet = new Set(filters.agentes);

  return rows.filter((row) => {
    if (filters.estados.length && !filters.estados.includes(row.estado))
      return false;
    if (
      filters.prioridades.length &&
      !filters.prioridades.includes(row.prioridad)
    )
      return false;
    if (
      filters.conversiones.length &&
      !filters.conversiones.includes(row.conversion_nivel)
    )
      return false;
    if (clienteLabelsLower.size > 0) {
      if (!row.cliente) return false;
      if (!clienteLabelsLower.has(row.cliente.trim().toLowerCase()))
        return false;
    }
    if (agenteIdsSet.size > 0) {
      if (!row.secondary_agente_id) return false;
      if (!agenteIdsSet.has(row.secondary_agente_id)) return false;
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
    case "conversion":
      return copy.sort((a, b) => {
        const diff =
          CONVERSION_ORDER[a.conversion_nivel] -
          CONVERSION_ORDER[b.conversion_nivel];
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
  { id: "conversion", label: "Mayor conversión primero" },
];
