import type { NotificationKind } from "@/lib/notifications/types";
import { sanitizeNotificationEmailCopy } from "@/lib/email/templates/notification-in-app";

export type TaskNotificationChange = {
  label: string;
  before: string;
  after: string;
};

export type TaskNotificationEmailInput = {
  kind: NotificationKind;
  actionUrl: string;
  taskTitle: string;
  headline: string;
  /** "Tú", nombre del responsable o "Sin responsable". */
  assigneeDisplay: string;
  actorLabel: string | null;
  occurredAt: string;
  commentText: string | null;
  commentAt: string | null;
  changes: TaskNotificationChange[];
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeHtmlWithBreaks(value: string): string {
  return escapeHtml(value).replace(/\r\n|\r|\n/g, "<br/>");
}

export function formatNotificationDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-MX", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function taskTitleForSubject(taskTitle: string): string {
  const t = sanitizeNotificationEmailCopy(taskTitle) || "Tarea";
  return t.length > 80 ? `${t.slice(0, 77).trim()}…` : t;
}

export function taskNotificationEmailSubject(input: TaskNotificationEmailInput): string {
  const task = taskTitleForSubject(input.taskTitle);
  switch (input.kind) {
    case "task_note_added":
      return `GOTIA · Nuevo comentario en: ${task}`;
    case "task_due_changed":
      return `GOTIA · Vencimiento actualizado en: ${task}`;
    case "task_assigned":
      return `GOTIA · Te asignaron una tarea: ${task}`;
    case "task_reassigned":
      return `GOTIA · Reasignación de tarea: ${task}`;
    case "task_unassigned":
      return `GOTIA · Cambio de responsable en: ${task}`;
    case "task_completed":
      return `GOTIA · Tarea completada: ${task}`;
    case "task_created_assigned":
      return `GOTIA · Nueva tarea: ${task}`;
    default:
      return `GOTIA · ${sanitizeNotificationEmailCopy(input.headline) || "Notificación"}`;
  }
}

function metaRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 0 0;width:120px;vertical-align:top;font-size:13px;color:#64748b;">${escapeHtml(label)}</td>
    <td style="padding:6px 0 0;font-size:14px;line-height:1.45;color:#0f172a;">${escapeHtmlWithBreaks(value)}</td>
  </tr>`;
}

function renderChangesHtml(changes: TaskNotificationChange[]): string {
  if (changes.length === 0) return "";
  const rows = changes
    .map(
      (c) => `<tr>
        <td style="padding:10px 0 0;font-size:13px;color:#64748b;vertical-align:top;">${escapeHtml(c.label)}</td>
        <td style="padding:10px 0 0;font-size:14px;line-height:1.5;color:#0f172a;">
          <span style="color:#64748b;text-decoration:line-through;">${escapeHtml(c.before)}</span>
          <span style="color:#94a3b8;margin:0 6px;">→</span>
          <span style="font-weight:600;">${escapeHtml(c.after)}</span>
        </td>
      </tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0 0;border-collapse:collapse;">
    <tr><td style="padding:0 0 8px 0;">
      <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;">Cambios</p>
    </td></tr>
    <tr><td style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rows}</table>
    </td></tr>
  </table>`;
}

function renderAssigneeHtml(display: string): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0 0;border-collapse:collapse;">
    <tr><td style="padding:0 0 8px 0;">
      <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;">Responsable</p>
    </td></tr>
    <tr><td style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 16px;">
      <p style="margin:0;font-size:15px;line-height:1.45;color:#0f172a;font-weight:600;">${escapeHtml(display)}</p>
    </td></tr>
  </table>`;
}

