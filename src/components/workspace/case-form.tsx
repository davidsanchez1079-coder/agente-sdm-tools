"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { createCase, type CaseRow } from "@/lib/workspace/folders";
import { BRANDS, type BrandId } from "@/lib/brands/brands";
import { CUSTOMERS } from "@/lib/customers/customers";
import {
  CASE_OPERACION_TIPOS,
  CASE_PRIORIDADES,
  type CaseOperacionTipo,
  type CasePrioridad,
} from "@/lib/cases/cases";

type CaseFormProps = {
  folderId: string | null;
  onCreated: (row: CaseRow) => void;
  onMessage?: (message: string | null) => void;
};

const FABRICANTES = BRANDS.filter((brand) => brand.id !== "general");

export function CaseForm({ folderId, onCreated, onMessage }: CaseFormProps) {
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

  async function handleSubmit() {
    if (!folderId || !titulo.trim()) return;
    setSaving(true);
    onMessage?.(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const row = await createCase(supabase, folderId, {
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

  return (
    <div className="grid gap-3">
      <input
        className={controlClass}
        value={titulo}
        onChange={(event) => setTitulo(event.target.value)}
        placeholder="Título del caso"
        disabled={!folderId}
      />

      <select
        className={controlClass}
        value={cliente}
        onChange={(event) => setCliente(event.target.value)}
        disabled={!folderId}
      >
        <option value="">Sin cliente</option>
        {CUSTOMERS.map((customer) => (
          <option key={customer.id} value={customer.label}>
            {customer.label}
          </option>
        ))}
      </select>

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
        onChange={(event) =>
          setMarca(event.target.value as BrandId | "")
        }
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
