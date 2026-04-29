"use client";

import Image from "next/image";
import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  deleteAttachment,
  type AttachmentRow,
} from "@/lib/workspace/attachments";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatError } from "@/lib/errors/format";

type CaseAttachmentsProps = {
  attachments: AttachmentRow[];
  selectedIds: string[];
  previewUrls: Record<string, string>;
  onToggleSelect: (id: string) => void;
  onChange: (next: AttachmentRow[]) => void;
  onOpen: (row: AttachmentRow) => void | Promise<void>;
};

export function CaseAttachments({
  attachments,
  selectedIds,
  previewUrls,
  onToggleSelect,
  onChange,
  onOpen,
}: CaseAttachmentsProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AttachmentRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const supabase = getSupabaseBrowserClient();
      await deleteAttachment(supabase, pendingDelete);
      onChange(attachments.filter((r) => r.id !== pendingDelete.id));
      setPendingDelete(null);
    } catch (error) {
      setMessage(
        formatError(error, "No se pudo eliminar el adjunto."),
      );
    } finally {
      setDeleting(false);
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
                  onClick={() => void onOpen(row)}
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
                  onClick={() => void onOpen(row)}
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
                  onClick={() => setPendingDelete(row)}
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

      <ConfirmDialog
        open={pendingDelete !== null}
        title={pendingDelete ? `¿Borrar el adjunto «${pendingDelete.filename}»?` : ""}
        description="Se borra el archivo del bucket y la fila de la BD. No se puede deshacer."
        confirmLabel="Borrar adjunto"
        tone="destructive"
        busy={deleting}
        onConfirm={handleConfirmDelete}
        onClose={() => {
          if (!deleting) setPendingDelete(null);
        }}
      />
    </div>
  );
}
