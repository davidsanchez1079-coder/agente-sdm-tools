import type { SupabaseClient } from "@supabase/supabase-js";
import type { TaskCommentRow, TaskCommentWithAuthor } from "@/lib/tasks/types";

const COMMENT_COLUMNS =
  "id, task_id, author_user_id, body, created_at";

const COMMENT_WITH_AUTHOR = `
  ${COMMENT_COLUMNS},
  author:users!task_comments_author_user_id_fkey(id, nombre, apellido, email)
`;

export async function listTaskComments(
  supabase: SupabaseClient,
  taskId: string,
): Promise<TaskCommentWithAuthor[]> {
  const { data, error } = await supabase
    .from("task_comments")
    .select(COMMENT_WITH_AUTHOR)
    .eq("task_id", taskId)
    .order("created_at", { ascending: true })
    .returns<TaskCommentWithAuthor[]>();
  if (error) throw error;
  return data ?? [];
}

export async function addTaskComment(
  supabase: SupabaseClient,
  taskId: string,
  authorUserId: string,
  body: string,
): Promise<TaskCommentRow> {
  const trimmed = body.trim();
  if (!trimmed) throw new Error("El comentario no puede estar vacío.");

  const { data, error } = await supabase
    .from("task_comments")
    .insert({
      task_id: taskId,
      author_user_id: authorUserId,
      body: trimmed,
    })
    .select(COMMENT_COLUMNS)
    .single<TaskCommentRow>();
  if (error) throw error;
  return data;
}

export async function deleteTaskComment(
  supabase: SupabaseClient,
  commentId: string,
): Promise<void> {
  const { error } = await supabase.from("task_comments").delete().eq("id", commentId);
  if (error) throw error;
}
