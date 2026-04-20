import type { SupabaseClient } from "@supabase/supabase-js";

export type UserContentBlock =
  | { type: "text"; text: string }
  | {
      type: "image";
      source: {
        type: "base64";
        media_type: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
        data: string;
      };
    }
  | {
      type: "document";
      source: {
        type: "base64";
        media_type: "application/pdf";
        data: string;
      };
    };

const BUCKET = "case-attachments";

const ALLOWED_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

type StoredAttachment = {
  id: string;
  case_id: string;
  storage_path: string;
  filename: string;
  kind: "image" | "pdf" | "other";
  mime_type: string | null;
};

function bufferToBase64(buf: ArrayBuffer): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(buf).toString("base64");
  }
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function fetchAttachmentsAsContentBlocks(
  supabase: SupabaseClient,
  caseId: string,
  attachmentIds: string[],
): Promise<UserContentBlock[]> {
  if (attachmentIds.length === 0) return [];

  const { data, error } = await supabase
    .from("attachments")
    .select("id, case_id, storage_path, filename, kind, mime_type")
    .eq("case_id", caseId)
    .in("id", attachmentIds)
    .returns<StoredAttachment[]>();

  if (error) throw error;
  if (!data || data.length === 0) return [];

  const blocks: UserContentBlock[] = [];
  for (const row of data) {
    const { data: blob, error: downloadError } = await supabase.storage
      .from(BUCKET)
      .download(row.storage_path);
    if (downloadError || !blob) continue;

    const arrayBuffer = await blob.arrayBuffer();
    const base64 = bufferToBase64(arrayBuffer);
    const mime = row.mime_type ?? "";

    if (row.kind === "image" && ALLOWED_IMAGE_MIMES.has(mime)) {
      blocks.push({
        type: "image",
        source: {
          type: "base64",
          media_type: mime as
            | "image/jpeg"
            | "image/png"
            | "image/gif"
            | "image/webp",
          data: base64,
        },
      });
    } else if (row.kind === "pdf" || mime === "application/pdf") {
      blocks.push({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: base64,
        },
      });
    }
    // 'other' kind o mimes no soportados se saltan silenciosamente en v1.
  }

  return blocks;
}
