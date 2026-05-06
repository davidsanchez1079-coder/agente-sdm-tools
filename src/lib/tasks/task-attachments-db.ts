import type { SupabaseClient } from "@supabase/supabase-js";
import type { TaskAttachmentKind, TaskAttachmentRow } from "@/lib/tasks/types";

export const TASK_ATTACHMENT_BUCKET = "task-attachments";
export const MAX_TASK_ATTACHMENT_BYTES = 20 * 1024 * 1024;

const ATTACHMENT_COLUMNS =
  "id, task_id, storage_path, filename, kind, mime_type, size_bytes, uploaded_by_user_id, created_at";

function detectKind(mimeType: string): TaskAttachmentKind {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "pdf";
  return "other";
}

function extensionFor(filename: string, mimeType: string): string {
  const match = filename.match(/\.([a-zA-Z0-9]+)$/);
  if (match) return match[1].toLowerCase();
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "bin";
}

export async function listTaskAttachments(
  supabase: SupabaseClient,
  taskId: string,
): Promise<TaskAttachmentRow[]> {
  const { data, error } = await supabase
    .from("task_attachments")
    .select(ATTACHMENT_COLUMNS)
    .eq("task_id", taskId)
    .order("created_at", { ascending: false })
    .returns<TaskAttachmentRow[]>();
  if (error) throw error;
  return data ?? [];
}

export async function uploadTaskAttachment(
  supabase: SupabaseClient,
  taskId: string,
  uploadedByUserId: string,
  file: File,
): Promise<TaskAttachmentRow> {
  if (file.size > MAX_TASK_ATTACHMENT_BYTES) {
    throw new Error(
      `El archivo "${file.name}" supera los 20 MB permitidos.`,
    );
  }

  const kind = detectKind(file.type);
  const ext = extensionFor(file.name, file.type);
  const attachmentId = crypto.randomUUID();
  const storagePath = `${taskId}/${attachmentId}.${ext}`;

  const uploadResult = await supabase.storage
    .from(TASK_ATTACHMENT_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });
  if (uploadResult.error) throw uploadResult.error;

  const { data, error } = await supabase
    .from("task_attachments")
    .insert({
      id: attachmentId,
      task_id: taskId,
      storage_path: storagePath,
      filename: file.name,
      kind,
      mime_type: file.type || null,
      size_bytes: file.size,
      uploaded_by_user_id: uploadedByUserId,
    })
    .select(ATTACHMENT_COLUMNS)
    .single<TaskAttachmentRow>();

  if (error || !data) {
    await supabase.storage.from(TASK_ATTACHMENT_BUCKET).remove([storagePath]);
    throw error ?? new Error("No se pudo registrar el adjunto.");
  }
  return data;
}

export async function deleteTaskAttachment(
  supabase: SupabaseClient,
  row: TaskAttachmentRow,
): Promise<void> {
  const { error: storageErr } = await supabase.storage
    .from(TASK_ATTACHMENT_BUCKET)
    .remove([row.storage_path]);
  if (storageErr) throw storageErr;

  const { error } = await supabase
    .from("task_attachments")
    .delete()
    .eq("id", row.id);
  if (error) throw error;
}

/** URL firmada para bucket privado. */
export async function createTaskAttachmentSignedUrl(
  supabase: SupabaseClient,
  storagePath: string,
  expiresInSeconds = 3600,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(TASK_ATTACHMENT_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}
