"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { createCase } from "@/lib/workspace/folders";
import { BRANDS, type BrandId } from "@/lib/brands/brands";
import { CUSTOMERS } from "@/lib/customers/customers";

type CaseRow = {
  id: string;
  folder_id: string;
  titulo: string;
  cliente: string | null;
  operacion: string | null;
  material: string | null;
  maquina: string | null;
  marca_preferida: string | null;
  estado: string;
  created_at: string;
};

type CaseFormProps = {
  folderId: string | null;
  onCreated: (row: CaseRow) => void;
  onMessage?: (message: string | null) => void;
};

const FABRICANTES = BRANDS.filter((brand) => brand.id !== "general");

export function CaseForm({ folderId, onCreated, onMessage }: CaseFormProps) {
  const [titulo, setTitulo] = useState("");
  const [cliente, setCliente] = useState("");
  const [operacion, setOperacion] = useState("");
  const [material, setMaterial] = useState("");
  const [maquina, setMaquina] = useState("");
  const [marca, setMarca] = useState<BrandId | "">("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!folderId || !titulo.trim()) return;
    setSaving(true);
    onMessage?.(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const row = await createCase(
        supabase,
        folderId,
        titulo.trim(),
        cliente.trim() || undefined,
        operacion.trim() || undefined,
        material.trim() || undefined,
        maquina.trim() || undefined,
        marca.trim() || undefined,
      );
      onCreated(row);
      setTitulo("");
      setCliente("");
      setOperacion("");
      setMaterial("");
      setMaquina("");
      setMarca("");
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
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-cyan-400";

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

      <input
        className={controlClass}
        value={operacion}
        onChange={(event) => setOperacion(event.target.value)}
        placeholder="Operación"
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

      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={!folderId || saving || !titulo.trim()}
        className="rounded-xl bg-cyan-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-cyan-400 dark:text-slate-950 dark:hover:bg-cyan-300"
      >
        {saving ? "Creando…" : "Crear caso"}
      </button>
    </div>
  );
}
