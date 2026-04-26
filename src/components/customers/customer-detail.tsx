"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  countCasesForCustomerLabel,
  deleteCustomer,
  getCustomerById,
  updateCustomer,
  type CustomerEstatus,
  type CustomerRow,
} from "@/lib/customers/customers-db";
import {
  MEXICO_STATES,
  type MexicoState,
} from "@/lib/locations/mexico-states";
import { citiesForState } from "@/lib/locations/mexico-cities";
import { Combobox } from "@/components/ui/combobox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CaseForm } from "@/components/workspace/case-form";
import {
  agenteFullName,
  listAgentes,
  type AgenteRow,
} from "@/lib/agentes/agentes-db";
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

const USD_FORMAT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function formatPotencial(value: number | null): string {
  if (value == null) return "No registrado";
  return `${USD_FORMAT.format(value)} / mes`;
}

async function reloadCases(
  supabase: ReturnType<typeof getSupabaseBrowserClient>,
  customerLabel: string,
): Promise<CaseRow[]> {
  const { data, error } = await supabase
    .from("cases")
    .select(
      "id, titulo, estado, operacion_tipo, operacion, material, created_at",
    )
    .eq("cliente", customerLabel)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CaseRow[];
}

type CustomerDetailProps = {
  customerId: string;
};

