import type { SupabaseClient } from "@supabase/supabase-js";

export type AttachmentKind = "image" | "pdf" | "other";

export type AttachmentRow = {
  id: string;
  case_id: string;
  storage_path: string;
  filename: string;
  kind: AttachmentKind;
  mime_type: string | null;
  size_bytes: number | null;
  analyzed_by_ai: boolean;
  analysis_notes: string | null;
  created_at: string;
};

export const ATTACHMENT_BUCKET = "case-attachments";
export const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024; // 20 MB
export const ATTACHMENT_ACCEPT = "image/*,.pdf,application/pdf";

const ATTACHMENT_COLUMNS =
  "id, case_id, storage_path, filename, kind, mime_type, size_bytes, analyzed_by_ai, analysis_notes, created_at";

function detectKind(mimeType: string): AttachmentKind {
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

export async function listAttachments(
  supabase: SupabaseClient,
  caseId: string,
) {
  const { data, error } = await supabase
    .from("attachments")
    .select(ATTACHMENT_COLUMNS)
    .eq("case_id", caseId)
    .order("created_at", { ascending: false })
    .returns<AttachmentRow[]>();
  if (error) throw error;
  return data;
}

export async function uploadAttachment(
  supabase: SupabaseClient,
  caseId: string,
  file: File,
): Promise<AttachmentRow> {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error(
      `El archivo "${file.name}" supera los 20 MB permitidos.`,
    );
  }

  const kind = detectKind(file.type);
  const ext = extensionFor(file.name, file.type);
  const attachmentId = crypto.randomUUID();
  const storagePath = `${caseId}/${attachmentId}.${ext}`;

  const uploadResult = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });
  if (uploadResult.error) throw uploadResult.error;

  const { data, error } = await supabase
    .from("attachments")
    .insert({
      id: attachmentId,
      case_id: caseId,
      storage_path: storagePath,
      filename: file.name,
      kind,
      mime_type: file.type || null,
      size_bytes: file.size,
    })
    .select(ATTACHMENT_COLUMNS)
    .single<AttachmentRow>();

  if (error || !data) {
    // Rollback del blob para no dejar basura en el bucket si fallo la
    // inserción en la tabla.
    await supabase.storage.from(ATTACHMENT_BUCKET).remove([storagePath]);
    throw error ?? new Error("No se pudo registrar el adjunto.");
  }
  return data;
}

export async function deleteAttachment(
  supabase: SupabaseClient,
  attachment: AttachmentRow,
) {
  await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .remove([attachment.storage_path]);
  const { error } = await supabase
    .from("attachments")
    .delete()
    .eq("id", attachment.id);
  if (error) throw error;
}

export async function getSignedUrl(
  supabase: SupabaseClient,
  storagePath: string,
  expiresSeconds = 300,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .createSignedUrl(storagePath, expiresSeconds);
  if (error) throw error;
  return data.signedUrl;
}
