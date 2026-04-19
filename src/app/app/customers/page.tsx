"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  CUSTOMERS,
  type CustomerStatus,
} from "@/lib/customers/customers";

const STATUS_BADGE: Record<CustomerStatus, string> = {
  activo:
    "border-emerald-500/40 bg-emerald-100 text-emerald-800 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-200",
  prospecto:
    "border-cyan-500/40 bg-cyan-100 text-cyan-800 dark:border-cyan-400/40 dark:bg-cyan-500/15 dark:text-cyan-200",
  inactivo:
    "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300",
  pausado:
    "border-amber-500/40 bg-amber-100 text-amber-800 dark:border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-200",
};

export default function CustomersPage() {
  const [counts, setCounts] = useState<Record<string, number>>({});
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

        const acc: Record<string, number> = {};
        for (const row of (data ?? []) as { cliente: string | null }[]) {
          const name = row.cliente?.trim();
          if (!name) continue;
          acc[name] = (acc[name] ?? 0) + 1;
        }
        setCounts(acc);
      } catch (error) {
        if (!cancelled) {
          setMessage(
            error instanceof Error
              ? error.message
              : "No se pudieron contar los casos por cliente.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="grid gap-6">
      <header className="space-y-2">
        <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200">
          Cliente
        </span>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Catálogo de clientes
        </h2>
        <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
          Lista base del catálogo interno. Selecciona un cliente para ver su
          detalle y los casos asociados.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CUSTOMERS.map((customer) => {
          const count = counts[customer.label] ?? 0;
          return (
            <Link
              key={customer.id}
              href={`/app/customers/${customer.id}`}
              className="group grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-150 hover:-translate-y-0.5 hover:border-emerald-500/50 hover:shadow-md dark:border-slate-800/80 dark:bg-slate-900/40 dark:shadow-none dark:hover:border-emerald-400/50 dark:hover:bg-slate-900/70"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  {customer.label}
                </h3>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] ${STATUS_BADGE[customer.estatus]}`}
                >
                  {customer.estatus}
                </span>
              </div>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                {customer.segmento}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {loading
                  ? "Cargando casos…"
                  : `${count} ${count === 1 ? "caso" : "casos"} en tu workspace`}
              </p>
              <span className="mt-1 text-xs text-slate-400 transition group-hover:text-emerald-600 dark:text-slate-500 dark:group-hover:text-emerald-300">
                Abrir detalle →
              </span>
            </Link>
          );
        })}
      </div>

      {message ? (
        <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
          {message}
        </div>
      ) : null}
    </section>
  );
}
