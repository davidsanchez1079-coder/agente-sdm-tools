"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { deleteCase, listCases } from "@/lib/workspace/folders";

type CaseRow = {
  id: string;
  folder_id: string;
  titulo: string;
  cliente: string | null;
  operacion: string | null;
  material: string | null;
  maquina: string | null;
  marca_preferida: string | null;
  estado: string;
  created_at: string;
};

type CaseListProps = {
  folderId: string | null;
  onMessage?: (message: string | null) => void;
  refreshToken?: number;
};

export function CaseList({
  folderId,
  onMessage,
  refreshToken = 0,
}: CaseListProps) {
  const [rows, setRows] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(false);

  const notify = useCallback(
    (msg: string | null) => {
      onMessage?.(msg);
    },
    [onMessage],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!folderId) {
        if (!cancelled) setRows([]);
        return;
      }
      try {
        const supabase = getSupabaseBrowserClient();
        const data = await listCases(supabase, folderId);
        if (!cancelled) setRows(data);
      } catch (error) {
        if (!cancelled) {
          notify(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar los casos.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [folderId, refreshToken, notify]);

  async function handleDelete(id: string) {
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      await deleteCase(supabase, id);
      setRows((prev) => prev.filter((row) => row.id !== id));
      notify("Caso eliminado.");
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar el caso.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!folderId) {
    return (
      <p className="text-sm leading-6 text-slate-400">
        Selecciona una carpeta para ver sus casos.
      </p>
    );
  }

  if (loading && !rows.length) {
    return <p className="text-sm text-slate-400">Cargando casos…</p>;
  }

  if (!rows.length) {
    return (
      <p className="text-sm leading-6 text-slate-400">
        Esta carpeta todavía no tiene casos.
      </p>
    );
  }

  return (
    <div className="grid gap-2">
      {rows.map((row) => (
        <div
          key={row.id}
          className="rounded-xl border border-slate-800 bg-slate-900 p-3 transition hover:border-cyan-400/40"
        >
          <div className="flex items-start gap-3">
            <Link
              href={`/app/caso/${row.id}`}
              className="min-w-0 flex-1 text-left"
            >
              <p className="truncate text-sm font-medium text-white">
                {row.titulo}
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                {row.estado}
              </p>
              {row.cliente ? (
                <p className="mt-2 text-sm text-slate-300">
                  Cliente: {row.cliente}
                </p>
              ) : null}
              {row.operacion ? (
                <p className="mt-1 text-sm text-slate-400">
                  Operación: {row.operacion}
                </p>
              ) : null}
              {row.material ? (
                <p className="mt-1 text-sm text-slate-400">
                  Material: {row.material}
                </p>
              ) : null}
            </Link>
            <button
              type="button"
              onClick={() => void handleDelete(row.id)}
              className="shrink-0 rounded-lg border border-rose-700 px-3 py-2 text-xs text-rose-300 transition hover:bg-rose-900/30"
            >
              Borrar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
