"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useIsExterno, useWorkspace } from "@/lib/workspace/context";
import { NoAccess } from "@/components/layout/no-access";
import { listCustomers, type CustomerRow } from "@/lib/customers/customers-db";
import { listMembers } from "@/lib/permisos/permisos-db";
import type { WorkspaceMemberRow } from "@/lib/permisos/permisos-db";
import {
  ESTADOS,
  PRIORIDADES,
  labelEstado,
  labelPrioridad,
} from "@/lib/workspace-tasks/workspace-task-labels";
import { workspaceMembersAssignable } from "@/lib/workspace-tasks/workspace-task-members";
import {
  createWorkspaceTask,
  listWorkspaceTasks,
  type WorkspaceTaskEstado,
  type WorkspaceTaskPrioridad,
  type WorkspaceTaskRow,
} from "@/lib/workspace-tasks/workspace-tasks-db";
import {
  MAX_WORKSPACE_TASK_ATTACHMENT_BYTES,
  WORKSPACE_TASK_ATTACHMENT_BUCKET,
  createWorkspaceTaskNote,
  uploadWorkspaceTaskAttachment,
} from "@/lib/workspace-tasks/workspace-task-notes-db";
import { addWorkspaceTaskCopy } from "@/lib/workspace-tasks/workspace-task-copies-db";
import {
  MODULE_BAR,
  MODULE_CHIP,
  MODULE_ICON_BG,
} from "@/lib/modules/modules";
import { ModuleIcon } from "@/components/ui/module-icon";
import { formatError } from "@/lib/errors/format";

type TaskLastNote = {
  workspace_task_id: string;
  body: string;
  created_at: string;
};

