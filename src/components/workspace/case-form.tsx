"use client";

import { useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { createCase, type CaseRow } from "@/lib/workspace/folders";
import { BRANDS, type BrandId } from "@/lib/brands/brands";
import {
  createCustomer,
  listCustomers,
  type CustomerRow,
} from "@/lib/customers/customers-db";
import {
  CASE_OPERACION_TIPOS,
  CASE_PRIORIDADES,
  type CaseOperacionTipo,
  type CasePrioridad,
} from "@/lib/cases/cases";
import {
  MEXICO_STATES,
  type MexicoState,
} from "@/lib/locations/mexico-states";
import { citiesForState } from "@/lib/locations/mexico-cities";
import { Combobox } from "@/components/ui/combobox";

type CaseFormProps = {
  workspaceId: string;
  folderId: string | null;
  onCreated: (row: CaseRow) => void;
  onMessage?: (message: string | null) => void;
};

const FABRICANTES = BRANDS.filter((brand) => brand.id !== "general");

export function CaseForm({
  workspaceId,
  folderId,
  onCreated,
  onMessage,
}: CaseFormProps) {
  const [titulo, setTitulo] = useState("");
  const [cliente, setCliente] = useState("");
  const [operacionTipo, setOperacionTipo] = useState<CaseOperacionTipo | "">(
    "",
  );
  const [operacion, setOperacion] = useState("");
  const [material, setMaterial] = useState("");
  const [maquina, setMaquina] = useState("");
  const [marca, setMarca] = useState<BrandId | "">("");
  const [prioridad, setPrioridad] = useState<CasePrioridad>("media");
  const [saving, setSaving] = useState(false);

  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerState, setNewCustomerState] = useState<MexicoState | "">(
    "",
  );
  const [newCustomerCity, setNewCustomerCity] = useState("");
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  const tituloRef = useRef<HTMLInputElement>(null);
  const prevFolderIdRef = useRef<string | null>(folderId);

  // Auto-focus al título cuando una carpeta recién se selecciona (null → set).
  // No roba foco al cambiar entre carpetas ya seleccionadas.
  useEffect(() => {
    const prev = prevFolderIdRef.current;
    prevFolderIdRef.current = folderId;
    if (folderId && !prev) tituloRef.current?.focus();
  }, [folderId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const list = await listCustomers(supabase, workspaceId);
        if (!cancelled) setCustomers(list);
      } catch (error) {
        if (!cancelled) {
          onMessage?.(
            error instanceof Error
              ? error.message
              : "No se pudo cargar el catálogo de clientes.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceId, onMessage]);

  async function handleCreateCustomer() {
    const trimmed = newCustomerName.trim();
    if (!trimmed || !newCustomerState || !newCustomerCity) return;
    setCreatingCustomer(true);
    onMessage?.(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const created = await createCustomer(supabase, workspaceId, {
        label: trimmed,
        estado: newCustomerState,
        ciudad: newCustomerCity,
      });
      setCustomers((prev) =>
        [...prev, created].sort((a, b) => a.label.localeCompare(b.label)),
      );
      setCliente(created.label);
      setNewCustomerName("");
      setNewCustomerState("");
      setNewCustomerCity("");
      setShowNewCustomer(false);
      onMessage?.("Cliente creado y seleccionado.");
    } catch (error) {
      onMessage?.(
        error instanceof Error
          ? error.message
          : "No se pudo crear el cliente.",
      );
    } finally {
      setCreatingCustomer(false);
    }
  }

  async function handleSubmit() {
    if (!folderId || !titulo.trim()) return;
    setSaving(true);
    onMessage?.(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const row = await createCase(supabase, folderId, workspaceId, {
        titulo: titulo.trim(),
        cliente: cliente.trim() || undefined,
        operacionTipo: operacionTipo || undefined,
        operacion: operacion.trim() || undefined,
        material: material.trim() || undefined,
        maquina: maquina.trim() || undefined,
        marcaPreferida: marca.trim() || undefined,
        prioridad,
      });
      onCreated(row);
      setTitulo("");
      setCliente("");
      setOperacionTipo("");
      setOperacion("");
      setMaterial("");
      setMaquina("");
      setMarca("");
      setPrioridad("media");
      onMessage?.("Caso creado.");
    } catch (error) {
      onMessage?.(
        error instanceof Error
          ? error.message
          : "No se pudo crear el caso.",
      );
    } finally {
      setSaving(false);
    }
  }

  const controlClass =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-cyan-400 dark:focus:ring-cyan-400/20";

  const citiesForNewCustomer = newCustomerState
    ? citiesForState(newCustomerState).map((c) => c.label)
    : [];

  return (
    <div className="grid gap-3">
      <input
        ref={tituloRef}
        className={controlClass}
        value={titulo}
        onChange={(event) => setTitulo(event.target.value)}
        placeholder="Título del caso"
        disabled={!folderId}
      />

      <div className="grid gap-2">
        <select
          className={controlClass}
          value={cliente}
          onChange={(event) => setCliente(event.target.value)}
          disabled={!folderId}
        >
          <option value="">Sin cliente</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.label}>
              {customer.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setShowNewCustomer((v) => !v)}
          disabled={!folderId}
          className="self-start text-xs font-medium text-cyan-700 transition hover:text-cyan-800 disabled:cursor-not-allowed disabled:opacity-60 dark:text-cyan-300 dark:hover:text-cyan-200"
        >
          {showNewCustomer ? "Cancelar nuevo cliente" : "+ Nuevo cliente"}
        </button>
        {showNewCustomer ? (
          <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800/80 dark:bg-slate-900/40">
            <input
              className={controlClass}
              value={newCustomerName}
              onChange={(event) => setNewCustomerName(event.target.value)}
              placeholder="Nombre del cliente"
              disabled={creatingCustomer}
            />
            <select
              className={controlClass}
              value={newCustomerState}
              onChange={(event) => {
                setNewCustomerState(event.target.value as MexicoState | "");
                setNewCustomerCity("");
              }}
              disabled={creatingCustomer}
            >
              <option value="">Estado</option>
              {MEXICO_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
            <Combobox
              value={newCustomerCity}
              options={citiesForNewCustomer}
              onChange={setNewCustomerCity}
              placeholder={
                newCustomerState
                  ? "Ciudad (busca y selecciona)"
                  : "Selecciona estado primero"
              }
              disabled={creatingCustomer || !newCustomerState}
              inputClassName={controlClass}
              emptyMessage="Sin coincidencias en el catálogo"
            />
            <button
              type="button"
              onClick={() => void handleCreateCustomer()}
              disabled={
                creatingCustomer ||
                !newCustomerName.trim() ||
                !newCustomerState ||
                !newCustomerCity
              }
              className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-cyan-400 dark:text-slate-950 dark:hover:bg-cyan-300"
            >
              {creatingCustomer ? "Creando…" : "Crear cliente"}
            </button>
          </div>
        ) : null}
      </div>

      <select
        className={controlClass}
        value={operacionTipo}
        onChange={(event) =>
          setOperacionTipo(event.target.value as CaseOperacionTipo | "")
        }
        disabled={!folderId}
      >
        <option value="">Tipo de operación</option>
        {CASE_OPERACION_TIPOS.map((row) => (
          <option key={row.id} value={row.id}>
            {row.label}
          </option>
        ))}
      </select>
      <input
        className={controlClass}
        value={operacion}
        onChange={(event) => setOperacion(event.target.value)}
        placeholder="Detalle de operación (opcional)"
        disabled={!folderId}
      />
      <input
        className={controlClass}
        value={material}
        onChange={(event) => setMaterial(event.target.value)}
        placeholder="Material"
        disabled={!folderId}
      />
      <input
        className={controlClass}
        value={maquina}
        onChange={(event) => setMaquina(event.target.value)}
        placeholder="Máquina"
        disabled={!folderId}
      />

      <select
        className={controlClass}
        value={marca}
        onChange={(event) => setMarca(event.target.value as BrandId | "")}
        disabled={!folderId}
      >
        <option value="">Sin fabricante</option>
        {FABRICANTES.map((brand) => (
          <option key={brand.id} value={brand.id}>
            {brand.label}
          </option>
        ))}
      </select>

      <select
        className={controlClass}
        value={prioridad}
        onChange={(event) => setPrioridad(event.target.value as CasePrioridad)}
        disabled={!folderId}
      >
        {CASE_PRIORIDADES.map((row) => (
          <option key={row.id} value={row.id}>
            Prioridad: {row.label}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={!folderId || saving || !titulo.trim()}
        className="rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-cyan-400 dark:text-slate-950 dark:shadow-none dark:hover:bg-cyan-300"
      >
        {saving ? "Creando…" : "Crear caso"}
      </button>
    </div>
  );
}
