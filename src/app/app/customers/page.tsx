"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useWorkspace } from "@/lib/workspace/context";
import {
  createCustomer,
  listCustomers,
  type CustomerEstatus,
  type CustomerRow,
} from "@/lib/customers/customers-db";
import {
  MEXICO_STATES,
  type MexicoState,
} from "@/lib/locations/mexico-states";
import { citiesForState } from "@/lib/locations/mexico-cities";
import { Combobox } from "@/components/ui/combobox";
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
  const router = useRouter();
  const { workspaceId } = useWorkspace();
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const [showAlta, setShowAlta] = useState(false);
  const [altaName, setAltaName] = useState("");
  const [altaState, setAltaState] = useState<MexicoState | "">("");
  const [altaCity, setAltaCity] = useState("");
  const [altaPotencial, setAltaPotencial] = useState("");
  const [creating, setCreating] = useState(false);

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

  const altaPotencialRaw = altaPotencial.trim().replace(/[,\s]/g, "");
  const altaPotencialNum =
    altaPotencialRaw === "" ? null : Number(altaPotencialRaw);
  const altaPotencialInvalid =
    altaPotencialRaw === "" ||
    Number.isNaN(altaPotencialNum as number) ||
    (altaPotencialNum as number) < 0;

  const altaCityOptions = altaState
    ? citiesForState(altaState).map((c) => c.label)
    : [];

  const altaReady =
    altaName.trim() !== "" &&
    altaState !== "" &&
    altaCity.trim() !== "" &&
    !altaPotencialInvalid;

  async function handleAlta() {
    if (!altaReady) return;
    setCreating(true);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const created = await createCustomer(supabase, workspaceId, {
        label: altaName.trim(),
        estado: altaState as MexicoState,
        ciudad: altaCity,
        potencialMensualUsd:
          altaPotencialNum === null ? null : Math.trunc(altaPotencialNum),
      });
      router.push(`/app/customers/${created.id}`);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo crear el cliente.",
      );
      setCreating(false);
    }
  }

  const controlClass =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-cyan-400 dark:focus:ring-cyan-400/20";

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
          Cliente es el objeto principal del workspace. Cada cliente contiene
          sus oportunidades / casos. Selecciona uno para abrir su detalle, o
          crea uno nuevo abajo.
        </p>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/40 dark:shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Nuevo cliente
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Nombre, ubicación y potencial total mensual son obligatorios.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAlta((v) => !v)}
            className="rounded-xl border border-cyan-400 bg-white px-4 py-2 text-sm font-semibold text-cyan-700 shadow-sm transition hover:bg-cyan-50 dark:border-cyan-400/50 dark:bg-slate-900 dark:text-cyan-200 dark:hover:bg-cyan-400/10"
          >
            {showAlta ? "Cancelar" : "+ Nuevo cliente"}
          </button>
        </div>
        {showAlta ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm sm:col-span-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                Nombre del cliente
              </span>
              <input
                className={controlClass}
                value={altaName}
                onChange={(event) => setAltaName(event.target.value)}
                placeholder="Ej. Industrias del Norte"
                disabled={creating}
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                Estado
              </span>
              <select
                className={controlClass}
                value={altaState}
                onChange={(event) => {
                  setAltaState(event.target.value as MexicoState | "");
                  setAltaCity("");
                }}
                disabled={creating}
              >
                <option value="">Selecciona estado</option>
                {MEXICO_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                Ciudad
              </span>
              <Combobox
                value={altaCity}
                options={altaCityOptions}
                onChange={setAltaCity}
                placeholder={
                  altaState
                    ? "Busca y selecciona"
                    : "Selecciona estado primero"
                }
                disabled={creating || !altaState}
                inputClassName={controlClass}
                emptyMessage="Sin coincidencias en el catálogo"
              />
            </label>
            <label className="grid gap-1.5 text-sm sm:col-span-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                Potencial total mensual (USD)
              </span>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500 dark:text-slate-400">
                  $
                </span>
                <input
                  className={`${controlClass} pl-7`}
                  type="text"
                  inputMode="numeric"
                  value={altaPotencial}
                  onChange={(event) => setAltaPotencial(event.target.value)}
                  placeholder="0"
                  disabled={creating}
                />
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Agregado mensual del cliente; cada caso tendrá además su
                propio potencial individual.
              </span>
            </label>
            <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void handleAlta()}
                disabled={creating || !altaReady}
                className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-cyan-400 dark:text-slate-950 dark:hover:bg-cyan-300"
              >
                {creating ? "Creando…" : "Crear cliente y abrir detalle"}
              </button>
              {!altaReady && (altaName || altaState || altaCity || altaPotencial) ? (
                <span className="text-xs text-amber-600 dark:text-amber-300">
                  Falta completar nombre, estado, ciudad y potencial.
                </span>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Cargando catálogo…
        </p>
      ) : customers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-6 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-300">
          Tu catálogo está vacío. Usa el botón &ldquo;+ Nuevo cliente&rdquo;
          arriba para empezar.
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
