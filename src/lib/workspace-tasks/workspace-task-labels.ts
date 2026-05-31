import type { WorkspaceTaskEstado, WorkspaceTaskPrioridad } from "./workspace-tasks-db";

export const ESTADOS: WorkspaceTaskEstado[] = [
  "pendiente",
  "en_curso",
  "hecha",
  "cancelada",
];

export const PRIORIDADES: WorkspaceTaskPrioridad[] = [
  "baja",
  "normal",
  "alta",
  "urgente",
];

export function labelEstado(e: WorkspaceTaskEstado): string {
  switch (e) {
    case "pendiente":
      return "Pendiente";
    case "en_curso":
      return "En curso";
    case "hecha":
      return "Hecha";
    case "cancelada":
      return "Cancelada";
  }
}

export function labelPrioridad(p: WorkspaceTaskPrioridad): string {
  switch (p) {
    case "baja":
      return "Baja";
    case "normal":
      return "Normal";
    case "alta":
      return "Alta";
    case "urgente":
      return "Urgente";
  }
}
