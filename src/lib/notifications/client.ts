import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { NotificationRow } from "./types";

export async function fetchUnreadCount(): Promise<number> {
  const supabase = getSupabaseBrowserClient() as any;
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  if (error) throw error;
  return count ?? 0;
}

export async function fetchLatestNotifications(
  limit = 30,
): Promise<NotificationRow[]> {
  const supabase = getSupabaseBrowserClient() as any;
  const { data, error } = await supabase
    .from("notifications")
    .select(
      "id, workspace_id, recipient_user_id, actor_user_id, kind, entity_type, entity_id, title, body, href, data, read_at, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as NotificationRow[];
}

export async function markNotificationRead(id: string): Promise<void> {
  const supabase = getSupabaseBrowserClient() as any;
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null);
  if (error) throw error;
}

export async function markAllNotificationsRead(): Promise<void> {
  const supabase = getSupabaseBrowserClient() as any;
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  if (error) throw error;
}

