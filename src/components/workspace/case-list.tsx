"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  deleteCase,
  listCasesByCustomer,
  type CaseRow,
} from "@/lib/workspace/folders";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  estadoBadge,
  estadoLabel,
  operacionTipoBadge,
  operacionTipoLabel,
  prioridadBadge,
  prioridadLabel,
} from "@/lib/cases/cases";
import {
  applyFilters,
  hasAnyFilterOrQuery,
  parseFiltersFromParams,
  sortCases,
} from "@/lib/cases/filters";
import { formatPotencialUsd } from "@/lib/cases/cases";

type CaseListProps = {
  // null = todos los casos del workspace (RLS scopea).
  // string = filtra por cliente label exacto (case-insensitive).
  // "" = legacy "Sin cliente" (cases.cliente IS NULL).
  customerFilter?: string | null;
  onMessage?: (message: string | null) => void;
  refreshToken?: number;
};

export function CaseList({
  customerFilter = null,
  onMessage,
  refreshToken = 0,
}: CaseListProps) {
  const [rows, setRows] = useState<CaseRow[]>([]);
  const [pendingDelete, setPendingDelete] = useState<CaseRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();

  const filters = useMemo(
    () => parseFiltersFromParams(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const notify = useCallback(
    (msg: string | null) => {
      onMessage?.(msg);
    },
    [onMessage],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const supabase = getSupabaseBrowserClient();
        const data = await listCasesByCustomer(supabase, customerFilter);
        if (!cancelled) setRows(data);
      } catch (error) {
        if (!cancelled) {
          notify(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar los casos.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerFilter, refreshToken, notify]);

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setDeleting(true);
    try {
      const supabase = getSupabaseBrowserClient();
      await deleteCase(supabase, id);
      setRows((prev) => prev.filter((row) => row.id !== id));
      setPendingDelete(null);
      notify("Caso eliminado.");
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar el caso.",
      );
    } finally {
      setDeleting(false);
    }
  }

  const filtered = sortCases(applyFilters(rows, filters), filters.sort);
  const totalBefore = rows.length;
  const totalAfter = filtered.length;
  const anyFilter = hasAnyFilterOrQuery(filters);

  if (loading) {
    return (
      <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
        Cargando casos…
      </p>
    );
  }

  if (!totalBefore) {
    return (
      <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
        Aún no hay casos en este workspace.
      </p>
    );
  }

  if (!totalAfter) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-6 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
        Ningún caso coincide con los filtros actuales. Ajusta o limpia
        filtros para ver los {totalBefore}{" "}
        {totalBefore === 1 ? "caso" : "casos"} disponibles.
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {anyFilter ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Mostrando {totalAfter} de {totalBefore}{" "}
          {totalBefore === 1 ? "caso" : "casos"}.
        </p>
      ) : null}

      {filtered.map((row) => (
        <div
          key={row.id}
          className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-3 pl-5 shadow-sm transition duration-150 hover:border-emerald-500/50 hover:shadow-md dark:border-slate-800/80 dark:bg-slate-900/40 dark:shadow-none dark:hover:border-emerald-400/50 dark:hover:bg-slate-900/70 before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-emerald-500/70 dark:before:bg-emerald-400/70"
        >
          <div className="flex items-start gap-3">
            <Link
              href={`/app/caso/${row.id}`}
              className="min-w-0 flex-1 text-left"
            >
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                {row.titulo}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] ${estadoBadge(row.estado)}`}
                >
                  {estadoLabel(row.estado)}
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] ${prioridadBadge(row.prioridad)}`}
                >
                  {prioridadLabel(row.prioridad)}
                </span>
                {row.operacion_tipo ? (
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] ${operacionTipoBadge(row.operacion_tipo)}`}
                  >
                    {operacionTipoLabel(row.operacion_tipo)}
                  </span>
                ) : null}
                {row.requiere_rap ? (
                  <span className="rounded-full border border-violet-500/40 bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-violet-800 dark:border-violet-400/40 dark:bg-violet-500/15 dark:text-violet-200">
                    RAP
                  </span>
                ) : null}
                {row.potencial_usd != null ? (
                  <span className="rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200">
                    {formatPotencialUsd(row.potencial_usd)} / mes
                  </span>
                ) : null}
              </div>

              {row.siguiente_accion ? (
                <p className="mt-2 line-clamp-2 text-xs text-slate-600 dark:text-slate-300">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">
                    Siguiente:
                  </span>{" "}
                  {row.siguiente_accion}
                </p>
              ) : null}

              {row.cliente || row.operacion || row.material ? (
                <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                  {[row.cliente, row.operacion, row.material]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              ) : null}
            </Link>
            <button
              type="button"
              onClick={() => setPendingDelete(row)}
              className="shrink-0 rounded-lg border border-rose-300 px-2.5 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100 dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-500/10"
            >
              Borrar
            </button>
          </div>
        </div>
      ))}

      <ConfirmDialog
        open={pendingDelete !== null}
        title={
          pendingDelete
            ? `¿Borrar el caso «${pendingDelete.titulo}»?`
            : ""
        }
        description="Se eliminan también los mensajes y los adjuntos. No se puede deshacer."
        confirmLabel="Borrar caso"
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
