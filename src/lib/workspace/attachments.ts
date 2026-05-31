import type { SupabaseClient } from "@supabase/supabase-js";

export type AttachmentKind = "image" | "pdf" | "video" | "other";

/** Solo evidencia en UI; el agente no consume estos MIME. */
export const ALLOWED_CASE_VIDEO_MIMES = new Set([
  "video/mp4",
  "video/quicktime",
]);

/** Duración máxima permitida para cualquier video de caso (cámara o archivo). */
export const MAX_CASE_VIDEO_DURATION_SECONDS = 40;

export const VIDEO_CAPTURE_ACCEPT =
  "video/mp4,video/quicktime,.mp4,.mov";

/** Para `aria-describedby` en botones/input de video y archivo. */
export const CASE_VIDEO_EVIDENCE_HELP_ID = "gotia-case-video-evidence-help";

export const CASE_VIDEO_HELP_LINE_1 = `Video de evidencia: máximo ${MAX_CASE_VIDEO_DURATION_SECONDS} s (MP4 o MOV). Sin recorte automático: si el clip es más largo, se rechaza al subirlo. El agente no analiza video.`;

export const CASE_VIDEO_HELP_LINE_2 =
  "En el móvil, «Video» suele abrir la cámara: graba solo lo necesario y detén a tiempo, o elige en «Archivo» un video ya corto.";

export const CASE_VIDEO_ATTACHMENTS_CAPTION = `Video: máx. ${MAX_CASE_VIDEO_DURATION_SECONDS} s, MP4/MOV, sin recorte; no va al agente.`;

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
export const ATTACHMENT_ACCEPT =
  "image/*,.pdf,application/pdf,video/mp4,video/quicktime,.mp4,.mov";

const ATTACHMENT_COLUMNS =
  "id, case_id, storage_path, filename, kind, mime_type, size_bytes, analyzed_by_ai, analysis_notes, created_at";

function extensionFromFilename(filename: string): string {
  const match = filename.match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1].toLowerCase() : "";
}

/** MIME efectivo para validar y clasificar (algunos navegadores dejan type vacío). */
export function effectiveAttachmentMime(file: File): string {
  const raw = file.type?.trim() ?? "";
  if (raw) return raw;
  const ext = extensionFromFilename(file.name);
  if (ext === "pdf") return "application/pdf";
  if (ext === "mp4") return "video/mp4";
  if (ext === "mov") return "video/quicktime";
  return "";
}

export function isCaseVideoUploadFile(file: File): boolean {
  return ALLOWED_CASE_VIDEO_MIMES.has(effectiveAttachmentMime(file));
}

function detectKind(mimeType: string): AttachmentKind {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "pdf";
  if (ALLOWED_CASE_VIDEO_MIMES.has(mimeType)) return "video";
  return "other";
}

function isAllowedCaseAttachment(mimeType: string): boolean {
  if (!mimeType) return false;
  if (mimeType.startsWith("image/")) return true;
  if (mimeType === "application/pdf") return true;
  if (ALLOWED_CASE_VIDEO_MIMES.has(mimeType)) return true;
  return false;
}

async function readVideoFileDurationSeconds(
  file: File,
): Promise<number | null> {
  if (typeof window === "undefined") return null;
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "metadata";
  video.muted = true;
  try {
    return await new Promise<number | null>((resolve) => {
      function cleanup() {
        video.removeEventListener("loadedmetadata", onMeta);
        video.removeEventListener("error", onErr);
      }
      function onMeta() {
        cleanup();
        const d = video.duration;
        resolve(Number.isFinite(d) && d >= 0 ? d : null);
      }
      function onErr() {
        cleanup();
        resolve(null);
      }
      video.addEventListener("loadedmetadata", onMeta);
      video.addEventListener("error", onErr);
      video.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
    video.removeAttribute("src");
    video.load();
  }
}

/** Rechaza video si supera {@link MAX_CASE_VIDEO_DURATION_SECONDS} o no se puede leer la duración. */
export async function assertCaseVideoMaxDuration(file: File): Promise<void> {
  const mime = effectiveAttachmentMime(file);
  if (!ALLOWED_CASE_VIDEO_MIMES.has(mime)) return;

  const seconds = await readVideoFileDurationSeconds(file);
  if (seconds == null) {
    throw new Error(
      `No pude leer la duración del video "${file.name}". Prueba con MP4 o MOV distinto.`,
    );
  }
  const max = MAX_CASE_VIDEO_DURATION_SECONDS;
  // Margen mínimo por redondeo de metadatos (p. ej. 40.04 s en un clip de 40 s).
  if (seconds > max + 0.35) {
    const rounded = Math.ceil(seconds * 10) / 10;
    throw new Error(
      `El video dura ${rounded} s; el máximo permitido es ${max} s. No hay recorte automático: acórtalo fuera de GOTIA y vuelve a subirlo.`,
    );
  }
}

function extensionFor(filename: string, mimeType: string): string {
  const match = filename.match(/\.([a-zA-Z0-9]+)$/);
  if (match) return match[1].toLowerCase();
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "video/mp4") return "mp4";
  if (mimeType === "video/quicktime") return "mov";
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

export type UploadAttachmentOptions = {
  /** Si true, no vuelve a comprobar duración (p. ej. ya validado en la UI). */
  skipVideoDurationAssert?: boolean;
};

export async function uploadAttachment(
  supabase: SupabaseClient,
  caseId: string,
  file: File,
  options?: UploadAttachmentOptions,
): Promise<AttachmentRow> {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error(
      `El archivo "${file.name}" supera los 20 MB permitidos.`,
    );
  }

  const mime = effectiveAttachmentMime(file);
  if (!isAllowedCaseAttachment(mime)) {
    throw new Error(
      `Tipo no permitido: "${file.name}". Solo imagen, PDF, MP4 o MOV.`,
    );
  }

  const kind = detectKind(mime);
  if (!options?.skipVideoDurationAssert) {
    await assertCaseVideoMaxDuration(file);
  }

  const ext = extensionFor(file.name, mime);
  const attachmentId = crypto.randomUUID();
  const storagePath = `${caseId}/${attachmentId}.${ext}`;

  const uploadResult = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: mime || undefined,
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
      mime_type: mime || null,
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
