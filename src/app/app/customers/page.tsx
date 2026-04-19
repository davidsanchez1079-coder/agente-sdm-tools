"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { CUSTOMERS } from "@/lib/customers/customers";

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
          Lista base del catálogo interno. Al crear un caso, el cliente se
          elige desde esta lista.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CUSTOMERS.map((customer) => {
          const count = counts[customer.label] ?? 0;
          return (
            <article
              key={customer.id}
              className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950/60"
            >
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {customer.label}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {loading
                  ? "Cargando casos…"
                  : `${count} ${count === 1 ? "caso" : "casos"} en tu workspace`}
              </p>
            </article>
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
