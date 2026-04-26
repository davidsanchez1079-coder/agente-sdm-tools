"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useWorkspace } from "@/lib/workspace/context";
import {
  listCustomers,
  type CustomerEstatus,
  type CustomerRow,
} from "@/lib/customers/customers-db";
import {
  MODULE_BAR,
  MODULE_CHIP,
  MODULE_ICON_BG,
} from "@/lib/modules/modules";
import { ModuleIcon } from "@/components/ui/module-icon";

const ESTATUS_LABEL: Record<CustomerEstatus, string> = {
  activo: "Activo",
  prospecto: "Prospecto",
  inactivo: "Inactivo",
  pausado: "Pausado",
};

const STATUS_BADGE: Record<CustomerEstatus, string> = {
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
  const { workspaceId } = useWorkspace();
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const [list, casesRes] = await Promise.all([
          listCustomers(supabase, workspaceId),
          supabase.from("cases").select("cliente").not("cliente", "is", null),
        ]);
        if (casesRes.error) throw casesRes.error;
        if (cancelled) return;

        setCustomers(list);

        const acc: Record<string, number> = {};
        for (const row of (casesRes.data ?? []) as {
          cliente: string | null;
        }[]) {
          const name = row.cliente?.trim();
          if (!name) continue;
          acc[name.toLowerCase()] = (acc[name.toLowerCase()] ?? 0) + 1;
        }
        setCounts(acc);
      } catch (error) {
        if (!cancelled) {
          setMessage(
            error instanceof Error
              ? error.message
              : "No se pudo cargar el catálogo de clientes.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  return (
    <section className="grid gap-6">
      <header
        className={`relative space-y-2 pl-4 before:absolute before:left-0 before:top-1 before:bottom-1 before:w-1 before:rounded-full ${MODULE_BAR.customers}`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${MODULE_ICON_BG.customers}`}
          >
            <ModuleIcon id="customers" />
          </div>
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.25em] ${MODULE_CHIP.customers}`}
          >
            Cliente
          </span>
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Catálogo de clientes
        </h2>
        <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
          Lista del catálogo de tu workspace. Selecciona un cliente para ver
          su detalle, editarlo o eliminarlo.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Cargando catálogo…
        </p>
      ) : customers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-6 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-300">
          Tu catálogo está vacío. Cuando crees casos asignándoles cliente, se
          incorporan aquí automáticamente. También puedes agregar clientes
          desde el formulario de creación de caso con la opción
          &ldquo;+ Nuevo cliente&rdquo;.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {customers.map((customer) => {
            const count = counts[customer.label.toLowerCase()] ?? 0;
            const ubicacion = [customer.ciudad, customer.estado]
              .filter(Boolean)
              .join(", ");
            return (
              <Link
                key={customer.id}
                href={`/app/customers/${customer.id}`}
                className="group relative grid gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 pl-6 shadow-sm transition duration-150 hover:-translate-y-0.5 hover:border-cyan-500/50 hover:shadow-md dark:border-slate-800/80 dark:bg-slate-900/40 dark:shadow-none dark:hover:border-cyan-400/50 dark:hover:bg-slate-900/70 before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-cyan-500/70 dark:before:bg-cyan-400/70"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    {customer.label}
                  </h3>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] ${STATUS_BADGE[customer.estatus]}`}
                  >
                    {ESTATUS_LABEL[customer.estatus]}
                  </span>
                </div>
                {customer.segmento ? (
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    {customer.segmento}
                  </p>
                ) : null}
                {ubicacion ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {ubicacion}
                  </p>
                ) : null}
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {count} {count === 1 ? "caso" : "casos"} en tu workspace
                </p>
                <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-cyan-600 transition group-hover:text-cyan-700 dark:text-cyan-300 dark:group-hover:text-cyan-200">
                  Abrir detalle
                  <span aria-hidden className="transition group-hover:translate-x-0.5">
                    →
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {message ? (
        <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
          {message}
        </div>
      ) : null}
    </section>
  );
}
