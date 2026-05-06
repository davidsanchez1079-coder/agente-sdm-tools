"use client";

import {
  URGENCY_BADGE_CLASS,
  URGENCY_LABEL,
  taskUrgency,
  type TaskUrgency,
} from "@/lib/tasks/urgency";
import type { TaskEstado } from "@/lib/tasks/types";

export function TaskUrgencyBadge({
  venceEl,
  estado,
}: {
  venceEl: string | null;
  estado: TaskEstado;
}) {
  const u = taskUrgency(venceEl, estado);
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${URGENCY_BADGE_CLASS[u]}`}
    >
      {URGENCY_LABEL[u]}
    </span>
  );
}

export function sortTasksByUrgency<
  T extends { vence_el: string | null; estado: TaskEstado; created_at: string },
>(rows: T[]): T[] {
  const rank: Record<TaskUrgency, number> = {
    vencida: 0,
    hoy: 1,
    proxima: 2,
    sin_fecha: 3,
    normal: 4,
  };
  return [...rows].sort((a, b) => {
    const ua = taskUrgency(a.vence_el, a.estado);
    const ub = taskUrgency(b.vence_el, b.estado);
    const d = rank[ua] - rank[ub];
    if (d !== 0) return d;
    const ta = a.vence_el ? new Date(a.vence_el).getTime() : Infinity;
    const tb = b.vence_el ? new Date(b.vence_el).getTime() : Infinity;
    if (ta !== tb) return ta - tb;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}
