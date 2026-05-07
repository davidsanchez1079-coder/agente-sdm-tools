import type { SupabaseClient } from "@supabase/supabase-js";

export type WorkspaceTaskNoteRow = {
  id: string;
  workspace_task_id: string;
  workspace_id: string;
  body: string;
  created_by_user_id: string;
  created_at: string;
  attachment_storage_path: string | null;
  attachment_filename: string | null;
  attachment_mime_type: string | null;
  attachment_size_bytes: number | null;
};

const NOTE_COLUMNS =
  "id, workspace_task_id, workspace_id, body, created_by_user_id, created_at, attachment_storage_path, attachment_filename, attachment_mime_type, attachment_size_bytes";

export const WORKSPACE_TASK_ATTACHMENT_BUCKET = "workspace-task-attachments";
export const MAX_WORKSPACE_TASK_ATTACHMENT_BYTES = 20 * 1024 * 1024;

type CreateWorkspaceTaskNoteOptions = {
  attachment_storage_path?: string | null;
  attachment_filename?: string | null;
  attachment_mime_type?: string | null;
  attachment_size_bytes?: number | null;
};

function extensionFor(filename: string, mimeType: string): string {
  const match = filename.match(/\.([a-zA-Z0-9]+)$/);
  if (match) return match[1].toLowerCase();
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "application/pdf") return "pdf";
  return "bin";
}

export async function listWorkspaceTaskNotes(
  supabase: SupabaseClient,
  workspaceId: string,
  taskId: string,
): Promise<WorkspaceTaskNoteRow[]> {
  const { data, error } = await supabase
    .from("workspace_task_notes")
    .select(NOTE_COLUMNS)
    .eq("workspace_id", workspaceId)
    .eq("workspace_task_id", taskId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .returns<WorkspaceTaskNoteRow[]>();
  if (error) throw error;
  return data ?? [];
}

export async function createWorkspaceTaskNote(
  supabase: SupabaseClient,
  workspaceId: string,
  taskId: string,
  body: string,
  options: CreateWorkspaceTaskNoteOptions = {},
): Promise<WorkspaceTaskNoteRow> {
  const trimmed = body.trim();
  if (!trimmed) {
    throw new Error("La nota no puede estar vacía.");
  }
  const { data, error } = await supabase
    .from("workspace_task_notes")
    .insert({
      workspace_id: workspaceId,
      workspace_task_id: taskId,
      body: trimmed,
      attachment_storage_path: options.attachment_storage_path ?? null,
      attachment_filename: options.attachment_filename ?? null,
      attachment_mime_type: options.attachment_mime_type ?? null,
      attachment_size_bytes: options.attachment_size_bytes ?? null,
    })
    .select(NOTE_COLUMNS)
    .single<WorkspaceTaskNoteRow>();
  if (error) throw error;
  return data;
}

export async function uploadWorkspaceTaskAttachment(
  supabase: SupabaseClient,
  workspaceId: string,
  taskId: string,
  file: File,
): Promise<{
  storagePath: string;
  filename: string;
  mimeType: string | null;
  sizeBytes: number;
}> {
  if (file.size > MAX_WORKSPACE_TASK_ATTACHMENT_BYTES) {
    throw new Error(
      `El archivo "${file.name}" supera los 20 MB permitidos.`,
    );
  }

  const mimeType = file.type || "application/octet-stream";
  const ext = extensionFor(file.name, mimeType);
  const storagePath = `${workspaceId}/${taskId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(WORKSPACE_TASK_ATTACHMENT_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: mimeType,
    });
  if (error) throw error;

  return {
    storagePath,
    filename: file.name || `adjunto.${ext}`,
    mimeType: file.type || null,
    sizeBytes: file.size,
  };
}

export async function getWorkspaceTaskAttachmentSignedUrl(
  supabase: SupabaseClient,
  storagePath: string,
  expiresSeconds = 60 * 60,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(WORKSPACE_TASK_ATTACHMENT_BUCKET)
    .createSignedUrl(storagePath, expiresSeconds);
  if (error) throw error;
  return data.signedUrl;
}

