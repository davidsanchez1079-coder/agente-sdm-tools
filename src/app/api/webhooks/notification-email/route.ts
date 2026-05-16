import { after, NextResponse, type NextRequest } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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
 * Responde 200 de inmediato a Supabase; el envío corre en segundo plano vía
 * `after()` (equivalente a waitUntil en Vercel) para evitar timeout ~5s del webhook.
 *
 * Configuración en Supabase: Database → Webhooks → table `notifications`, Insert,
 * URL: https://<dominio>/api/webhooks/notification-email
 * Header: x-gotia-webhook-secret
 */

export const maxDuration = 60;

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

type NotificationWebhookRecord = {
  id: string;
  recipient_user_id: string;
  kind?: string;
  title: string;
  body: string | null;
  href: string;
};

type EmailEnv = {
  supabaseUrl: string;
  serviceKey: string;
  resendKey: string;
  fromEmail: string;
  fromName: string;
  appBaseUrl: string;
};

function extractRecord(body: unknown): NotificationWebhookRecord | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  const raw =
    o.record && typeof o.record === "object"
      ? (o.record as Record<string, unknown>)
      : o.type === "INSERT" && o.record && typeof o.record === "object"
        ? (o.record as Record<string, unknown>)
        : null;
  if (!raw) return null;

  const id = typeof raw.id === "string" ? raw.id : "";
  const recipient_user_id =
    typeof raw.recipient_user_id === "string" ? raw.recipient_user_id : "";
  const title = typeof raw.title === "string" ? raw.title : "";
  const href = typeof raw.href === "string" ? raw.href : "";
  if (!id || !recipient_user_id || !title || !href) return null;

  return {
    id,
    recipient_user_id,
    kind: typeof raw.kind === "string" ? raw.kind : undefined,
    title,
    body: raw.body != null ? String(raw.body) : null,
    href,
  };
}

function isTaskKind(kind: string | undefined): kind is NotificationKind {
  return Boolean(kind && TASK_KINDS.has(kind as NotificationKind));
}

function readEmailEnv(): EmailEnv | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();
  const appBaseUrl = resolveAppBaseUrl();
  if (!supabaseUrl || !serviceKey || !resendKey || !fromEmail || !appBaseUrl) {
    return null;
  }
  return {
    supabaseUrl,
    serviceKey,
    resendKey,
    fromEmail,
    fromName: process.env.RESEND_FROM_NAME?.trim() || "GOTIA",
    appBaseUrl,
  };
}

async function buildAndSendEmail(
  record: NotificationWebhookRecord,
  env: EmailEnv,
): Promise<void> {
  const admin: SupabaseClient = createClient(env.supabaseUrl, env.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userRow, error: userErr } = await admin
    .from("users")
    .select("email")
    .eq("id", record.recipient_user_id)
    .maybeSingle<{ email: string }>();

  if (userErr) {
    console.error("[notification-email] users select", userErr);
    return;
  }

  const to = userRow?.email?.trim();
  if (!to) {
    console.info(
      "[notification-email] skipped no_email",
      record.id,
      record.recipient_user_id,
    );
    return;
  }

  const path = record.href.startsWith("/") ? record.href : `/${record.href}`;
  const actionUrl = `${env.appBaseUrl}${path}?notificationId=${encodeURIComponent(record.id)}`;

  let subject: string;
  let html: string;
  let text: string;

  if (isTaskKind(record.kind)) {
    const dbRow = await loadNotificationFromDb(admin, record.id);
    if (!dbRow) {
      console.error(
        "[notification-email] notification not found",
        record.id,
      );
      return;
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
      body: record.body,
      actionUrl,
    });
    text = renderNotificationInAppEmailText({
      title: record.title,
      body: record.body,
      actionUrl,
    });
  }

  const resend = new Resend(env.resendKey);
  const sendRes = await resend.emails.send({
    from: `${env.fromName} <${env.fromEmail}>`,
    to: [to],
    subject,
    html,
    text,
  });

  if (sendRes.error) {
    console.error("[notification-email] Resend", sendRes.error, record.id);
    return;
  }

  console.info(
    "[notification-email] sent",
    record.id,
    record.kind ?? "unknown",
    sendRes.data?.id ?? null,
  );
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
  if (!record) {
    return jsonError("Payload incompleto (id, recipient_user_id, title, href).", 400);
  }

  const env = readEmailEnv();
  if (!env) {
    return jsonError(
      "Servicio de correo sin configurar (Supabase, Resend o NEXT_PUBLIC_APP_URL).",
      503,
    );
  }

  after(async () => {
    try {
      await buildAndSendEmail(record, env);
    } catch (error) {
      console.error("[notification-email] background error", record.id, error);
    }
  });

  return NextResponse.json({ ok: true, status: "processing" });
}

export async function GET() {
  return new NextResponse(null, { status: 405 });
}
