"use client";

import type { AttachmentRow } from "@/lib/workspace/attachments";

type AttachmentSelectorProps = {
  attachments: AttachmentRow[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
};

export function AttachmentSelector({
  attachments,
  selectedIds,
  onChange,
  disabled,
}: AttachmentSelectorProps) {
  if (attachments.length === 0) return null;

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  function clear() {
    onChange([]);
  }

  return (
    <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800/80 dark:bg-slate-950/40">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
          Incluir adjuntos en este mensaje
        </p>
        <span className="text-[10px] text-slate-500 dark:text-slate-400">
          {selectedIds.length} de {attachments.length} seleccionados
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {attachments.map((row) => {
          const active = selectedIds.includes(row.id);
          return (
            <button
              key={row.id}
              type="button"
              onClick={() => toggle(row.id)}
              disabled={disabled}
              className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition disabled:cursor-not-allowed disabled:opacity-60 ${
                active
                  ? "border-emerald-500/50 bg-emerald-100 text-emerald-800 dark:border-emerald-400/50 dark:bg-emerald-500/15 dark:text-emerald-200"
                  : "border-slate-300 bg-white text-slate-700 hover:border-emerald-500/40 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:border-emerald-400/40"
              }`}
              title={row.filename}
            >
              <span className="text-[9px] font-semibold uppercase tracking-[0.15em]">
                {row.kind}
              </span>
              <span className="max-w-[16ch] truncate">{row.filename}</span>
            </button>
          );
        })}
        {selectedIds.length > 0 ? (
          <button
            type="button"
            onClick={clear}
            disabled={disabled}
            className="inline-flex items-center rounded-full border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-rose-400 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:border-rose-400/60 dark:hover:text-rose-300"
          >
            Limpiar
          </button>
        ) : null}
      </div>
    </div>
  );
}
