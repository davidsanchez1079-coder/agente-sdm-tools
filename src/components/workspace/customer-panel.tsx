"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  listCustomers,
  type CustomerRow,
} from "@/lib/customers/customers-db";

type CustomerPanelProps = {
  workspaceId: string;
  onMessage?: (message: string | null) => void;
};

// Sidebar de navegación cliente-first. Reemplaza al folder-panel en
// /app/caso. Lista clientes con conteo de casos, "Sin cliente" entry
// para casos legacy sin cliente, y un atajo al catálogo para alta.
export function CustomerPanel({ workspaceId, onMessage }: CustomerPanelProps) {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const [list, casesRes] = await Promise.all([
          listCustomers(supabase, workspaceId),
          supabase.from("cases").select("cliente"),
        ]);
        if (casesRes.error) throw casesRes.error;
        if (cancelled) return;

        const acc: Record<string, number> = {};
        let unassigned = 0;
        for (const row of (casesRes.data ?? []) as {
          cliente: string | null;
        }[]) {
          const name = row.cliente?.trim();
          if (!name) {
            unassigned += 1;
            continue;
          }
          acc[name.toLowerCase()] = (acc[name.toLowerCase()] ?? 0) + 1;
        }
        setCustomers(list);
        setCounts(acc);
        setUnassignedCount(unassigned);
      } catch (error) {
        if (!cancelled) {
          onMessage?.(
            error instanceof Error
              ? error.message
              : "No se pudo cargar el panel de clientes.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceId, onMessage]);

  return (
    <section className="grid min-w-0 gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:p-5 dark:border-slate-800/80 dark:bg-slate-900/40 dark:shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          Clientes
        </h3>
        <Link
          href="/app/customers"
          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-cyan-500 hover:bg-cyan-50 hover:text-cyan-700 dark:border-slate-800 dark:text-slate-300 dark:hover:border-cyan-400/60 dark:hover:bg-cyan-400/10 dark:hover:text-cyan-200"
        >
          Catálogo
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Cargando…
        </p>
      ) : customers.length === 0 && unassignedCount === 0 ? (
        <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
          Aún no hay clientes ni casos. Empieza creando un cliente desde el
          catálogo.
        </p>
      ) : (
        <div className="grid gap-1.5">
          {customers.map((customer) => {
            const count = counts[customer.label.toLowerCase()] ?? 0;
            return (
              <Link
                key={customer.id}
                href={`/app/customers/${customer.id}`}
                className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 transition hover:border-cyan-500/50 hover:bg-cyan-50 dark:border-slate-800/80 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:border-cyan-400/40 dark:hover:bg-cyan-400/10"
              >
                <span className="min-w-0 flex-1 truncate font-medium">
                  {customer.label}
                </span>
                <span className="shrink-0 rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
                  {count}
                </span>
              </Link>
            );
          })}
          {unassignedCount > 0 ? (
            <div className="mt-1 flex min-w-0 items-center justify-between gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-3 py-2.5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
              <span className="min-w-0 flex-1 truncate">
                Sin cliente
              </span>
              <span className="shrink-0 rounded-full border border-amber-400/60 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-200">
                {unassignedCount}
              </span>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
