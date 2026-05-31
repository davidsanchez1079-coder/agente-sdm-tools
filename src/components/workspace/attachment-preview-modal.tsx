"use client";

import { useEffect } from "react";
import type { AttachmentRow } from "@/lib/workspace/attachments";

export type AttachmentPreview = {
  row: AttachmentRow;
  url: string;
};

type Props = {
  preview: AttachmentPreview | null;
  onClose: () => void;
};

export function AttachmentPreviewModal({ preview, onClose }: Props) {
  useEffect(() => {
    if (!preview) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = originalOverflow;
    };
  }, [preview, onClose]);

  if (!preview) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Vista previa de ${preview.row.filename}`}
      className="fixed inset-0 z-50 flex flex-col bg-slate-950/85 backdrop-blur-sm"
      onClick={onClose}
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
            onClose();
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
        ) : preview.row.kind === "video" ? (
          <video
            controls
            playsInline
            preload="metadata"
            className="max-h-full max-w-full rounded-lg border border-white/20 bg-black shadow-xl"
            src={preview.url}
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
  );
}
