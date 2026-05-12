"use client";

import { useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useWorkspace } from "@/lib/workspace/context";
import { createCase, type CaseRow } from "@/lib/workspace/folders";
import { BRANDS, type BrandId } from "@/lib/brands/brands";
import {
  CASE_CONVERSION_NIVELES,
  CASE_OPERACION_TIPOS,
  CASE_PRIORIDADES,
  type CaseConversionNivel,
  type CaseOperacionTipo,
  type CasePrioridad,
} from "@/lib/cases/cases";
import {
  addInitialCaseShares,
  listShareableMembers,
  type CaseSharePermission,
  type ShareableMember,
} from "@/lib/cases/shares";
import { formatError } from "@/lib/errors/format";

type CaseFormProps = {
  workspaceId: string;
  customerLabel: string;
  onCreated: (row: CaseRow) => void;
  onMessage?: (message: string | null) => void;
};

const FABRICANTES = BRANDS.filter((brand) => brand.id !== "general");

// Form de creación de caso para un cliente específico. Diseñado para
// vivir dentro de customer-detail — el cliente queda fijo (no editable
// desde aquí) y todos los demás campos son inputs estándar. Sigue la
// regla "cada caso vive dentro de un cliente".
export function CaseForm({
  workspaceId,
  customerLabel,
  onCreated,
  onMessage,
}: CaseFormProps) {
  const { appUser } = useWorkspace();
  const [titulo, setTitulo] = useState("");
  const [operacionTipo, setOperacionTipo] = useState<CaseOperacionTipo | "">(
    "",
  );
  const [operacion, setOperacion] = useState("");
  const [material, setMaterial] = useState("");
  const [maquina, setMaquina] = useState("");
  const [marca, setMarca] = useState<BrandId | "">("");
  const [prioridad, setPrioridad] = useState<CasePrioridad>("media");
  const [conversionNivel, setConversionNivel] =
    useState<CaseConversionNivel>("media");
  const [collaboratorUserIds, setCollaboratorUserIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [initialSharePermission, setInitialSharePermission] =
    useState<CaseSharePermission>("edit");
  const [shareableMembers, setShareableMembers] = useState<ShareableMember[]>(
    [],
  );
  const [saving, setSaving] = useState(false);

  const tituloRef = useRef<HTMLInputElement>(null);
  const prevCustomerRef = useRef<string>(customerLabel);

  // Auto-focus al título cuando el form se monta o cuando cambia el
  // cliente de contexto. Evita robo de foco al re-renderizar sin razón.
  useEffect(() => {
    const prev = prevCustomerRef.current;
    prevCustomerRef.current = customerLabel;
    if (customerLabel && customerLabel !== prev) {
      tituloRef.current?.focus();
    }
  }, [customerLabel]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const list = await listShareableMembers(supabase, workspaceId, null);
        if (!cancelled) setShareableMembers(list);
      } catch {
        // Silencioso: si falla, el selector queda vacío y se puede crear
        // caso sin colaboradores iniciales.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  const canSubmit = !!titulo.trim() && !!customerLabel && !!marca;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSaving(true);
    onMessage?.(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const row = await createCase(supabase, workspaceId, {
        titulo: titulo.trim(),
        cliente: customerLabel,
        marcaPreferida: marca,
        operacionTipo: operacionTipo || undefined,
        operacion: operacion.trim() || undefined,
        material: material.trim() || undefined,
        maquina: maquina.trim() || undefined,
        prioridad,
        conversionNivel,
      });
      const toShare = shareableMembers.filter(
        (m) =>
          collaboratorUserIds.has(m.user_id) && m.user_id !== appUser.id,
      );
      if (toShare.length) {
        try {
          await addInitialCaseShares(
            supabase,
            row.id,
            appUser.id,
            toShare,
            initialSharePermission,
          );
        } catch (shareErr) {
          onMessage?.(
            formatError(
              shareErr,
              "Caso creado, pero no se pudieron aplicar todos los compartidos iniciales.",
            ),
          );
          onCreated(row);
          setTitulo("");
          setOperacionTipo("");
          setOperacion("");
          setMaterial("");
          setMaquina("");
          setMarca("");
          setPrioridad("media");
          setConversionNivel("media");
          setCollaboratorUserIds(new Set());
          setInitialSharePermission("edit");
          return;
        }
      }
      onCreated(row);
      setTitulo("");
      setOperacionTipo("");
      setOperacion("");
      setMaterial("");
      setMaquina("");
      setMarca("");
      setPrioridad("media");
      setConversionNivel("media");
      setCollaboratorUserIds(new Set());
      setInitialSharePermission("edit");
      onMessage?.(
        toShare.length
          ? "Caso creado y compartido con los colaboradores seleccionados."
          : "Caso creado.",
      );
    } catch (error) {
      onMessage?.(
        formatError(error, "No se pudo crear el caso."),
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
        ref={tituloRef}
        className={controlClass}
        value={titulo}
        onChange={(event) => setTitulo(event.target.value)}
        placeholder="Título del caso / oportunidad"
      />

      <select
        className={controlClass}
        value={operacionTipo}
        onChange={(event) =>
          setOperacionTipo(event.target.value as CaseOperacionTipo | "")
        }
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
      />
      <input
        className={controlClass}
        value={material}
        onChange={(event) => setMaterial(event.target.value)}
        placeholder="Material"
      />
      <input
        className={controlClass}
        value={maquina}
        onChange={(event) => setMaquina(event.target.value)}
        placeholder="Máquina"
      />

      <select
        className={`${controlClass} ${!marca ? "border-amber-400 dark:border-amber-500/60" : ""}`}
        value={marca}
        onChange={(event) => setMarca(event.target.value as BrandId | "")}
        required
      >
        <option value="">— Selecciona fabricante (obligatorio) —</option>
        {FABRICANTES.map((brand) => (
          <option key={brand.id} value={brand.id}>
            {brand.label}
          </option>
        ))}
      </select>
      {!marca ? (
        <span className="text-xs text-amber-600 dark:text-amber-300">
          El fabricante es obligatorio. Sin marca el caso no aparece para externos asignados a esa marca.
        </span>
      ) : null}

      <select
        className={controlClass}
        value={prioridad}
        onChange={(event) => setPrioridad(event.target.value as CasePrioridad)}
      >
        {CASE_PRIORIDADES.map((row) => (
          <option key={row.id} value={row.id}>
            Prioridad: {row.label}
          </option>
        ))}
      </select>

      <select
        className={controlClass}
        value={conversionNivel}
        onChange={(event) =>
          setConversionNivel(event.target.value as CaseConversionNivel)
        }
      >
        {CASE_CONVERSION_NIVELES.map((row) => (
          <option key={row.id} value={row.id}>
            Conversión: {row.label}
          </option>
        ))}
      </select>

      <div className="grid gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
          Colaboradores iniciales (opcional)
        </span>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Se crean como compartidos del caso (igual que en el detalle). Puedes
          cambiarlos después en Compartir.
        </p>
        <label className="grid gap-1 text-sm">
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            Permiso para los seleccionados
          </span>
          <select
            className={controlClass}
            value={initialSharePermission}
            onChange={(event) =>
              setInitialSharePermission(
                event.target.value as CaseSharePermission,
              )
            }
            disabled={collaboratorUserIds.size === 0}
          >
            <option value="edit">Ver y editar</option>
            <option value="view">Solo ver</option>
          </select>
        </label>
        <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/50">
          {shareableMembers.length === 0 ? (
            <p className="p-3 text-xs text-slate-500">Sin miembros para listar.</p>
          ) : (
            shareableMembers.map((m) => (
              <label
                key={m.user_id}
                className="flex cursor-pointer items-center gap-2 border-b border-slate-200 px-3 py-2 text-sm last:border-b-0 dark:border-slate-700"
              >
                <input
                  type="checkbox"
                  className="rounded border-slate-300"
                  disabled={m.user_id === appUser.id}
                  checked={collaboratorUserIds.has(m.user_id)}
                  onChange={() => {
                    setCollaboratorUserIds((prev) => {
                      const n = new Set(prev);
                      if (n.has(m.user_id)) n.delete(m.user_id);
                      else n.add(m.user_id);
                      return n;
                    });
                  }}
                />
                <span className="text-slate-800 dark:text-slate-100">
                  {m.display_name}{" "}
                  <span className="text-slate-500">({m.email})</span>
                  {m.user_id === appUser.id ? (
                    <span className="text-xs text-slate-400"> — tú</span>
                  ) : null}
                </span>
              </label>
            ))
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={saving || !canSubmit}
        className="rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-cyan-400 dark:text-slate-950 dark:shadow-none dark:hover:bg-cyan-300"
      >
        {saving ? "Creando…" : `Crear caso para ${customerLabel}`}
      </button>
    </div>
  );
}
