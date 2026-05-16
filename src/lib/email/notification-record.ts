import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotificationKind } from "@/lib/notifications/types";

export type NotificationDbRow = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  href: string;
  actor_user_id: string | null;
  entity_id: string;
  created_at: string;
  data: unknown;
};

/** Normaliza jsonb: objeto, string JSON o vacío. */
export function normalizeNotificationData(
  raw: unknown,
): Record<string, unknown> {
  if (raw == null) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
    return {};
  }
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

export function asNotificationString(value: unknown): string | null {
  if (typeof value === "string") {
    const t = value.trim();
    return t.length > 0 ? t : null;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
}

/**
 * El webhook de Supabase a veces omite o trunca columnas (p. ej. `data` jsonb).
 * Siempre re-leemos la fila con service role antes de armar el correo.
 */
export async function loadNotificationFromDb(
  admin: SupabaseClient,
  notificationId: string,
): Promise<NotificationDbRow | null> {
  const { data, error } = await admin
    .from("notifications")
    .select(
      "id, kind, title, body, href, actor_user_id, entity_id, created_at, data",
    )
    .eq("id", notificationId)
    .maybeSingle<NotificationDbRow>();

  if (error) throw error;
  return data;
}
