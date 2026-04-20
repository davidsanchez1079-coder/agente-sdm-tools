"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  deleteAttachment,
  getSignedUrl,
  type AttachmentRow,
} from "@/lib/workspace/attachments";

type CaseAttachmentsProps = {
  attachments: AttachmentRow[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onChange: (next: AttachmentRow[]) => void;
};

type PreviewState = {
  row: AttachmentRow;
  url: string;
};

export function CaseAttachments({
  attachments,
  selectedIds,
  onToggleSelect,
  onChange,
}: CaseAttachmentsProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<PreviewState | null>(null);

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

  useEffect(() => {
    if (!preview) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPreview(null);
    }
    window.addEventListener("keydown", onKey);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = originalOverflow;
    };
  }, [preview]);

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
      const url = await getSignedUrl(supabase, row.storage_path, 600);
      setPreview({ row, url });
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo abrir el adjunto.",
      );
    }
  }

  if (attachments.length === 0) return null;

  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
          Adjuntos del caso ({attachments.length})
        </p>
        <span className="text-[10px] text-slate-500 dark:text-slate-400">
          Toca para marcar / quitar del próximo mensaje
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {attachments.map((row) => {
          const selected = selectedIds.includes(row.id);
          return (
            <div
              key={row.id}
              className={`grid gap-2 rounded-xl border p-3 transition ${
                selected
                  ? "border-emerald-500/60 bg-emerald-50 dark:border-emerald-400/60 dark:bg-emerald-500/10"
                  : "border-slate-200 bg-slate-50 dark:border-slate-800/80 dark:bg-slate-950/40"
              }`}
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
              </div>
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onToggleSelect(row.id)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                    selected
                      ? "border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-400 dark:border-emerald-400 dark:bg-emerald-400 dark:text-slate-950"
                      : "border-slate-300 bg-white text-slate-700 hover:border-emerald-500 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-emerald-400 dark:hover:text-emerald-300"
                  }`}
                >
                  {selected ? "En el mensaje" : "Incluir"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(row)}
                  className="text-xs text-rose-600 transition hover:text-rose-700 dark:text-rose-300 dark:hover:text-rose-200"
                >
                  Borrar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {message ? (
        <p className="text-xs text-amber-600 dark:text-amber-300">
          {message}
        </p>
      ) : null}

      {preview ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Vista previa de ${preview.row.filename}`}
          className="fixed inset-0 z-50 flex flex-col bg-slate-950/85 backdrop-blur-sm"
          onClick={() => setPreview(null)}
        >
          <div className="flex items-center justify-between gap-2 px-4 py-3 text-white">
            <span
              className="min-w-0 flex-1 truncate text-sm font-medium"
              title={preview.row.filename}
            >
              {preview.row.filename}
            </span>
            <a
              href={preview.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="rounded-lg border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20"
            >
              Abrir en pestaña
            </a>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPreview(null);
              }}
              aria-label="Cerrar vista previa"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/30 bg-white/10 text-white transition hover:bg-white/20"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div
            className="flex min-h-0 flex-1 items-center justify-center p-2 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {preview.row.kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview.url}
                alt={preview.row.filename}
                className="max-h-full max-w-full rounded-lg object-contain shadow-xl"
              />
            ) : preview.row.kind === "pdf" ? (
              <iframe
                src={preview.url}
                title={preview.row.filename}
                className="h-full w-full rounded-lg border border-white/20 bg-white"
              />
            ) : (
              <div className="rounded-lg bg-white px-6 py-5 text-sm text-slate-700">
                Este tipo de archivo no tiene vista previa. Usa &quot;Abrir
                en pestaña&quot;.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
