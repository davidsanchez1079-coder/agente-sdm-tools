import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { buildTaskNotificationEmailInputFromDb } from "@/lib/email/build-task-notification-email";
import { loadNotificationFromDb } from "@/lib/email/notification-record";
import {
  renderNotificationInAppEmailHtml,
  renderNotificationInAppEmailText,
  notificationInAppEmailSubject,
} from "@/lib/email/templates/notification-in-app";
import {
  renderTaskNotificationEmailHtml,
  renderTaskNotificationEmailText,
  taskNotificationEmailSubject,
} from "@/lib/email/templates/task-notification-email";
import type { NotificationKind } from "@/lib/notifications/types";

/**
 * Webhook para correo al crear una fila en `public.notifications`.
 *
 * Configuración en Supabase (sin cambiar columnas de la tabla):
 * Database → Webhooks → Create → Table `notifications`, Events: Insert,
 * HTTP Request URL: https://<tu-dominio>/api/webhooks/notification-email
 * Headers: `x-gotia-webhook-secret: <NOTIFICATION_EMAIL_WEBHOOK_SECRET>`
 *
 * Variables en Vercel: NOTIFICATION_EMAIL_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY,
 * NEXT_PUBLIC_APP_URL (obligatorio aquí: URL pública de la app, ej. https://gotia.tudominio.mx
 * — sin esto el webhook no puede armar enlaces y no debe usarse vercel.app por defecto), RESEND_*.
 */

const TASK_KINDS = new Set<NotificationKind>([
  "task_assigned",
  "task_reassigned",
  "task_note_added",
  "task_completed",
  "task_created_assigned",
  "task_due_changed",
  "task_unassigned",
]);

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function resolveAppBaseUrl(): string | null {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return null;
}

type NotificationRecord = {
  id?: string;
  recipient_user_id?: string;
  actor_user_id?: string | null;
  kind?: string;
  title?: string;
  body?: string | null;
  href?: string;
  created_at?: string;
  data?: Record<string, unknown>;
};

function extractRecord(body: unknown): NotificationRecord | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  if (o.record && typeof o.record === "object") {
    return o.record as NotificationRecord;
  }
  if (o.type === "INSERT" && o.record && typeof o.record === "object") {
    return o.record as NotificationRecord;
  }
  return null;
}

function isTaskKind(kind: string | undefined): kind is NotificationKind {
  return Boolean(kind && TASK_KINDS.has(kind as NotificationKind));
}

export async function POST(request: NextRequest) {
  const secret = process.env.NOTIFICATION_EMAIL_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return jsonError(
      "Webhook deshabilitado: falta NOTIFICATION_EMAIL_WEBHOOK_SECRET.",
      503,
    );
  }

  const gotHeader = request.headers.get("x-gotia-webhook-secret")?.trim();
  if (gotHeader !== secret) {
    return jsonError("No autorizado.", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Body inválido.", 400);
  }

  const record = extractRecord(body);
  if (!record?.id || !record.recipient_user_id || !record.title || !record.href) {
    return jsonError("Payload incompleto (id, recipient_user_id, title, href).", 400);
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!serviceKey || !supabaseUrl) {
    return jsonError("Supabase service no configurado.", 503);
  }

  const resendKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();
  if (!resendKey || !fromEmail) {
    return jsonError("Resend no configurado.", 503);
  }
  const fromName = process.env.RESEND_FROM_NAME?.trim() || "GOTIA";

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userRow, error: userErr } = await admin
    .from("users")
    .select("email")
    .eq("id", record.recipient_user_id)
    .maybeSingle<{ email: string }>();

  if (userErr) {
    console.error("[notification-email] users select", userErr);
    return jsonError("No se pudo resolver el destinatario.", 500);
  }
  const to = userRow?.email?.trim();
  if (!to) {
    return NextResponse.json({ ok: true, skipped: "no_email" });
  }

  const base = resolveAppBaseUrl();
  if (!base) {
    return jsonError(
      "Falta NEXT_PUBLIC_APP_URL para armar el enlace del correo.",
      503,
    );
  }

  const path = record.href.startsWith("/") ? record.href : `/${record.href}`;
  const actionUrl = `${base}${path}?notificationId=${encodeURIComponent(record.id)}`;

  let subject: string;
  let html: string;
  let text: string;

  if (isTaskKind(record.kind)) {
    const dbRow = await loadNotificationFromDb(admin, record.id);
    if (!dbRow) {
      return jsonError("Notificación no encontrada en base de datos.", 404);
    }

    const emailInput = await buildTaskNotificationEmailInputFromDb(admin, dbRow);
    emailInput.actionUrl = actionUrl;
    subject = taskNotificationEmailSubject(emailInput);
    html = renderTaskNotificationEmailHtml(emailInput);
    text = renderTaskNotificationEmailText(emailInput);
  } else {
    subject = notificationInAppEmailSubject(record.title);
    html = renderNotificationInAppEmailHtml({
      title: record.title,
      body: record.body ?? null,
      actionUrl,
    });
    text = renderNotificationInAppEmailText({
      title: record.title,
      body: record.body ?? null,
      actionUrl,
    });
  }

  const resend = new Resend(resendKey);
  const sendRes = await resend.emails.send({
    from: `${fromName} <${fromEmail}>`,
    to: [to],
    subject,
    html,
    text,
  });

  if (sendRes.error) {
    console.error("[notification-email] Resend", sendRes.error);
    return jsonError(
      sendRes.error.message ?? "No se pudo enviar el correo.",
      502,
    );
  }

  return NextResponse.json({ ok: true, id: sendRes.data?.id ?? null });
}

export async function GET() {
  return new NextResponse(null, { status: 405 });
}
