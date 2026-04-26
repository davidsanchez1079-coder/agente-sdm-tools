export type CaseEstado = "abierto" | "en_proceso" | "detenido" | "cerrado";

export type CasePrioridad = "baja" | "media" | "alta" | "crítica";

export type CaseResultadoCierre =
  | "exito"
  | "parcial"
  | "sin_resultado"
  | "cancelado";

export type CaseOperacionTipo =
  | "torneado"
  | "fresado"
  | "taladrado"
  | "ranurado"
  | "roscado"
  | "portaherramientas"
  | "otro";

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

export const CASE_RESULTADOS_CIERRE: {
  id: CaseResultadoCierre;
  label: string;
}[] = [
  { id: "exito", label: "Éxito" },
  { id: "parcial", label: "Parcial" },
  { id: "sin_resultado", label: "Sin resultado" },
  { id: "cancelado", label: "Cancelado" },
];

export const CASE_OPERACION_TIPOS: {
  id: CaseOperacionTipo;
  label: string;
}[] = [
  { id: "torneado", label: "Torneado" },
  { id: "fresado", label: "Fresado" },
  { id: "taladrado", label: "Taladrado" },
  { id: "ranurado", label: "Ranurado" },
  { id: "roscado", label: "Roscado" },
  { id: "portaherramientas", label: "Sistemas portaherramientas" },
  { id: "otro", label: "Otro / sin clasificar" },
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

export const RESULTADO_CIERRE_BADGE: Record<CaseResultadoCierre, string> = {
  exito:
    "border-emerald-500/40 bg-emerald-100 text-emerald-800 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-200",
  parcial:
    "border-amber-500/40 bg-amber-100 text-amber-800 dark:border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-200",
  sin_resultado:
    "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300",
  cancelado:
    "border-rose-500/40 bg-rose-100 text-rose-800 dark:border-rose-400/40 dark:bg-rose-500/15 dark:text-rose-200",
};

export const OPERACION_TIPO_BADGE: Record<CaseOperacionTipo, string> = {
  torneado:
    "border-sky-500/40 bg-sky-100 text-sky-800 dark:border-sky-400/40 dark:bg-sky-500/15 dark:text-sky-200",
  fresado:
    "border-emerald-500/40 bg-emerald-100 text-emerald-800 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-200",
  taladrado:
    "border-amber-500/40 bg-amber-100 text-amber-800 dark:border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-200",
  ranurado:
    "border-fuchsia-500/40 bg-fuchsia-100 text-fuchsia-800 dark:border-fuchsia-400/40 dark:bg-fuchsia-500/15 dark:text-fuchsia-200",
  roscado:
    "border-rose-500/40 bg-rose-100 text-rose-800 dark:border-rose-400/40 dark:bg-rose-500/15 dark:text-rose-200",
  portaherramientas:
    "border-indigo-500/40 bg-indigo-100 text-indigo-800 dark:border-indigo-400/40 dark:bg-indigo-500/15 dark:text-indigo-200",
  otro: "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300",
};

const FALLBACK_BADGE =
  "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300";

export function estadoBadge(estado: string): string {
  return ESTADO_BADGE[estado as CaseEstado] ?? FALLBACK_BADGE;
}

export function prioridadBadge(prioridad: string): string {
  return PRIORIDAD_BADGE[prioridad as CasePrioridad] ?? FALLBACK_BADGE;
}

export function resultadoCierreBadge(resultado: string): string {
  return (
    RESULTADO_CIERRE_BADGE[resultado as CaseResultadoCierre] ?? FALLBACK_BADGE
  );
}

export function operacionTipoBadge(tipo: string): string {
  return OPERACION_TIPO_BADGE[tipo as CaseOperacionTipo] ?? FALLBACK_BADGE;
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

export function resultadoCierreLabel(resultado: string): string {
  return (
    CASE_RESULTADOS_CIERRE.find(
      (row) => row.id === (resultado as CaseResultadoCierre),
    )?.label ?? resultado
  );
}

export function operacionTipoLabel(tipo: string): string {
  return (
    CASE_OPERACION_TIPOS.find((row) => row.id === (tipo as CaseOperacionTipo))
      ?.label ?? tipo
  );
}

const USD_FORMAT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatPotencialUsd(value: number | null): string {
  if (value == null) return "No registrado";
  return USD_FORMAT.format(value);
}
