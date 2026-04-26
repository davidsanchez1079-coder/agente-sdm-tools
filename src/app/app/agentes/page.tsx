"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useWorkspace } from "@/lib/workspace/context";
import {
  agenteFullName,
  countAgenteUsage,
  createAgente,
  deleteAgente,
  listAgentes,
  updateAgente,
  type AgenteRow,
} from "@/lib/agentes/agentes-db";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  MODULE_BAR,
  MODULE_CHIP,
  MODULE_ICON_BG,
} from "@/lib/modules/modules";
import { ModuleIcon } from "@/components/ui/module-icon";

export default function AgentesPage() {
  const { workspaceId } = useWorkspace();
  const [agentes, setAgentes] = useState<AgenteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const [showAlta, setShowAlta] = useState(false);
  const [altaNombre, setAltaNombre] = useState("");
  const [altaApellido, setAltaApellido] = useState("");
  const [altaRol, setAltaRol] = useState("");
  const [altaEmail, setAltaEmail] = useState("");
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editApellido, setEditApellido] = useState("");
  const [editRol, setEditRol] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editActivo, setEditActivo] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);

  const [pendingDelete, setPendingDelete] = useState<AgenteRow | null>(null);
  const [pendingUsage, setPendingUsage] = useState<{
    customers: number;
    cases: number;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const list = await listAgentes(supabase, workspaceId);
        if (!cancelled) setAgentes(list);
      } catch (error) {
        if (!cancelled) {
          setMessage(
            error instanceof Error
              ? error.message
              : "No se pudo cargar el catálogo de agentes.",
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

  const altaReady = altaNombre.trim() !== "";

  async function handleAlta() {
    if (!altaReady) return;
    setCreating(true);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const created = await createAgente(supabase, workspaceId, {
        nombre: altaNombre.trim(),
        apellido: altaApellido.trim() || null,
        rolLabel: altaRol.trim() || null,
        email: altaEmail.trim() || null,
      });
      setAgentes((prev) =>
        [...prev, created].sort((a, b) => a.nombre.localeCompare(b.nombre)),
      );
      setAltaNombre("");
      setAltaApellido("");
      setAltaRol("");
      setAltaEmail("");
      setShowAlta(false);
      setMessage("Agente creado.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo crear el agente.",
      );
    } finally {
      setCreating(false);
    }
  }

  function startEdit(agente: AgenteRow) {
    setEditingId(agente.id);
    setEditNombre(agente.nombre);
    setEditApellido(agente.apellido ?? "");
    setEditRol(agente.rol_label ?? "");
    setEditEmail(agente.email ?? "");
    setEditActivo(agente.activo);
  }

  async function handleSaveEdit() {
    if (!editingId || !editNombre.trim()) return;
    setSavingEdit(true);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const updated = await updateAgente(supabase, editingId, {
        nombre: editNombre.trim(),
        apellido: editApellido.trim() || null,
        rol_label: editRol.trim() || null,
        email: editEmail.trim() || null,
        activo: editActivo,
      });
      setAgentes((prev) =>
        prev
          .map((a) => (a.id === updated.id ? updated : a))
          .sort((a, b) => a.nombre.localeCompare(b.nombre)),
      );
      setEditingId(null);
      setMessage("Agente actualizado.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el agente.",
      );
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleAskDelete(agente: AgenteRow) {
    setMessage(null);
    setDeleting(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const usage = await countAgenteUsage(supabase, agente.id);
      setPendingDelete(agente);
      setPendingUsage(usage);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo verificar el agente antes de borrar.",
      );
    } finally {
      setDeleting(false);
    }
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setDeleting(true);
    try {
      const supabase = getSupabaseBrowserClient();
      await deleteAgente(supabase, id);
      setAgentes((prev) => prev.filter((a) => a.id !== id));
      setPendingDelete(null);
      setPendingUsage(null);
      setMessage("Agente borrado.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo borrar el agente.",
      );
    } finally {
      setDeleting(false);
    }
  }

  const controlClass =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-teal-400 dark:focus:ring-teal-400/20";

  return (
    <section className="grid gap-6">
      <header
        className={`relative space-y-2 pl-4 before:absolute before:left-0 before:top-1 before:bottom-1 before:w-1 before:rounded-full ${MODULE_BAR.agentes}`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${MODULE_ICON_BG.agentes}`}
          >
            <ModuleIcon id="agentes" />
          </div>
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.25em] ${MODULE_CHIP.agentes}`}
          >
            Agentes
          </span>
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Catálogo de agentes
        </h2>
        <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
          Personas asignables a clientes y casos como agente involucrado
          (técnico, apoyo comercial, otro responsable interno). Pueden ser
          colaboradores que hoy no tienen sesión en el sistema; aquí los
          tienes registrados para asignación y filtros.
        </p>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/40 dark:shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Nuevo agente
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Solo el nombre es obligatorio. Apellido y rol son opcionales.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAlta((v) => !v)}
            className="rounded-xl border border-teal-500/60 bg-white px-4 py-2 text-sm font-semibold text-teal-700 shadow-sm transition hover:bg-teal-50 dark:border-teal-400/50 dark:bg-slate-900 dark:text-teal-200 dark:hover:bg-teal-400/10"
          >
            {showAlta ? "Cancelar" : "+ Nuevo agente"}
          </button>
        </div>
        {showAlta ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1.5 text-sm">
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                Nombre
              </span>
              <input
                className={controlClass}
                value={altaNombre}
                onChange={(event) => setAltaNombre(event.target.value)}
                placeholder="Juan"
                disabled={creating}
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                Apellido
              </span>
              <input
                className={controlClass}
                value={altaApellido}
                onChange={(event) => setAltaApellido(event.target.value)}
                placeholder="Pérez"
                disabled={creating}
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                Rol
              </span>
              <input
                className={controlClass}
                value={altaRol}
                onChange={(event) => setAltaRol(event.target.value)}
                placeholder="Técnico, apoyo comercial…"
                disabled={creating}
              />
            </label>
            <label className="grid gap-1.5 text-sm sm:col-span-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                Correo (opcional)
              </span>
              <input
                className={controlClass}
                type="email"
                value={altaEmail}
                onChange={(event) => setAltaEmail(event.target.value)}
                placeholder="juan.perez@ejemplo.com"
                disabled={creating}
              />
            </label>
            <div className="sm:col-span-3">
              <button
                type="button"
                onClick={() => void handleAlta()}
                disabled={creating || !altaReady}
                className="rounded-xl bg-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-teal-400 dark:text-slate-950 dark:hover:bg-teal-300"
              >
                {creating ? "Creando…" : "Crear agente"}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Cargando catálogo…
        </p>
      ) : agentes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-6 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-300">
          No hay agentes en el catálogo. Usa &ldquo;+ Nuevo agente&rdquo;
          arriba para empezar.
        </div>
      ) : (
        <div className="grid gap-2">
          {agentes.map((agente) => {
            const isEditing = editingId === agente.id;
            return (
              <div
                key={agente.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/40 dark:shadow-none"
              >
                {isEditing ? (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="grid gap-1.5 text-sm">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                        Nombre
                      </span>
                      <input
                        className={controlClass}
                        value={editNombre}
                        onChange={(event) => setEditNombre(event.target.value)}
                        disabled={savingEdit}
                      />
                    </label>
                    <label className="grid gap-1.5 text-sm">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                        Apellido
                      </span>
                      <input
                        className={controlClass}
                        value={editApellido}
                        onChange={(event) =>
                          setEditApellido(event.target.value)
                        }
                        disabled={savingEdit}
                      />
                    </label>
                    <label className="grid gap-1.5 text-sm">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                        Rol
                      </span>
                      <input
                        className={controlClass}
                        value={editRol}
                        onChange={(event) => setEditRol(event.target.value)}
                        disabled={savingEdit}
                      />
                    </label>
                    <label className="grid gap-1.5 text-sm sm:col-span-3">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                        Correo (opcional)
                      </span>
                      <input
                        className={controlClass}
                        type="email"
                        value={editEmail}
                        onChange={(event) => setEditEmail(event.target.value)}
                        placeholder="juan.perez@ejemplo.com"
                        disabled={savingEdit}
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm sm:col-span-3">
                      <input
                        type="checkbox"
                        checked={editActivo}
                        onChange={(event) => setEditActivo(event.target.checked)}
                        disabled={savingEdit}
                        className="h-4 w-4 rounded border-slate-300 text-teal-500 focus:ring-teal-500/30"
                      />
                      <span className="text-slate-700 dark:text-slate-300">
                        Activo (aparece en selectores de asignación)
                      </span>
                    </label>
                    <div className="sm:col-span-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void handleSaveEdit()}
                        disabled={savingEdit || !editNombre.trim()}
                        className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-400 dark:text-slate-950 dark:hover:bg-emerald-300"
                      >
                        {savingEdit ? "Guardando…" : "Guardar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        disabled={savingEdit}
                        className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {agenteFullName(agente)}
                        </p>
                        {agente.rol_label ? (
                          <span className="rounded-full border border-teal-500/40 bg-teal-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.15em] text-teal-700 dark:border-teal-400/40 dark:bg-teal-500/15 dark:text-teal-200">
                            {agente.rol_label}
                          </span>
                        ) : null}
                        {!agente.activo ? (
                          <span className="rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.15em] text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
                            Inactivo
                          </span>
                        ) : null}
                      </div>
                      {agente.email ? (
                        <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                          {agente.email}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => startEdit(agente)}
                      className="shrink-0 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:border-teal-500 hover:bg-teal-50 hover:text-teal-700 dark:border-slate-700 dark:text-slate-200 dark:hover:border-teal-400/60 dark:hover:bg-teal-400/10 dark:hover:text-teal-200"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleAskDelete(agente)}
                      disabled={deleting}
                      className="shrink-0 rounded-lg border border-rose-300 px-2.5 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-500/10"
                    >
                      Borrar
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {message ? (
        <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-700 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60 dark:text-slate-300 dark:shadow-none">
          {message}
        </div>
      ) : null}

      <ConfirmDialog
        open={pendingDelete !== null}
        title={
          pendingDelete
            ? `¿Borrar a «${agenteFullName(pendingDelete)}»?`
            : ""
        }
        description={
          pendingUsage && pendingDelete
            ? pendingUsage.customers + pendingUsage.cases > 0
              ? `Está asignado como secundario a ${pendingUsage.customers} ${pendingUsage.customers === 1 ? "cliente" : "clientes"} y ${pendingUsage.cases} ${pendingUsage.cases === 1 ? "caso" : "casos"}. Al borrar, esas referencias quedan vacías (no se borran ni clientes ni casos).`
              : "No tiene asignaciones. Esta acción no se puede deshacer."
            : "Cargando uso…"
        }
        confirmLabel="Borrar agente"
        tone="destructive"
        busy={deleting}
        onConfirm={handleConfirmDelete}
        onClose={() => {
          if (!deleting) {
            setPendingDelete(null);
            setPendingUsage(null);
          }
        }}
      />
    </section>
  );
}