export default function TareasListadoPage() {
  const isExterno = useIsExterno();
  const { workspaceId } = useWorkspace();
  const searchParams = useSearchParams();

  const [tasks, setTasks] = useState<WorkspaceTaskRow[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [assignable, setAssignable] = useState<WorkspaceMemberRow[]>([]);
  const [lastNoteByTaskId, setLastNoteByTaskId] = useState<
    Record<string, TaskLastNote>
  >({});
  const [internalLoading, setInternalLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const loading = !isExterno && internalLoading;

  const [showAlta, setShowAlta] = useState(false);
  const [altaScope, setAltaScope] = useState<"interna" | "cliente">("interna");
  const [altaCustomerId, setAltaCustomerId] = useState("");
  const [altaCustomerQuery, setAltaCustomerQuery] = useState("");
  const [altaAssignedToUserId, setAltaAssignedToUserId] = useState("");
  const [altaTitulo, setAltaTitulo] = useState("");
  const [altaDescripcion, setAltaDescripcion] = useState("");
  const [altaEstado, setAltaEstado] = useState<WorkspaceTaskEstado>("pendiente");
  const [altaPrioridad, setAltaPrioridad] =
    useState<WorkspaceTaskPrioridad>("normal");
  const [altaVenceElLocal, setAltaVenceElLocal] = useState("");
  const [altaPrimerMensaje, setAltaPrimerMensaje] = useState("");
  const [altaCopyToUserId, setAltaCopyToUserId] = useState("");
  const [altaCopies, setAltaCopies] = useState<string[]>([]);
  const [altaUploadingAttachment, setAltaUploadingAttachment] = useState(false);
  const [altaAttachments, setAltaAttachments] = useState<
    { id: string; file: File; kind: "foto" | "archivo" }[]
  >([]);
  const [creating, setCreating] = useState(false);

  function toDatetimeLocalValue(iso: string | null): string {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function fromDatetimeLocalValue(v: string): string | null {
    const t = v.trim();
    if (!t) return null;
    const d = new Date(t);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  }

  function addMsToNow(ms: number): string {
    return toDatetimeLocalValue(new Date(Date.now() + ms).toISOString());
  }

  function formatBytes(bytes: number) {
    if (!Number.isFinite(bytes)) return "";
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    const kb = bytes / 1024;
    return `${Math.round(kb)} KB`;
  }

  useEffect(() => {
    if (searchParams.get("new") === "1") setShowAlta(true);
  }, [searchParams]);

  useEffect(() => {
    if (!showAlta) return;
    // Default: vencer ahora mismo al abrir el alta.
    if (!altaVenceElLocal) setAltaVenceElLocal(addMsToNow(0));
  }, [showAlta, altaVenceElLocal]);

  useEffect(() => {
    if (isExterno) return undefined;
    let cancelled = false;
    void (async () => {
      setInternalLoading(true);
      try {
        const supabase = getSupabaseBrowserClient();
        const [list, customerList, members] = await Promise.all([
          listWorkspaceTasks(supabase, workspaceId),
          listCustomers(supabase, workspaceId),
          listMembers(supabase, workspaceId),
        ]);
        if (cancelled) return;
        setTasks(list);
        setCustomers(customerList);
        const assignableMembers = workspaceMembersAssignable(members);
        setAssignable(assignableMembers);

        const taskIds = list.map((t) => t.id);
        if (taskIds.length === 0) {
          setLastNoteByTaskId({});
          return;
        }

        const { data: noteRows, error: noteError } = await supabase
          .from("workspace_task_notes")
          .select("workspace_task_id, body, created_at")
          .eq("workspace_id", workspaceId)
          .in("workspace_task_id", taskIds)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(500)
          .returns<TaskLastNote[]>();
        if (noteError) throw noteError;

        const map: Record<string, TaskLastNote> = {};
        for (const n of noteRows ?? []) {
          if (!map[n.workspace_task_id]) map[n.workspace_task_id] = n;
        }
        setLastNoteByTaskId(map);
      } catch (error) {
        if (!cancelled) {
          setMessage(
            formatError(error, "No se pudo cargar la lista de tareas."),
          );
        }
      } finally {
        if (!cancelled) setInternalLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceId, isExterno]);

  const altaReady = altaTitulo.trim() !== "";

  async function handleAlta() {
    if (!altaReady) return;
    setCreating(true);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const created = await createWorkspaceTask(supabase, workspaceId, {
        customer_id:
          altaScope === "cliente" && altaCustomerId ? altaCustomerId : null,
        titulo: altaTitulo.trim(),
        descripcion: altaDescripcion.trim() || null,
        estado: altaEstado,
        prioridad: altaPrioridad,
        vence_el: fromDatetimeLocalValue(altaVenceElLocal),
        assigned_to_user_id: altaAssignedToUserId
          ? altaAssignedToUserId
          : null,
      });

      // Copias (opcional)
      if (altaCopies.length > 0) {
        await Promise.all(
          altaCopies.map((userId) =>
            addWorkspaceTaskCopy(supabase, workspaceId, created.id, userId),
          ),
        );
      }

      // Primer mensaje + adjuntos (opcional): crea notas iniciales en el hilo.
      const initialText = altaPrimerMensaje.trim();
      if (initialText || altaAttachments.length > 0) {
        // Si hay adjuntos, los subimos (storage requiere taskId).
        if (altaAttachments.length > 0) {
          const uploaded = await Promise.all(
            altaAttachments.map(async (a) => {
              const up = await uploadWorkspaceTaskAttachment(
                supabase,
                workspaceId,
                created.id,
                a.file,
              );
              return { ...a, uploaded: up } as const;
            }),
          );

          // Primera nota: usa el texto si existe; si no, texto auto.
          const first = uploaded[0];
          await createWorkspaceTaskNote(supabase, workspaceId, created.id, initialText || `Adjunto: ${first.uploaded.filename}`, {
            attachment_storage_path: first.uploaded.storagePath,
            attachment_filename: first.uploaded.filename,
            attachment_mime_type: first.uploaded.mimeType,
            attachment_size_bytes: first.uploaded.sizeBytes,
          });

          // Resto de adjuntos: cada uno como nota separada.
          for (const a of uploaded.slice(1)) {
            await createWorkspaceTaskNote(
              supabase,
              workspaceId,
              created.id,
              `Adjunto: ${a.uploaded.filename}`,
              {
                attachment_storage_path: a.uploaded.storagePath,
                attachment_filename: a.uploaded.filename,
                attachment_mime_type: a.uploaded.mimeType,
                attachment_size_bytes: a.uploaded.sizeBytes,
              },
            );
          }
        } else if (initialText) {
          await createWorkspaceTaskNote(supabase, workspaceId, created.id, initialText);
        }
      }

      setTasks((prev) => [created, ...prev]);
      setAltaScope("interna");
      setAltaCustomerId("");
      setAltaCustomerQuery("");
      setAltaAssignedToUserId("");
      setAltaTitulo("");
      setAltaDescripcion("");
      setAltaEstado("pendiente");
      setAltaPrioridad("normal");
      setAltaVenceElLocal(addMsToNow(0));
      setAltaPrimerMensaje("");
      setAltaCopyToUserId("");
      setAltaCopies([]);
      setAltaAttachments([]);
      setShowAlta(false);
      setMessage("Tarea creada.");
    } catch (error) {
      setMessage(formatError(error, "No se pudo crear la tarea."));
    } finally {
      setCreating(false);
    }
  }

  const controlClass =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-sky-400 dark:focus:ring-sky-400/20";

  if (isExterno) return <NoAccess titulo="Tareas del workspace" />;

  const customersById = new Map(customers.map((c) => [c.id, c]));
  const altaFilteredCustomers =
    altaScope === "cliente"
      ? customers.filter((c) =>
          c.label.toLowerCase().includes(altaCustomerQuery.trim().toLowerCase()),
        )
      : [];

  const assignableIds = new Set(
    assignable.map((m) => m.user_id).filter(Boolean) as string[],
  );
  const altaAssignedOrphan =
    altaAssignedToUserId && !assignableIds.has(altaAssignedToUserId);

  const altaCopiesSet = useMemo(() => new Set(altaCopies), [altaCopies]);

  function addAltaCopy(userId: string) {
    if (!userId) return;
    if (altaCopiesSet.has(userId)) return;
    setAltaCopies((prev) => [...prev, userId]);
  }

  function removeAltaCopy(userId: string) {
    setAltaCopies((prev) => prev.filter((id) => id !== userId));
  }

  async function handlePickedAltaFile(kind: "foto" | "archivo", file: File | null) {
    if (!file) return;
    if (file.size > MAX_WORKSPACE_TASK_ATTACHMENT_BYTES) {
      setMessage(
        `El archivo "${file.name}" supera los 20 MB permitidos.`,
      );
      return;
    }
    setAltaUploadingAttachment(true);
    try {
      setAltaAttachments((prev) => [
        ...prev,
        { id: crypto.randomUUID(), file, kind },
      ]);
    } finally {
      setAltaUploadingAttachment(false);
    }
  }

  function lastActionPreview(taskId: string): string | null {
    const last = lastNoteByTaskId[taskId];
    if (!last) return null;
    const t = last.body.trim().replace(/\s+/g, " ");
    if (!t) return null;
    return t.length > 30 ? `${t.slice(0, 30)}…` : t;
  }

  return (
    <section className="grid gap-6">
      <header
        className={`relative space-y-2 pl-4 before:absolute before:left-0 before:top-1 before:bottom-1 before:w-1 before:rounded-full ${MODULE_BAR.tareas}`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${MODULE_ICON_BG.tareas}`}
          >
            <ModuleIcon id="tareas" />
          </div>
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.25em] ${MODULE_CHIP.tareas}`}
          >
            Tareas
          </span>
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Listado de tareas
        </h2>
        <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
          Aquí ves todas las tareas del workspace. El dashboard es la pantalla principal.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/app/tareas/dashboard"
            className="inline-flex items-center rounded-xl border border-sky-500/60 bg-white px-4 py-2 text-sm font-semibold text-sky-700 shadow-sm transition hover:bg-sky-50 dark:border-sky-400/50 dark:bg-slate-900 dark:text-sky-200 dark:hover:bg-sky-400/10"
          >
            Volver al dashboard →
          </Link>
          <Link
            href="/app/tareas/reciclaje"
            className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
          >
            Bandeja de reciclaje →
          </Link>
        </div>
      </header>

      {message ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200">
          {message}
        </p>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/40 dark:shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Nueva tarea
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              El título es obligatorio. El resto es opcional.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAlta((v) => !v)}
            className="rounded-xl border border-sky-500/60 bg-white px-4 py-2 text-sm font-semibold text-sky-700 shadow-sm transition hover:bg-sky-50 dark:border-sky-400/50 dark:bg-slate-900 dark:text-sky-200 dark:hover:bg-sky-400/10"
          >
            {showAlta ? "Cancelar" : "+ Nueva tarea"}
          </button>
        </div>
        {showAlta ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              id="alta-photo-input"
              onChange={(e) => {
                const file = e.currentTarget.files?.item(0) ?? null;
                e.currentTarget.value = "";
                void handlePickedAltaFile("foto", file);
              }}
            />
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              id="alta-camera-input"
              onChange={(e) => {
                const file = e.currentTarget.files?.item(0) ?? null;
                e.currentTarget.value = "";
                void handlePickedAltaFile("foto", file);
              }}
            />
            <input
              type="file"
              className="hidden"
              id="alta-file-input"
              onChange={(e) => {
                const file = e.currentTarget.files?.item(0) ?? null;
                e.currentTarget.value = "";
                void handlePickedAltaFile("archivo", file);
              }}
            />
            <div className="grid gap-2 sm:col-span-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                Tipo de tarea
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAltaScope("interna");
                    setAltaCustomerId("");
                    setAltaCustomerQuery("");
                  }}
                  disabled={creating}
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                    altaScope === "interna"
                      ? "border-sky-500/50 bg-white text-sky-800 dark:border-sky-400/40 dark:bg-slate-900/60 dark:text-sky-200"
                      : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
                  }`}
                >
                  Interna
                </button>
                <button
                  type="button"
                  onClick={() => setAltaScope("cliente")}
                  disabled={creating}
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                    altaScope === "cliente"
                      ? "border-sky-500/50 bg-white text-sky-800 dark:border-sky-400/40 dark:bg-slate-900/60 dark:text-sky-200"
                      : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
                  }`}
                >
                  Cliente
                </button>
              </div>
            </div>

            {altaScope === "cliente" ? (
              <>
                <label className="grid gap-1.5 text-sm sm:col-span-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                    Buscar cliente
                  </span>
                  <input
                    className={controlClass}
                    value={altaCustomerQuery}
                    onChange={(e) => setAltaCustomerQuery(e.target.value)}
                    placeholder="Escribe para filtrar…"
                    disabled={creating}
                  />
                </label>
                <label className="grid gap-1.5 text-sm sm:col-span-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                    Cliente
                  </span>
                  <select
                    className={controlClass}
                    value={altaCustomerId}
                    onChange={(e) => setAltaCustomerId(e.target.value)}
                    disabled={creating}
                  >
                    <option value="">Selecciona un cliente…</option>
                    {altaFilteredCustomers.slice(0, 50).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 sm:col-span-2">
                Interna (sin cliente asociado).
              </p>
            )}

            <label className="grid gap-1.5 text-sm sm:col-span-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                Título
              </span>
              <input
                className={controlClass}
                value={altaTitulo}
                onChange={(event) => setAltaTitulo(event.target.value)}
                placeholder="Ej. Llamar al cliente"
                disabled={creating}
              />
            </label>
            <label className="grid gap-1.5 text-sm sm:col-span-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                Descripción (opcional)
              </span>
              <textarea
                className={`${controlClass} min-h-[88px] resize-y`}
                value={altaDescripcion}
                onChange={(event) => setAltaDescripcion(event.target.value)}
                placeholder="Notas breves…"
                disabled={creating}
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                Estado
              </span>
              <select
                className={controlClass}
                value={altaEstado}
                onChange={(event) =>
                  setAltaEstado(event.target.value as WorkspaceTaskEstado)
                }
                disabled={creating}
              >
                {ESTADOS.map((e) => (
                  <option key={e} value={e}>
                    {labelEstado(e)}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                Prioridad
              </span>
              <select
                className={controlClass}
                value={altaPrioridad}
                onChange={(event) =>
                  setAltaPrioridad(event.target.value as WorkspaceTaskPrioridad)
                }
                disabled={creating}
              >
                {PRIORIDADES.map((p) => (
                  <option key={p} value={p}>
                    {labelPrioridad(p)}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm sm:col-span-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                Responsable (opcional)
              </span>
              <select
                className={controlClass}
                value={altaAssignedToUserId}
                onChange={(e) => setAltaAssignedToUserId(e.target.value)}
                disabled={creating}
              >
                <option value="">Sin responsable</option>
                {altaAssignedOrphan ? (
                  <option value={altaAssignedToUserId}>
                    Responsable actual (no está en la lista)
                  </option>
                ) : null}
                {assignable.map((m) =>
                  m.user_id ? (
                    <option key={m.id} value={m.user_id}>
                      {m.email}
                    </option>
                  ) : null,
                )}
              </select>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Se elige de miembros reales del workspace con invitación aceptada.
              </span>
            </label>

            <label className="grid gap-1.5 text-sm sm:col-span-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                Copia para (opcional)
              </span>
              <div className="flex flex-wrap gap-2">
                <select
                  className={controlClass}
                  value={altaCopyToUserId}
                  onChange={(e) => setAltaCopyToUserId(e.target.value)}
                  disabled={creating}
                >
                  <option value="">Selecciona un miembro…</option>
                  {assignable.map((m) =>
                    m.user_id ? (
                      <option key={m.id} value={m.user_id}>
                        {m.email}
                      </option>
                    ) : null,
                  )}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    addAltaCopy(altaCopyToUserId);
                    setAltaCopyToUserId("");
                  }}
                  disabled={creating || !altaCopyToUserId}
                  className="rounded-xl border border-emerald-500/40 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-400/30 dark:bg-slate-900/60 dark:text-emerald-200 dark:hover:bg-emerald-400/10"
                >
                  Agregar copia
                </button>
              </div>
              {altaCopies.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {altaCopies.map((userId) => (
                    <button
                      key={userId}
                      type="button"
                      onClick={() => removeAltaCopy(userId)}
                      disabled={creating}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800/80 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:border-rose-400/40 dark:hover:bg-rose-500/10"
                      title="Quitar copia"
                    >
                      {assignable.find((m) => m.user_id === userId)?.email ??
                        "Usuario"}
                      <span
                        aria-hidden
                        className="text-[12px] text-slate-500 dark:text-slate-400"
                      >
                        ×
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Usuarios en copia verán la actividad de esta tarea.
                </span>
              )}
            </label>

            <label className="grid gap-1.5 text-sm sm:col-span-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                Primer mensaje (opcional)
              </span>
              <textarea
                className={`${controlClass} min-h-[88px] resize-y`}
                value={altaPrimerMensaje}
                onChange={(e) => setAltaPrimerMensaje(e.target.value)}
                placeholder="Escribe el primer avance / instrucción…"
                disabled={creating || altaUploadingAttachment}
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    (document.getElementById("alta-camera-input") as HTMLInputElement | null)?.click()
                  }
                  disabled={creating || altaUploadingAttachment}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
                >
                  Tomar foto
                </button>
                <button
                  type="button"
                  onClick={() =>
                    (document.getElementById("alta-photo-input") as HTMLInputElement | null)?.click()
                  }
                  disabled={creating || altaUploadingAttachment}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
                >
                  Subir foto
                </button>
                <button
                  type="button"
                  onClick={() =>
                    (document.getElementById("alta-file-input") as HTMLInputElement | null)?.click()
                  }
                  disabled={creating || altaUploadingAttachment}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
                >
                  Subir archivo
                </button>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Adjuntos hasta 20 MB (bucket: {WORKSPACE_TASK_ATTACHMENT_BUCKET}).
                </span>
              </div>
              {altaAttachments.length > 0 ? (
                <div className="mt-2 grid gap-2">
                  {altaAttachments.map((a) => (
                    <div
                      key={a.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 dark:border-slate-800/80 dark:bg-slate-900/40 dark:text-slate-200"
                    >
                      <span className="font-semibold">
                        {a.kind === "foto" ? "Foto" : "Archivo"}: {a.file.name}{" "}
                        <span className="font-normal text-slate-500 dark:text-slate-400">
                          ({formatBytes(a.file.size)})
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setAltaAttachments((prev) => prev.filter((x) => x.id !== a.id))
                        }
                        disabled={creating}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:text-slate-300 dark:hover:border-rose-400/40 dark:hover:bg-rose-500/10 dark:hover:text-rose-200"
                      >
                        Quitar
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </label>
            <label className="grid gap-1.5 text-sm sm:col-span-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                Vencimiento
              </span>
              <input
                type="datetime-local"
                className={controlClass}
                value={altaVenceElLocal}
                onChange={(e) => setAltaVenceElLocal(e.target.value)}
                disabled={creating}
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setAltaVenceElLocal(addMsToNow(0))}
                  disabled={creating}
                  className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800 transition hover:border-rose-400 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
                >
                  Ahora mismo
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setAltaVenceElLocal(addMsToNow(1 * 60 * 60 * 1000))
                  }
                  disabled={creating}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
                >
                  + 1 hora
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setAltaVenceElLocal(addMsToNow(3 * 60 * 60 * 1000))
                  }
                  disabled={creating}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
                >
                  + 3 horas
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setAltaVenceElLocal(addMsToNow(24 * 60 * 60 * 1000))
                  }
                  disabled={creating}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
                >
                  + 1 día
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setAltaVenceElLocal(addMsToNow(7 * 24 * 60 * 60 * 1000))
                  }
                  disabled={creating}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
                >
                  + 1 semana
                </button>
              </div>
            </label>
            <div className="sm:col-span-2">
              <button
                type="button"
                onClick={() => void handleAlta()}
                disabled={
                  creating ||
                  !altaReady ||
                  (altaScope === "cliente" && !altaCustomerId)
                }
                className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-sky-400 dark:text-slate-950 dark:hover:bg-sky-300"
              >
                {creating ? "Creando…" : "Crear tarea"}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Cargando tareas…
        </p>
      ) : tasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-6 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-300">
          No hay tareas en este workspace. Usa &ldquo;+ Nueva tarea&rdquo; para
          agregar la primera.
        </div>
      ) : (
        <ul className="grid gap-2">
          {tasks.map((task) => (
            <li key={task.id}>
              <Link
                href={`/app/tareas/${task.id}`}
                className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-300 hover:bg-sky-50/40 dark:border-slate-800/80 dark:bg-slate-900/40 dark:shadow-none dark:hover:border-sky-500/40 dark:hover:bg-sky-500/5"
              >
                <p className="font-medium text-slate-900 dark:text-white">
                  {task.titulo}
                </p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {lastActionPreview(task.id) ? (
                    <>
                      <span className="font-semibold">Última acción:</span>{" "}
                      {lastActionPreview(task.id)}
                    </>
                  ) : task.descripcion ? (
                    <span className="line-clamp-2">{task.descripcion}</span>
                  ) : (
                    <span className="text-slate-500 dark:text-slate-500">
                      Sin notas aún.
                    </span>
                  )}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="rounded-lg border border-slate-200 px-2 py-0.5 dark:border-slate-700">
                    {task.customer_id
                      ? `Cliente: ${customersById.get(task.customer_id)?.label ?? "—"}`
                      : "Interna"}
                  </span>
                  <span className="rounded-lg border border-slate-200 px-2 py-0.5 dark:border-slate-700">
                    {labelEstado(task.estado)}
                  </span>
                  <span className="rounded-lg border border-slate-200 px-2 py-0.5 dark:border-slate-700">
                    {labelPrioridad(task.prioridad)}
                  </span>
                  <span>
                    Creada:{" "}
                    {new Date(task.created_at).toLocaleString(undefined, {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
                <p className="mt-2 text-xs font-medium text-sky-700 dark:text-sky-300">
                  Abrir tarea →
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

