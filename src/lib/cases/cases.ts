export type CaseEstado = "abierto" | "en_proceso" | "detenido" | "cerrado";

export type CasePrioridad = "baja" | "media" | "alta" | "crítica";

export const CASE_ESTADOS: { id: CaseEstado; label: string }[] = [
  { id: "abierto", label: "Abierto" },
  { id: "en_proceso", label: "En proceso" },
  { id: "detenido", label: "Detenido" },
  { id: "cerrado", label: "Cerrado" },
];

export const CASE_PRIORIDADES: { id: CasePrioridad; label: string }[] = [
  { id: "baja", label: "Baja" },
  { id: "media", label: "Media" },
  { id: "alta", label: "Alta" },
  { id: "crítica", label: "Crítica" },
];

export const ESTADO_BADGE: Record<CaseEstado, string> = {
  abierto:
    "border-cyan-500/40 bg-cyan-100 text-cyan-800 dark:border-cyan-400/40 dark:bg-cyan-500/15 dark:text-cyan-200",
  en_proceso:
    "border-emerald-500/40 bg-emerald-100 text-emerald-800 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-200",
  detenido:
    "border-amber-500/40 bg-amber-100 text-amber-800 dark:border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-200",
  cerrado:
    "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300",
};

export const PRIORIDAD_BADGE: Record<CasePrioridad, string> = {
  baja: "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300",
  media:
    "border-cyan-500/40 bg-cyan-100 text-cyan-800 dark:border-cyan-400/40 dark:bg-cyan-500/15 dark:text-cyan-200",
  alta: "border-amber-500/40 bg-amber-100 text-amber-800 dark:border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-200",
  "crítica":
    "border-rose-500/40 bg-rose-100 text-rose-800 dark:border-rose-400/40 dark:bg-rose-500/15 dark:text-rose-200",
};

const FALLBACK_BADGE =
  "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300";

export function estadoBadge(estado: string): string {
  return ESTADO_BADGE[estado as CaseEstado] ?? FALLBACK_BADGE;
}

export function prioridadBadge(prioridad: string): string {
  return PRIORIDAD_BADGE[prioridad as CasePrioridad] ?? FALLBACK_BADGE;
}

export function estadoLabel(estado: string): string {
  return (
    CASE_ESTADOS.find((row) => row.id === (estado as CaseEstado))?.label ??
    estado
  );
}

export function prioridadLabel(prioridad: string): string {
  return (
    CASE_PRIORIDADES.find((row) => row.id === (prioridad as CasePrioridad))
      ?.label ?? prioridad
  );
}
