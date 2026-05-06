import type { TaskEstado } from "@/lib/tasks/types";

export type TaskUrgency = "vencida" | "hoy" | "proxima" | "normal" | "sin_fecha";

/**
 * Urgencia calculada en app a partir de vence_el y estado (sin columna en BD).
 * Tareas completadas/cerradas se tratan como no urgentes salvo vencida reciente.
 */
export function taskUrgency(
  venceElIso: string | null,
  estado: TaskEstado,
  now: Date = new Date(),
): TaskUrgency {
  if (estado === "completada" || estado === "cerrada") {
    return "normal";
  }
  if (!venceElIso) return "sin_fecha";

  const due = new Date(venceElIso);
  if (Number.isNaN(due.getTime())) return "sin_fecha";

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setHours(23, 59, 59, 999);

  if (due.getTime() < now.getTime()) return "vencida";
  if (due.getTime() <= endOfToday.getTime()) return "hoy";

  const in48h = now.getTime() + 48 * 60 * 60 * 1000;
  if (due.getTime() <= in48h) return "proxima";
  return "normal";
}

export const URGENCY_LABEL: Record<TaskUrgency, string> = {
  vencida: "Vencida",
  hoy: "Vence hoy",
  proxima: "Próxima",
  normal: "En tiempo",
  sin_fecha: "Sin fecha",
};

export const URGENCY_BADGE_CLASS: Record<TaskUrgency, string> = {
  vencida:
    "border-rose-500/50 bg-rose-50 text-rose-800 dark:border-rose-400/40 dark:bg-rose-500/15 dark:text-rose-200",
  hoy:
    "border-amber-500/50 bg-amber-50 text-amber-900 dark:border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-100",
  proxima:
    "border-cyan-500/40 bg-cyan-50 text-cyan-900 dark:border-cyan-400/40 dark:bg-cyan-500/15 dark:text-cyan-100",
  normal:
    "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200",
  sin_fecha:
    "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300",
};
