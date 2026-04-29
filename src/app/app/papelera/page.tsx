"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useWorkspace } from "@/lib/workspace/context";
import { NoAccess } from "@/components/layout/no-access";
import {
  deleteCasePermanently,
  listTrashedCases,
  restoreCase,
  type CaseRow,
} from "@/lib/workspace/folders";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatError } from "@/lib/errors/format";

type TrashedCase = CaseRow & { deleted_at: string };

const FECHA_FMT = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function fmt(iso: string): string {
  try {
    return FECHA_FMT.format(new Date(iso));
  } catch {
    return iso;
  }
}

function daysUntilPurge(deletedAt: string): number {
  const deleted = new Date(deletedAt).getTime();
  const purgeAt = deleted + 15 * 24 * 60 * 60 * 1000;
  const remaining = purgeAt - Date.now();
  return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
}

export default function PapeleraPage() {
  const { workspaceRol } = useWorkspace();
  const [rows, setRows] = useState<TrashedCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [pendingPermanent, setPendingPermanent] = useState<TrashedCase | null>(null);
  const [purging, setPurging] = useState(false);

  useEffect(() => {
    if (workspaceRol !== "gerente") return;
    let cancelled = false;
    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const list = await listTrashedCases(supabase);
        if (!cancelled) setRows(list as TrashedCase[]);
      } catch (error) {
        if (!cancelled) {
          setMessage(formatError(error, "No se pudo cargar la papelera."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceRol]);

  if (workspaceRol !== "gerente") {
    return <NoAccess titulo="Papelera" />;
  }

  async function handleRestore(row: TrashedCase) {
    setRestoringId(row.id);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      await restoreCase(supabase, row.id);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      setMessage(`«${row.titulo}» restaurado.`);
    } catch (error) {
      setMessage(formatError(error, "No se pudo restaurar el caso."));
    } finally {
      setRestoringId(null);
    }
  }

  async function handleConfirmPermanent() {
    if (!pendingPermanent) return;
    setPurging(true);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      await deleteCasePermanently(supabase, pendingPermanent.id);
      setRows((prev) => prev.filter((r) => r.id !== pendingPermanent.id));
      setMessage(`«${pendingPermanent.titulo}» borrado definitivamente.`);
      setPendingPermanent(null);
    } catch (error) {
      setMessage(formatError(error, "No se pudo borrar el caso."));
    } finally {
      setPurging(false);
    }
  }

  return (
    <section className="grid gap-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Papelera
        </h2>
        <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
          Casos borrados. Se purgan automáticamente <strong>15 días</strong> después de borrarse.
          Puedes restaurarlos antes de que se cumpla el plazo, o borrar definitivamente.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Cargando…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-6 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-300">
          La papelera está vacía.
        </div>
      ) : (
        <div className="grid gap-2">
          {rows.map((row) => {
            const days = daysUntilPurge(row.deleted_at);
            return (
              <div
                key={row.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/40 dark:shadow-none"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {row.titulo}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {row.cliente ? `Cliente: ${row.cliente} · ` : ""}
                      Borrado {fmt(row.deleted_at)} · Se purga en {days} {days === 1 ? "día" : "días"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleRestore(row)}
                      disabled={restoringId === row.id}
                      className="rounded-lg border border-emerald-400 px-2.5 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-400/60 dark:text-emerald-300 dark:hover:bg-emerald-500/10"
                    >
                      {restoringId === row.id ? "Restaurando…" : "Restaurar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingPermanent(row)}
                      className="rounded-lg border border-rose-400 px-2.5 py-1 text-xs font-medium text-rose-700 transition hover:bg-rose-50 dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-500/10"
                    >
                      Borrar definitivamente
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {message ? (
        <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-700 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60 dark:text-slate-300 dark:shadow-none">
          {message}
        </div>
      ) : null}

      <div>
        <Link
          href="/app/caso"
          className="inline-flex rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-emerald-500 hover:bg-emerald-50 dark:border-slate-700 dark:text-slate-200 dark:hover:border-emerald-400 dark:hover:bg-emerald-400/10"
        >
          Volver a casos
        </Link>
      </div>

      <ConfirmDialog
        open={pendingPermanent !== null}
        title={
          pendingPermanent
            ? `¿Borrar definitivamente «${pendingPermanent.titulo}»?`
            : ""
        }
        description="Esta acción no se puede deshacer. Se eliminan también mensajes y adjuntos."
        confirmLabel="Borrar definitivamente"
        tone="destructive"
        busy={purging}
        onConfirm={handleConfirmPermanent}
        onClose={() => {
          if (!purging) setPendingPermanent(null);
        }}
      />
    </section>
  );
}