export function CustomerDetail({ customerId }: CustomerDetailProps) {
  const router = useRouter();

  const [customer, setCustomer] = useState<CustomerRow | null>(null);
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [labelDraft, setLabelDraft] = useState("");
  const [estadoDraft, setEstadoDraft] = useState<MexicoState | "">("");
  const [ciudadDraft, setCiudadDraft] = useState("");
  const [segmentoDraft, setSegmentoDraft] = useState("");
  const [estatusDraft, setEstatusDraft] = useState<CustomerEstatus>("activo");
  const [potencialDraft, setPotencialDraft] = useState("");
  const [notasDraft, setNotasDraft] = useState("");
  const [secondaryDraft, setSecondaryDraft] = useState<string>("");

  const [agentes, setAgentes] = useState<AgenteRow[]>([]);

  const [saving, setSaving] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmBlocked, setConfirmBlocked] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [refsCount, setRefsCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const row = await getCustomerById(supabase, customerId);
        if (cancelled) return;
        if (!row) {
          setNotFound(true);
          return;
        }
        setCustomer(row);
        setLabelDraft(row.label);
        setEstadoDraft(row.estado ?? "");
        setCiudadDraft(row.ciudad ?? "");
        setSegmentoDraft(row.segmento ?? "");
        setEstatusDraft(row.estatus);
        setPotencialDraft(
          row.potencial_mensual_usd != null
            ? String(row.potencial_mensual_usd)
            : "",
        );
        setNotasDraft(row.notas ?? "");
        setSecondaryDraft(row.secondary_agente_id ?? "");

        const [casesRes, agentesList] = await Promise.all([
          supabase
            .from("cases")
            .select(
              "id, titulo, estado, operacion_tipo, operacion, material, created_at",
            )
            .eq("cliente", row.label)
            .order("created_at", { ascending: false }),
          listAgentes(supabase, row.workspace_id, { onlyActive: true }),
        ]);
        if (casesRes.error) throw casesRes.error;
        if (!cancelled) {
          setCases((casesRes.data ?? []) as CaseRow[]);
          setAgentes(agentesList);
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(
            error instanceof Error
              ? error.message
              : "No se pudo cargar el cliente.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  if (loading) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Cargando cliente…
      </p>
    );
  }

  if (notFound) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/40 dark:shadow-none">
        <p className="text-sm text-slate-700 dark:text-slate-300">
          No encontré ese cliente. Puede estar borrado o no tienes acceso.
        </p>
        <Link
          href="/app/customers"
          className="mt-4 inline-flex rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-cyan-500 hover:bg-cyan-50 dark:border-slate-700 dark:text-slate-200 dark:hover:border-cyan-400 dark:hover:bg-cyan-400/10"
        >
          Volver al catálogo
        </Link>
      </div>
    );
  }

  if (!customer) return null;

  const potencialRaw = potencialDraft.trim().replace(/[,\s]/g, "");
  const potencialNum = potencialRaw === "" ? null : Number(potencialRaw);
  const potencialInvalid =
    potencialRaw !== "" &&
    (Number.isNaN(potencialNum as number) || (potencialNum as number) < 0);

  const cityOptions = estadoDraft
    ? citiesForState(estadoDraft).map((c) => c.label)
    : [];

  const labelTrimmed = labelDraft.trim();
  const ciudadTrimmed = ciudadDraft.trim();
  const segmentoTrimmed = segmentoDraft.trim();
  const notasTrimmed = notasDraft.trim();

  const dirty =
    labelTrimmed !== customer.label ||
    (estadoDraft || null) !== customer.estado ||
    (ciudadTrimmed || null) !== customer.ciudad ||
    (secondaryDraft || null) !== customer.secondary_agente_id ||
    (segmentoTrimmed || null) !== customer.segmento ||
    estatusDraft !== customer.estatus ||
    (potencialNum ?? null) !== customer.potencial_mensual_usd ||
    (notasTrimmed || null) !== customer.notas;

  async function handleSave() {
    if (!customer || !labelTrimmed || potencialInvalid) return;
    setSaving(true);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const updated = await updateCustomer(supabase, customer.id, {
        label: labelTrimmed,
        estado: estadoDraft || null,
        ciudad: ciudadTrimmed || null,
        segmento: segmentoTrimmed || null,
        estatus: estatusDraft,
        potencial_mensual_usd:
          potencialNum === null ? null : Math.trunc(potencialNum),
        notas: notasTrimmed || null,
        secondary_agente_id: secondaryDraft || null,
      });
      setCustomer(updated);
      setLabelDraft(updated.label);
      setEstadoDraft(updated.estado ?? "");
      setCiudadDraft(updated.ciudad ?? "");
      setSegmentoDraft(updated.segmento ?? "");
      setEstatusDraft(updated.estatus);
      setPotencialDraft(
        updated.potencial_mensual_usd != null
          ? String(updated.potencial_mensual_usd)
          : "",
      );
      setNotasDraft(updated.notas ?? "");
      setSecondaryDraft(updated.secondary_agente_id ?? "");
      setMessage("Cliente actualizado.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el cliente.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleAskDelete() {
    if (!customer) return;
    setMessage(null);
    setConfirmBusy(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const count = await countCasesForCustomerLabel(
        supabase,
        customer.workspace_id,
        customer.label,
      );
      setRefsCount(count);
      setConfirmBlocked(count > 0);
      setConfirmOpen(true);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo verificar el cliente antes de borrar.",
      );
    } finally {
      setConfirmBusy(false);
    }
  }

  async function handleConfirmDelete() {
    if (!customer || confirmBlocked) return;
    setConfirmBusy(true);
    try {
      const supabase = getSupabaseBrowserClient();
      await deleteCustomer(supabase, customer.id);
      router.push("/app/customers");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo borrar el cliente.",
      );
      setConfirmBusy(false);
      setConfirmOpen(false);
    }
  }

  const controlClass =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-cyan-400 dark:focus:ring-cyan-400/20";

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
            {ESTATUS_LABEL[customer.estatus]}
          </span>
        </div>
        {customer.segmento ? (
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${MODULE_CHIP.customers}`}
          >
            {customer.segmento}
          </span>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <InfoTile
          label="Ubicación"
          value={
            customer.estado || customer.ciudad
              ? [customer.ciudad, customer.estado].filter(Boolean).join(", ")
              : "Sin asignar"
          }
        />
        <InfoTile
          label="Potencial total mensual"
          value={formatPotencial(customer.potencial_mensual_usd)}
        />
        <InfoTile
          label="Casos"
          value={`${casesCount} ${casesCount === 1 ? "caso" : "casos"}`}
        />
      </div>

      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/40 dark:shadow-none">
        <header>
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            Datos del cliente
          </h3>
        </header>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm">
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Nombre
            </span>
            <input
              className={controlClass}
              value={labelDraft}
              onChange={(event) => setLabelDraft(event.target.value)}
              disabled={saving}
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Estatus
            </span>
            <select
              className={controlClass}
              value={estatusDraft}
              onChange={(event) =>
                setEstatusDraft(event.target.value as CustomerEstatus)
              }
              disabled={saving}
            >
              {(
                ["activo", "prospecto", "inactivo", "pausado"] as const
              ).map((value) => (
                <option key={value} value={value}>
                  {ESTATUS_LABEL[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Estado
            </span>
            <select
              className={controlClass}
              value={estadoDraft}
              onChange={(event) => {
                setEstadoDraft(event.target.value as MexicoState | "");
                setCiudadDraft("");
              }}
              disabled={saving}
            >
              <option value="">Sin asignar</option>
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
              value={ciudadDraft}
              options={cityOptions}
              onChange={setCiudadDraft}
              placeholder={
                estadoDraft
                  ? "Busca y selecciona"
                  : "Selecciona estado primero"
              }
              disabled={saving || !estadoDraft}
              inputClassName={controlClass}
              emptyMessage="Sin coincidencias en el catálogo"
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Segmento
            </span>
            <input
              className={controlClass}
              value={segmentoDraft}
              onChange={(event) => setSegmentoDraft(event.target.value)}
              placeholder="Industrial, Automotriz, Aeroespacial…"
              disabled={saving}
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Agente secundario
            </span>
            <select
              className={controlClass}
              value={secondaryDraft}
              onChange={(event) => setSecondaryDraft(event.target.value)}
              disabled={saving}
            >
              <option value="">Sin asignar</option>
              {agentes.map((agente) => (
                <option key={agente.id} value={agente.id}>
                  {agenteFullName(agente)}
                  {agente.rol_label ? ` — ${agente.rol_label}` : ""}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Persona adicional involucrada con este cliente. Edítalos en
              el catálogo de agentes.
            </span>
          </label>
          <label className="grid gap-1.5 text-sm">
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
                value={potencialDraft}
                onChange={(event) => setPotencialDraft(event.target.value)}
                placeholder="0"
                disabled={saving}
              />
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Agregado mensual del cliente, no por oportunidad individual.
            </span>
          </label>
        </div>
        <label className="grid gap-1.5 text-sm">
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            Notas
          </span>
          <textarea
            className={`${controlClass} min-h-24`}
            value={notasDraft}
            onChange={(event) => setNotasDraft(event.target.value)}
            placeholder="Observaciones, contactos, contexto comercial."
            disabled={saving}
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !dirty || !labelTrimmed || potencialInvalid}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-400 dark:text-slate-950 dark:hover:bg-emerald-300"
          >
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
          {potencialInvalid ? (
            <span className="text-xs text-rose-600 dark:text-rose-300">
              Potencial inválido. Usa un entero ≥ 0.
            </span>
          ) : dirty ? (
            <span className="text-xs text-amber-600 dark:text-amber-300">
              Sin guardar
            </span>
          ) : null}
        </div>
      </div>

      <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/40 dark:shadow-none">
        <header>
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            Crear oportunidad para este cliente
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            El caso queda asociado a {customer.label}. El potencial mensual
            que captures aquí es por oportunidad, no del cliente.
          </p>
        </header>
        <CaseForm
          workspaceId={customer.workspace_id}
          customerLabel={customer.label}
          onCreated={async () => {
            try {
              const supabase = getSupabaseBrowserClient();
              const refreshed = await reloadCases(supabase, customer.label);
              setCases(refreshed);
            } catch (error) {
              setMessage(
                error instanceof Error
                  ? error.message
                  : "Caso creado, pero no se pudo refrescar la lista.",
              );
            }
          }}
          onMessage={setMessage}
        />
      </section>

      <section className="grid gap-3">
        <header className="flex items-baseline justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Casos/Oportunidades
          </h3>
          {casesCount > 0 ? (
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {casesCount} {casesCount === 1 ? "caso" : "casos"}
            </p>
          ) : null}
        </header>

        {cases.length ? (
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

      <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-5 dark:border-rose-500/30 dark:bg-rose-500/5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-rose-700 dark:text-rose-300">
          Eliminar cliente
        </p>
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
          Solo se permite si el cliente no tiene casos asociados. Si tiene
          casos, primero hay que eliminarlos o reasignarlos.
        </p>
        <button
          type="button"
          onClick={() => void handleAskDelete()}
          disabled={confirmBusy}
          className="mt-3 rounded-xl border border-rose-400 bg-white px-4 py-2 text-sm font-semibold text-rose-700 shadow-sm transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-500/40 dark:bg-slate-900 dark:text-rose-200 dark:hover:bg-rose-500/10"
        >
          Borrar cliente
        </button>
      </div>

      {message ? (
        <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-700 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60 dark:text-slate-300 dark:shadow-none">
          {message}
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        title={
          confirmBlocked
            ? `No se puede borrar «${customer.label}»`
            : `¿Borrar a «${customer.label}»?`
        }
        description={
          confirmBlocked
            ? `Este cliente tiene ${refsCount} ${refsCount === 1 ? "caso asociado" : "casos asociados"}. Elimina o reasigna esos casos antes de borrar el cliente.`
            : "Esta acción borra el cliente del catálogo. No se puede deshacer."
        }
        confirmLabel="Borrar cliente"
        tone="destructive"
        blocked={confirmBlocked}
        busy={confirmBusy}
        onConfirm={handleConfirmDelete}
        onClose={() => {
          if (!confirmBusy) setConfirmOpen(false);
        }}
      />
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
