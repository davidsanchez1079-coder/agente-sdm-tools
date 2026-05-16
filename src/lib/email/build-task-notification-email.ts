import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotificationKind } from "@/lib/notifications/types";
import {
  asNotificationString,
  normalizeNotificationData,
  type NotificationDbRow,
} from "@/lib/email/notification-record";
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
  recipient_user_id: string;
  actor_user_id: string | null;
  entity_id: string;
  created_at: string;
  data: Record<string, unknown>;
};

function formatUserLabel(user: UserRow | null | undefined): string | null {
  if (!user) return null;
  const name = [user.nombre, user.apellido].filter(Boolean).join(" ").trim();
  return name || user.email;
}

function formatDueLabel(iso: string | null): string {
  if (!iso) return "Sin fecha";
  return formatNotificationDateTime(iso);
}

function toBuildRow(row: NotificationDbRow): NotificationRow {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    href: row.href,
    recipient_user_id: row.recipient_user_id,
    actor_user_id: row.actor_user_id,
    entity_id: row.entity_id,
    created_at: row.created_at,
    data: normalizeNotificationData(row.data),
  };
}

async function loadTaskAssigneeUserId(
  admin: SupabaseClient,
  taskId: string,
): Promise<string | null> {
  const { data, error } = await admin
    .from("workspace_tasks")
    .select("assigned_to_user_id")
    .eq("id", taskId)
    .maybeSingle<{ assigned_to_user_id: string | null }>();
  if (error) throw error;
  return data?.assigned_to_user_id ?? null;
}

