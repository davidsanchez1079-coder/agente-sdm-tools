"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { createCase } from "@/lib/workspace/folders";

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

export function CaseForm({ folderId, onCreated, onMessage }: CaseFormProps) {
  const [titulo, setTitulo] = useState("");
  const [cliente, setCliente] = useState("");
  const [operacion, setOperacion] = useState("");
  const [material, setMaterial] = useState("");
  const [maquina, setMaquina] = useState("");
  const [marca, setMarca] = useState("");
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

  const inputClass =
    "w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-50 outline-none transition focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="grid gap-3">
      <input
        className={inputClass}
        value={titulo}
        onChange={(event) => setTitulo(event.target.value)}
        placeholder="Título del caso"
        disabled={!folderId}
      />
      <input
        className={inputClass}
        value={cliente}
        onChange={(event) => setCliente(event.target.value)}
        placeholder="Cliente (opcional)"
        disabled={!folderId}
      />
      <input
        className={inputClass}
        value={operacion}
        onChange={(event) => setOperacion(event.target.value)}
        placeholder="Operación"
        disabled={!folderId}
      />
      <input
        className={inputClass}
        value={material}
        onChange={(event) => setMaterial(event.target.value)}
        placeholder="Material"
        disabled={!folderId}
      />
      <input
        className={inputClass}
        value={maquina}
        onChange={(event) => setMaquina(event.target.value)}
        placeholder="Máquina"
        disabled={!folderId}
      />
      <input
        className={inputClass}
        value={marca}
        onChange={(event) => setMarca(event.target.value)}
        placeholder="Marca preferida"
        disabled={!folderId}
      />
      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={!folderId || saving || !titulo.trim()}
        className="rounded-xl bg-cyan-400 px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Creando…" : "Crear caso"}
      </button>
    </div>
  );
}
