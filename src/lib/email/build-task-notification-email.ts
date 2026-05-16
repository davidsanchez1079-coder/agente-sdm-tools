import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotificationKind } from "@/lib/notifications/types";
import {
  formatNotificationDateTime,
  type TaskNotificationChange,
  type TaskNotificationEmailInput,
} from "@/lib/email/templates/task-notification-email";

type UserRow = {
  id: string;
  email: string;
  nombre: string | null;
  apellido: string | null;
};

type NotificationRow = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  href: string;
  actor_user_id: string | null;
  created_at: string;
  data: Record<string, unknown>;
};

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
}

function formatUserLabel(user: UserRow | null | undefined): string | null {
  if (!user) return null;
  const name = [user.nombre, user.apellido].filter(Boolean).join(" ").trim();
  return name || user.email;
}

function formatDueLabel(iso: string | null): string {
  if (!iso) return "Sin fecha";
  return formatNotificationDateTime(iso);
}

async function loadUsersByIds(
  admin: SupabaseClient,
  ids: string[],
): Promise<Map<string, UserRow>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return new Map();

  const { data, error } = await admin
    .from("users")
    .select("id, email, nombre, apellido")
    .in("id", unique)
    .returns<UserRow[]>();

  if (error) throw error;
  return new Map((data ?? []).map((u) => [u.id, u]));
}

async function loadNoteBody(
  admin: SupabaseClient,
  noteId: string,
): Promise<{ body: string; created_at: string } | null> {
  const { data, error } = await admin
    .from("workspace_task_notes")
    .select("body, created_at")
    .eq("id", noteId)
    .maybeSingle<{ body: string; created_at: string }>();
  if (error) throw error;
  return data;
}

export async function buildTaskNotificationEmailInput(
  admin: SupabaseClient,
  record: NotificationRow,
): Promise<TaskNotificationEmailInput> {
  const data = record.data ?? {};
  const taskTitle =
    asString(data.task_titulo) ?? asString(record.body) ?? "Tarea";

  const userIds: string[] = [];
  if (record.actor_user_id) userIds.push(record.actor_user_id);
  const oldAssignee = asString(data.old_assignee_user_id);
  const newAssignee = asString(data.new_assignee_user_id);
  const assignedOnCreate = asString(data.assigned_to_user_id);
  if (oldAssignee) userIds.push(oldAssignee);
  if (newAssignee) userIds.push(newAssignee);
  if (assignedOnCreate) userIds.push(assignedOnCreate);

  const usersById = await loadUsersByIds(admin, userIds);
  const actorLabel = formatUserLabel(
    record.actor_user_id ? usersById.get(record.actor_user_id) : undefined,
  );

  let commentText: string | null = asString(data.note_text);
  let commentAt: string | null = asString(data.note_created_at);

  const noteId = asString(data.note_id);
  if (record.kind === "task_note_added" && !commentText && noteId) {
    const note = await loadNoteBody(admin, noteId);
    if (note) {
      commentText = note.body;
      commentAt = note.created_at;
    }
  }

  const changes: TaskNotificationChange[] = [];

  if (record.kind === "task_due_changed") {
    const oldDue = asString(data.old_vence_el);
    const newDue = asString(data.new_vence_el);
    changes.push({
      label: "Vencimiento",
      before: formatDueLabel(oldDue),
      after: formatDueLabel(newDue),
    });
  }

  if (
    record.kind === "task_assigned" ||
    record.kind === "task_reassigned" ||
    record.kind === "task_unassigned"
  ) {
    const beforeLabel = oldAssignee
      ? formatUserLabel(usersById.get(oldAssignee)) ?? "Usuario"
      : "Sin responsable";
    const afterLabel = newAssignee
      ? formatUserLabel(usersById.get(newAssignee)) ?? "Usuario"
      : "Sin responsable";
    if (beforeLabel !== afterLabel) {
      changes.push({
        label: "Responsable",
        before: beforeLabel,
        after: afterLabel,
      });
    }
  }

  if (record.kind === "task_created_assigned" && assignedOnCreate) {
    const afterLabel =
      formatUserLabel(usersById.get(assignedOnCreate)) ?? "Usuario";
    changes.push({
      label: "Responsable",
      before: "Sin responsable",
      after: afterLabel,
    });
  }

  const headline =
    record.kind === "task_note_added"
      ? `Nuevo comentario en: ${taskTitle}`
      : record.title;

  return {
    kind: record.kind,
    actionUrl: "",
    taskTitle,
    headline,
    actorLabel,
    occurredAt: commentAt ?? record.created_at,
    commentText,
    commentAt,
    changes,
  };
}
