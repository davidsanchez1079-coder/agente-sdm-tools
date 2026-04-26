"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  Customer,
  CustomerStatus,
} from "@/lib/customers/customers";
import {
  MODULE_BAR,
  MODULE_CHIP,
  MODULE_ICON_BG,
} from "@/lib/modules/modules";
import { ModuleIcon } from "@/components/ui/module-icon";
import {
  estadoBadge,
  estadoLabel,
  operacionTipoBadge,
  operacionTipoLabel,
  type CaseOperacionTipo,
} from "@/lib/cases/cases";

type CaseRow = {
  id: string;
  titulo: string;
  estado: string;
  operacion_tipo: CaseOperacionTipo | null;
  operacion: string | null;
  material: string | null;
  created_at: string;
};

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
          .select(
            "id, titulo, estado, operacion_tipo, operacion, material, created_at",
          )
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
    <section className="grid min-w-0 gap-6">
      <div
        className={`relative space-y-2 pl-4 before:absolute before:left-0 before:top-1 before:bottom-1 before:w-1 before:rounded-full ${MODULE_BAR.customers}`}
      >
        <Link
          href="/app/customers"
          className="inline-flex items-center gap-1 text-xs font-medium text-cyan-600 transition hover:text-cyan-700 dark:text-cyan-300 dark:hover:text-cyan-200"
        >
          ← Cliente
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${MODULE_ICON_BG.customers}`}
          >
            <ModuleIcon id="customers" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            {customer.label}
          </h2>
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${STATUS_BADGE[customer.estatus]}`}
          >
            {customer.estatus}
          </span>
        </div>
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${MODULE_CHIP.customers}`}
        >
          {customer.segmento}
        </span>
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

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/40 dark:shadow-none">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
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
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
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
                className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-3 pl-5 shadow-sm transition duration-150 hover:-translate-y-0.5 hover:border-emerald-500/50 hover:shadow-md dark:border-slate-800/80 dark:bg-slate-900/40 dark:shadow-none dark:hover:border-emerald-400/50 dark:hover:bg-slate-900/70 before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-emerald-500/70 dark:before:bg-emerald-400/70"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {row.titulo}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] ${estadoBadge(row.estado)}`}
                      >
                        {estadoLabel(row.estado)}
                      </span>
                      {row.operacion_tipo ? (
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] ${operacionTipoBadge(row.operacion_tipo)}`}
                        >
                          {operacionTipoLabel(row.operacion_tipo)}
                        </span>
                      ) : null}
                    </div>
                    {row.operacion ? (
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                        Operación: {row.operacion}
                      </p>
                    ) : null}
                    {row.material ? (
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                        Material: {row.material}
                      </p>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-emerald-600 transition group-hover:translate-x-0.5 dark:text-emerald-300">
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
        <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
          {message}
        </div>
      ) : null}
    </section>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/40 dark:shadow-none">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-medium text-slate-900 dark:text-slate-100">
        {value}
      </p>
    </div>
  );
}
