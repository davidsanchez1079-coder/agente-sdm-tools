"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type ClienteAgregado = {
  cliente: string;
  casos: number;
};

export default function ClientePage() {
  const [rows, setRows] = useState<ClienteAgregado[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase
          .from("cases")
          .select("cliente")
          .not("cliente", "is", null);

        if (error) throw error;
        if (cancelled) return;

        const counts = new Map<string, number>();
        for (const row of (data ?? []) as { cliente: string | null }[]) {
          const name = row.cliente?.trim();
          if (!name) continue;
          counts.set(name, (counts.get(name) ?? 0) + 1);
        }

        const aggregated = Array.from(counts.entries())
          .map(([cliente, casos]) => ({ cliente, casos }))
          .sort((a, b) => b.casos - a.casos);

        setRows(aggregated);
      } catch (error) {
        if (cancelled) return;
        setMessage(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar clientes.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="grid gap-5">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-300">
          Cliente
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-white">
          Clientes vistos en tus casos
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          Listado derivado de los casos que tienes registrados. El módulo
          completo de CRM entra en versiones posteriores.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-slate-400">Cargando clientes…</p>
      ) : rows.length ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => (
            <div
              key={row.cliente}
              className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
            >
              <p className="text-sm font-medium text-white">{row.cliente}</p>
              <p className="mt-1 text-xs text-slate-400">
                {row.casos} {row.casos === 1 ? "caso" : "casos"}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm leading-6 text-slate-400">
          Todavía no hay clientes registrados en ningún caso.
        </p>
      )}

      {message ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-300">
          {message}
        </div>
      ) : null}
    </section>
  );
}
