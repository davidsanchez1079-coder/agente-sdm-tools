import type { NotificationKind } from "./types";

const KIND_LABELS: Record<NotificationKind, string> = {
  task_assigned: "Asignación",
  task_reassigned: "Reasignación",
  task_note_added: "Comentario",
  task_completed: "Completada",
  task_created_assigned: "Nueva tarea",
  task_due_changed: "Vencimiento",
  task_unassigned: "Sin responsable",
};

export function notificationKindLabel(kind: NotificationKind): string {
  return KIND_LABELS[kind] ?? kind.replaceAll("_", " ");
}
