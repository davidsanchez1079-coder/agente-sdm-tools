"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  Customer,
  CustomerStatus,
} from "@/lib/customers/customers";

type CaseRow = {
  id: string;
  titulo: string;
  estado: string;
  operacion: string | null;
  material: string | null;
  created_at: string;
};

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

type CustomerDetailProps = {
  customer: Customer;
};

export function CustomerDetail({ customer }: CustomerDetailProps) {
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase
          .from("cases")
          .select("id, titulo, estado, operacion, material, created_at")
          .eq("cliente", customer.label)
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (cancelled) return;
        setCases((data ?? []) as CaseRow[]);
      } catch (error) {
        if (!cancelled) {
          setMessage(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar los casos del cliente.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customer.label]);

  const casesCount = cases.length;

  return (
    <section className="grid min-w-0 gap-5">
      <div>
        <Link
          href="/app/customers"
          className="text-xs text-slate-500 transition hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-300"
        >
          ← Cliente
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
            {customer.label}
          </h2>
          <span
            className={`rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-[0.15em] ${STATUS_BADGE[customer.estatus]}`}
          >
            {customer.estatus}
          </span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <InfoTile label="Segmento" value={customer.segmento} />
        <InfoTile label="Estatus" value={customer.estatus} />
        <InfoTile
          label="Casos"
          value={
            loading
              ? "…"
              : `${casesCount} ${casesCount === 1 ? "caso" : "casos"}`
          }
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950/60">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          Notas
        </p>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700 dark:text-slate-300">
          {customer.notas}
        </p>
      </div>

      <section className="grid gap-3">
        <header className="flex items-baseline justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Casos asociados
          </h3>
          {!loading && casesCount > 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {casesCount} {casesCount === 1 ? "caso" : "casos"}
            </p>
          ) : null}
        </header>

        {loading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Cargando casos…
          </p>
        ) : cases.length ? (
          <div className="grid gap-2">
            {cases.map((row) => (
              <Link
                key={row.id}
                href={`/app/caso/${row.id}`}
                className="group rounded-xl border border-slate-200 bg-white p-3 transition hover:border-cyan-500/40 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-cyan-400/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                      {row.titulo}
                    </p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      {row.estado}
                    </p>
                    {row.operacion ? (
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Operación: {row.operacion}
                      </p>
                    ) : null}
                    {row.material ? (
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Material: {row.material}
                      </p>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-xs text-slate-400 transition group-hover:text-emerald-500 dark:text-slate-500">
                    →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
            Este cliente todavía no tiene casos en tu workspace.
          </p>
        )}
      </section>

      {message ? (
        <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-300">
          {message}
        </div>
      ) : null}
    </section>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/70">
      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-2 break-words text-sm text-slate-900 dark:text-slate-100">
        {value}
      </p>
    </div>
  );
}