function resolveAssigneeDisplay(
  assigneeUserId: string | null,
  recipientUserId: string,
  usersById: Map<string, UserRow>,
): string {
  if (!assigneeUserId) return "Sin responsable";
  if (assigneeUserId === recipientUserId) return "Tú";
  return formatUserLabel(usersById.get(assigneeUserId)) ?? "Usuario";
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

async function loadNoteById(
  admin: SupabaseClient,
  noteId: string,
): Promise<{ body: string; created_at: string } | null> {
  const { data, error } = await admin
    .from("workspace_task_notes")
    .select("body, created_at")
    .eq("id", noteId)
    .maybeSingle<{ body: string; created_at: string }>();
  if (error) {
    console.error("[notification-email] note by id", error);
    return null;
  }
  return data;
}

const INITIAL_MESSAGE_WINDOW_MS = 60_000;
/** Espera breve si el webhook de tarea corre antes del INSERT de la nota en el cliente. */
const INITIAL_MESSAGE_RETRY_DELAYS_MS = [0, 1500, 3000] as const;

async function loadFirstMessageNoteForTask(
  admin: SupabaseClient,
  taskId: string,
): Promise<{ body: string; created_at: string } | null> {
  const { data: task, error: taskErr } = await admin
    .from("workspace_tasks")
    .select("created_at")
    .eq("id", taskId)
    .maybeSingle<{ created_at: string }>();
  if (taskErr) {
    console.error("[notification-email] task created_at", taskErr);
    return null;
  }
  if (!task?.created_at) return null;

  const windowStart = new Date(task.created_at).getTime();
  const windowEnd = windowStart + INITIAL_MESSAGE_WINDOW_MS;

  const { data: notes, error } = await admin
    .from("workspace_task_notes")
    .select("body, created_at")
    .eq("workspace_task_id", taskId)
    .gte("created_at", new Date(windowStart).toISOString())
    .lte("created_at", new Date(windowEnd).toISOString())
    .order("created_at", { ascending: true })
    .limit(1)
    .returns<{ body: string; created_at: string }[]>();

  if (error) {
    console.error("[notification-email] first message note", error);
    return null;
  }

  const note = notes?.[0];
  if (!note?.body?.trim()) return null;
  return { body: note.body.trim(), created_at: note.created_at };
}

async function resolveFirstMessageForCreatedTask(
  admin: SupabaseClient,
  taskId: string,
): Promise<{ text: string | null; at: string | null }> {
  for (const delayMs of INITIAL_MESSAGE_RETRY_DELAYS_MS) {
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    const note = await loadFirstMessageNoteForTask(admin, taskId);
    if (note) {
      return { text: note.body, at: note.created_at };
    }
  }
  return { text: null, at: null };
}

async function loadLatestNoteForTask(
  admin: SupabaseClient,
  taskId: string,
): Promise<{ body: string; created_at: string } | null> {
  const { data, error } = await admin
    .from("workspace_task_notes")
    .select("body, created_at")
    .eq("workspace_task_id", taskId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ body: string; created_at: string }>();
  if (error) {
    console.error("[notification-email] latest note for task", error);
    return null;
  }
  return data;
}

async function resolveCommentForNoteNotification(
  admin: SupabaseClient,
  record: NotificationRow,
  data: Record<string, unknown>,
): Promise<{ text: string | null; at: string | null }> {
  let text = asNotificationString(data.note_text);
  let at = asNotificationString(data.note_created_at);

  const noteId = asNotificationString(data.note_id);

  if (!text && noteId) {
    const note = await loadNoteById(admin, noteId);
    if (note?.body?.trim()) {
      text = note.body.trim();
      at = note.created_at;
    }
  }

  if (!text) {
    const note = await loadLatestNoteForTask(admin, record.entity_id);
    if (note?.body?.trim()) {
      text = note.body.trim();
      at = note.created_at;
    }
  }

  return { text, at };
}

export async function buildTaskNotificationEmailInput(
  admin: SupabaseClient,
  record: NotificationRow,
): Promise<TaskNotificationEmailInput> {
  const data = record.data ?? {};
  const taskTitle =
    asNotificationString(data.task_titulo) ??
    asNotificationString(record.body) ??
    "Tarea";

  const taskAssigneeId = await loadTaskAssigneeUserId(admin, record.entity_id);

  const userIds: string[] = [];
  if (record.actor_user_id) userIds.push(record.actor_user_id);
  if (taskAssigneeId) userIds.push(taskAssigneeId);
  const oldAssignee = asNotificationString(data.old_assignee_user_id);
  const newAssignee = asNotificationString(data.new_assignee_user_id);
  const assignedOnCreate = asNotificationString(data.assigned_to_user_id);
  if (oldAssignee) userIds.push(oldAssignee);
  if (newAssignee) userIds.push(newAssignee);
  if (assignedOnCreate) userIds.push(assignedOnCreate);

  const usersById = await loadUsersByIds(admin, userIds);
  const assigneeDisplay = resolveAssigneeDisplay(
    taskAssigneeId,
    record.recipient_user_id,
    usersById,
  );
  const actorLabel = formatUserLabel(
    record.actor_user_id ? usersById.get(record.actor_user_id) : undefined,
  );

  let commentText: string | null = null;
  let commentAt: string | null = null;
  let firstMessageText: string | null = null;
  let firstMessageAt: string | null = null;

  if (record.kind === "task_note_added") {
    const resolved = await resolveCommentForNoteNotification(
      admin,
      record,
      data,
    );
    commentText = resolved.text;
    commentAt = resolved.at;
  }

  if (record.kind === "task_created_assigned") {
    const initial = await resolveFirstMessageForCreatedTask(
      admin,
      record.entity_id,
    );
    firstMessageText = initial.text;
    firstMessageAt = initial.at;
  }

  const changes: TaskNotificationChange[] = [];

  if (record.kind === "task_due_changed") {
    const oldDue = asNotificationString(data.old_vence_el);
    const newDue = asNotificationString(data.new_vence_el);
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
    assigneeDisplay,
    actorLabel,
    occurredAt: firstMessageAt ?? commentAt ?? record.created_at,
    commentText,
    commentAt,
    firstMessageText,
    firstMessageAt,
    changes,
  };
}

/** Fila canónica desde BD (fuente de verdad para `data` y `entity_id`). */
export async function buildTaskNotificationEmailInputFromDb(
  admin: SupabaseClient,
  dbRow: NotificationDbRow,
): Promise<TaskNotificationEmailInput> {
  return buildTaskNotificationEmailInput(admin, toBuildRow(dbRow));
}