function renderCommentHtml(text: string): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0 0;border-collapse:collapse;">
    <tr><td style="padding:0 0 8px 0;">
      <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;">Comentario</p>
    </td></tr>
    <tr><td style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:10px;padding:16px 18px;">
      <p style="margin:0;font-size:15px;line-height:1.6;color:#0f172a;white-space:pre-wrap;">${escapeHtmlWithBreaks(text)}</p>
    </td></tr>
  </table>`;
}

export function renderTaskNotificationEmailHtml(
  input: TaskNotificationEmailInput,
): string {
  const subject = taskNotificationEmailSubject(input);
  const taskTitle =
    sanitizeNotificationEmailCopy(input.taskTitle) || "Tarea";
  const headline =
    sanitizeNotificationEmailCopy(input.headline) || "Notificación";
  const when = formatNotificationDateTime(input.occurredAt);
  const actor = input.actorLabel
    ? sanitizeNotificationEmailCopy(input.actorLabel)
    : null;

  const preheader =
    input.kind === "task_note_added" && input.commentText
      ? sanitizeNotificationEmailCopy(input.commentText).replace(/\s+/g, " ").slice(0, 140)
      : headline;

  const assigneeDisplay = sanitizeNotificationEmailCopy(input.assigneeDisplay) || "Sin responsable";

  const taskMetaTable = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0 0;border-collapse:collapse;">
    ${metaRow("Tarea", taskTitle)}
  </table>`;

  const assigneeBlock = renderAssigneeHtml(assigneeDisplay);

  const contextMetaTable = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:12px 0 0;border-collapse:collapse;">
    ${actor ? metaRow("Autor", actor) : ""}
    ${metaRow("Fecha", when)}
  </table>`;

  const commentBlock =
    input.commentText && input.commentText.trim()
      ? renderCommentHtml(sanitizeNotificationEmailCopy(input.commentText))
      : "";

  const changesBlock = renderChangesHtml(input.changes);

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;background:#f8fafc;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:transparent;opacity:0;width:0;height:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:24px 22px;">
        <tr><td>
          <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#0f766e;">GOTIA · Tareas</p>
          <h1 style="margin:12px 0 0;font-size:20px;line-height:1.35;color:#0f172a;font-weight:700;">${escapeHtml(headline)}</h1>
          ${taskMetaTable}
          ${assigneeBlock}
          ${contextMetaTable}
          ${commentBlock}
          ${changesBlock}
          <p style="margin:28px 0 0;text-align:center;">
            <a href="${escapeHtml(input.actionUrl)}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 28px;border-radius:10px;">Ver tarea completa</a>
          </p>
          <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#64748b;text-align:center;">Si el botón no funciona, copia este enlace:</p>
          <p style="margin:6px 0 0;font-size:12px;line-height:1.45;word-break:break-all;color:#0f766e;text-align:center;">${escapeHtml(input.actionUrl)}</p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:11px;line-height:1.45;color:#94a3b8;max-width:560px;text-align:center;">Resumen de actividad en una tarea de tu workspace. Abre GOTIA para responder o ver el historial completo.</p>
    </td></tr>
  </table>
</body>
</html>`;
}

export function renderTaskNotificationEmailText(
  input: TaskNotificationEmailInput,
): string {
  const subject = taskNotificationEmailSubject(input);
  const lines: string[] = [
    subject,
    "",
    input.headline,
    "",
    `Tarea: ${sanitizeNotificationEmailCopy(input.taskTitle) || "Tarea"}`,
    `Responsable: ${sanitizeNotificationEmailCopy(input.assigneeDisplay) || "Sin responsable"}`,
  ];
  if (input.actorLabel) {
    lines.push(`Autor: ${sanitizeNotificationEmailCopy(input.actorLabel)}`);
  }
  lines.push(`Fecha: ${formatNotificationDateTime(input.occurredAt)}`);

  if (input.commentText?.trim()) {
    lines.push("", "— Comentario —", sanitizeNotificationEmailCopy(input.commentText));
  }

  if (input.changes.length > 0) {
    lines.push("", "— Cambios —");
    for (const c of input.changes) {
      lines.push(`${c.label}: ${c.before} → ${c.after}`);
    }
  }

  lines.push("", "Ver tarea completa:", input.actionUrl);
  return lines.join("\n");
}
