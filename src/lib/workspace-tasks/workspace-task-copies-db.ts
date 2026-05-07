import type { SupabaseClient } from "@supabase/supabase-js";

export type WorkspaceTaskCopyRow = {
  id: string;
  workspace_id: string;
  workspace_task_id: string;
  copied_user_id: string;
  added_by_user_id: string;
  created_at: string;
};

const COPY_COLUMNS =
  "id, workspace_id, workspace_task_id, copied_user_id, added_by_user_id, created_at";

export async function listWorkspaceTaskCopies(
  supabase: SupabaseClient,
  workspaceId: string,
  taskId: string,
): Promise<WorkspaceTaskCopyRow[]> {
  const { data, error } = await supabase
    .from("workspace_task_copies")
    .select(COPY_COLUMNS)
    .eq("workspace_id", workspaceId)
    .eq("workspace_task_id", taskId)
    .order("created_at", { ascending: true })
    .returns<WorkspaceTaskCopyRow[]>();
  if (error) throw error;
  return data ?? [];
}

export async function addWorkspaceTaskCopy(
  supabase: SupabaseClient,
  workspaceId: string,
  taskId: string,
  copiedUserId: string,
): Promise<WorkspaceTaskCopyRow> {
  const { data, error } = await supabase
    .from("workspace_task_copies")
    .insert({
      workspace_id: workspaceId,
      workspace_task_id: taskId,
      copied_user_id: copiedUserId,
    })
    .select(COPY_COLUMNS)
    .single<WorkspaceTaskCopyRow>();
  if (error) throw error;
  return data;
}

export async function removeWorkspaceTaskCopy(
  supabase: SupabaseClient,
  workspaceId: string,
  taskId: string,
  copiedUserId: string,
): Promise<void> {
  const { error } = await supabase
    .from("workspace_task_copies")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("workspace_task_id", taskId)
    .eq("copied_user_id", copiedUserId);
  if (error) throw error;
}

