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
    "border-emerald-500/40 bg-emerald-100 text-emerald-800 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-200",
  prospecto:
    "border-cyan-500/40 bg-cyan-100 text-cyan-800 dark:border-cyan-400/40 dark:bg-cyan-400/10 dark:text-cyan-200",
  inactivo:
    "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
  pausado:
    "border-amber-500/40 bg-amber-100 text-amber-800 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-200",
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
    <section className="grid gap-5">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-300">
          Cliente
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
          Catálogo de clientes
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
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
              className="group grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-emerald-500/40 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-emerald-400/40"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  {customer.label}
                </h3>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-[0.15em] ${STATUS_BADGE[customer.estatus]}`}
                >
                  {customer.estatus}
                </span>
              </div>
              <p className="text-xs uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                {customer.segmento}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {loading
                  ? "Cargando casos…"
                  : `${count} ${count === 1 ? "caso" : "casos"} en tu workspace`}
              </p>
            </Link>
          );
        })}
      </div>

      {message ? (
        <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-300">
          {message}
        </div>
      ) : null}
    </section>
  );
}
