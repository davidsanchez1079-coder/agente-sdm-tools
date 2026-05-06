import type { SupabaseClient } from "@supabase/supabase-js";
import {
  randomShareLinkToken,
  type ShareableMember,
} from "@/lib/cases/shares";
import type { TaskSharePermission, TaskShareRow } from "@/lib/tasks/types";

const SHARE_COLUMNS =
  "id, task_id, shared_with_email, shared_with_member_id, shared_by, shared_at, revoked_at, permission, link_token";

export async function listActiveTaskShares(
  supabase: SupabaseClient,
  taskId: string,
): Promise<TaskShareRow[]> {
  const { data, error } = await supabase
    .from("task_shares")
    .select(SHARE_COLUMNS)
    .eq("task_id", taskId)
    .is("revoked_at", null)
    .order("shared_at", { ascending: false })
    .returns<TaskShareRow[]>();
  if (error) throw error;
  return data ?? [];
}

export async function addTaskShare(
  supabase: SupabaseClient,
  taskId: string,
  member: ShareableMember,
  sharedByUserId: string,
  permission: TaskSharePermission,
): Promise<TaskShareRow> {
  const existing = await supabase
    .from("task_shares")
    .select(SHARE_COLUMNS)
    .eq("task_id", taskId)
    .ilike("shared_with_email", member.email)
    .maybeSingle<TaskShareRow>();

  if (existing.data) {
    const { data, error } = await supabase
      .from("task_shares")
      .update({
        shared_with_member_id: member.member_id,
        shared_by: sharedByUserId,
        shared_at: new Date().toISOString(),
        revoked_at: null,
        permission,
        link_token: randomShareLinkToken(),
      })
      .eq("id", existing.data.id)
      .select(SHARE_COLUMNS)
      .single<TaskShareRow>();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("task_shares")
    .insert({
      task_id: taskId,
      shared_with_email: member.email,
      shared_with_member_id: member.member_id,
      shared_by: sharedByUserId,
      permission,
      link_token: randomShareLinkToken(),
    })
    .select(SHARE_COLUMNS)
    .single<TaskShareRow>();
  if (error) throw error;
  return data;
}

export async function updateTaskSharePermission(
  supabase: SupabaseClient,
  shareId: string,
  permission: TaskSharePermission,
): Promise<TaskShareRow> {
  const { data, error } = await supabase
    .from("task_shares")
    .update({ permission })
    .eq("id", shareId)
    .select(SHARE_COLUMNS)
    .single<TaskShareRow>();
  if (error) throw error;
  return data;
}

export async function revokeTaskShare(
  supabase: SupabaseClient,
  shareId: string,
): Promise<void> {
  const { error } = await supabase
    .from("task_shares")
    .update({ revoked_at: new Date().toISOString(), link_token: null })
    .eq("id", shareId);
  if (error) throw error;
}
