"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  ATTACHMENT_ACCEPT,
  MAX_ATTACHMENT_BYTES,
  deleteAttachment,
  getSignedUrl,
  uploadAttachment,
  type AttachmentRow,
} from "@/lib/workspace/attachments";

type CaseAttachmentsProps = {
  caseId: string;
  attachments: AttachmentRow[];
  onChange: (next: AttachmentRow[]) => void;
};

export function CaseAttachments({
  caseId,
  attachments,
  onChange,
}: CaseAttachmentsProps) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const filePickerRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = getSupabaseBrowserClient();
      const next: Record<string, string> = {};
      for (const row of attachments) {
        if (row.kind !== "image") continue;
        try {
          next[row.id] = await getSignedUrl(supabase, row.storage_path, 3600);
        } catch {
          // si falla una URL, los demás siguen funcionando
        }
      }
      if (!cancelled) setPreviewUrls(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [attachments]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setMessage(null);
    const supabase = getSupabaseBrowserClient();
    let current = attachments;
    for (const file of Array.from(files)) {
      if (file.size > MAX_ATTACHMENT_BYTES) {
        setMessage(
          `"${file.name}" supera los 20 MB. Se omitió. Puedes reducir el tamaño y reintentar.`,
        );
        continue;
      }
      try {
        const row = await uploadAttachment(supabase, caseId, file);
        current = [row, ...current];
        onChange(current);
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : `Error al subir "${file.name}".`,
        );
      }
    }
    setUploading(false);
  }

  async function handleDelete(row: AttachmentRow) {
    try {
      const supabase = getSupabaseBrowserClient();
      await deleteAttachment(supabase, row);
      onChange(attachments.filter((r) => r.id !== row.id));
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar el adjunto.",
      );
    }
  }

  async function handleOpen(row: AttachmentRow) {
    try {
      const supabase = getSupabaseBrowserClient();
      const url = await getSignedUrl(supabase, row.storage_path, 300);
      if (typeof window !== "undefined") {
        window.open(url, "_blank", "noopener");
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo abrir el adjunto.",
      );
    }
  }

  return (
    <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/40 dark:shadow-none">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
          Adjuntos del caso
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Sube PDFs o fotos (desgaste, pieza, plano, catálogo). Después
          elige cuáles incluir en cada mensaje al agente. Límite 20 MB por
          archivo.
        </p>
      </div>

      <div className="grid gap-2">
        <input
          ref={filePickerRef}
          type="file"
          accept={ATTACHMENT_ACCEPT}
          multiple
          className="hidden"
          onChange={(event) => {
            void handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => {
            void handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60 sm:py-2 dark:bg-emerald-500 dark:hover:bg-emerald-400"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            Tomar foto
          </button>
          <button
            type="button"
            onClick={() => filePickerRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 sm:py-2 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:border-emerald-400 dark:hover:bg-emerald-400/10"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Subir archivo
          </button>
        </div>
        {uploading ? (
          <span className="inline-flex items-center text-xs text-slate-500 dark:text-slate-400">
            Subiendo…
          </span>
        ) : null}
      </div>

      {attachments.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Este caso todavía no tiene adjuntos.
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {attachments.map((row) => (
            <div
              key={row.id}
              className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800/80 dark:bg-slate-950/40"
            >
              {row.kind === "image" && previewUrls[row.id] ? (
                <button
                  type="button"
                  onClick={() => void handleOpen(row)}
                  className="relative block h-32 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800"
                >
                  <Image
                    src={previewUrls[row.id]}
                    alt={row.filename}
                    fill
                    sizes="(min-width: 1024px) 200px, (min-width: 640px) 40vw, 80vw"
                    className="object-cover"
                    unoptimized
                  />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleOpen(row)}
                  className="flex h-32 items-center justify-center rounded-lg border border-slate-200 bg-white text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
                >
                  {row.kind === "pdf" ? "PDF" : "Archivo"}
                </button>
              )}
              <div className="flex items-start justify-between gap-2">
                <span
                  className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700 dark:text-slate-200"
                  title={row.filename}
                >
                  {row.filename}
                </span>
                <button
                  type="button"
                  onClick={() => void handleDelete(row)}
                  className="shrink-0 text-xs text-rose-600 transition hover:text-rose-700 dark:text-rose-300 dark:hover:text-rose-200"
                >
                  Borrar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {message ? (
        <p className="text-xs text-amber-600 dark:text-amber-300">
          {message}
        </p>
      ) : null}
    </div>
  );
}
