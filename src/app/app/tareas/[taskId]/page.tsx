"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useIsExterno, useWorkspace } from "@/lib/workspace/context";
import { NoAccess } from "@/components/layout/no-access";
import { listMembers } from "@/lib/permisos/permisos-db";
import type { WorkspaceMemberRow } from "@/lib/permisos/permisos-db";
import { listCustomers, type CustomerRow } from "@/lib/customers/customers-db";
import {
  ESTADOS,
  PRIORIDADES,
  labelEstado,
  labelPrioridad,
} from "@/lib/workspace-tasks/workspace-task-labels";
import { workspaceMembersAssignable } from "@/lib/workspace-tasks/workspace-task-members";
import {
  getWorkspaceTaskById,
  updateWorkspaceTask,
  deleteWorkspaceTask,
  hardDeleteWorkspaceTask,
  type WorkspaceTaskEstado,
  type WorkspaceTaskPrioridad,
  type WorkspaceTaskRow,
} from "@/lib/workspace-tasks/workspace-tasks-db";
import {
  createWorkspaceTaskNote,
  getWorkspaceTaskAttachmentSignedUrl,
  listWorkspaceTaskNotes,
  uploadWorkspaceTaskAttachment,
  WORKSPACE_TASK_ATTACHMENT_BUCKET,
  type WorkspaceTaskNoteRow,
} from "@/lib/workspace-tasks/workspace-task-notes-db";
import {
  addWorkspaceTaskCopy,
  listWorkspaceTaskCopies,
  removeWorkspaceTaskCopy,
  type WorkspaceTaskCopyRow,
} from "@/lib/workspace-tasks/workspace-task-copies-db";
import {
  MODULE_BAR,
  MODULE_CHIP,
  MODULE_ICON_BG,
} from "@/lib/modules/modules";
import { ModuleIcon } from "@/components/ui/module-icon";
import { formatError } from "@/lib/errors/format";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const ROL_SHORT: Record<WorkspaceMemberRow["rol"], string> = {
  gerente: "Gerente",
  interno: "Interno",
  externo: "Externo",
};

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

type TaskScope = "interna" | "cliente";

type ReassignDuePreset = "keep" | "now" | "1h" | "3h" | "1d" | "1w";

export default function TareaDetallePage() {
  const params = useParams();
  const router = useRouter();
  const taskId = typeof params.taskId === "string" ? params.taskId : "";
  const isExterno = useIsExterno();
  const { workspaceId, appUser } = useWorkspace();

  const [task, setTask] = useState<WorkspaceTaskRow | null>(null);
  const [taskReady, setTaskReady] = useState(false);
  const [assignable, setAssignable] = useState<WorkspaceMemberRow[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [notes, setNotes] = useState<WorkspaceTaskNoteRow[]>([]);
  const [copies, setCopies] = useState<WorkspaceTaskCopyRow[]>([]);
  const [noteBody, setNoteBody] = useState("");
  const [postingNote, setPostingNote] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>(
    {},
  );
  const [reassignToUserId, setReassignToUserId] = useState<string>("");
  const [reassignDuePreset, setReassignDuePreset] =
    useState<ReassignDuePreset>("keep");
  const [reassigning, setReassigning] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [internalLoading, setInternalLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copyToUserId, setCopyToUserId] = useState("");
  const [copyBusy, setCopyBusy] = useState(false);
  const [copiesEnabled, setCopiesEnabled] = useState(true);

  const [scope, setScope] = useState<TaskScope>("interna");
  const [customerId, setCustomerId] = useState<string>("");
  const [customerQuery, setCustomerQuery] = useState("");

  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [estado, setEstado] = useState<WorkspaceTaskEstado>("pendiente");
  const [prioridad, setPrioridad] =
    useState<WorkspaceTaskPrioridad>("normal");
  const [assignedToUserId, setAssignedToUserId] = useState<string>("");
  const [venceElLocal, setVenceElLocal] = useState("");
  const [proximoSeguimiento, setProximoSeguimiento] = useState("");
  const [proximoSeguimientoAtLocal, setProximoSeguimientoAtLocal] =
    useState("");

  const loading = !isExterno && internalLoading;
  const threadRef = useRef<HTMLDivElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isExterno || !taskId) return undefined;
    let cancelled = false;
    void (async () => {
      setInternalLoading(true);
      setLoadError(null);
      setTaskReady(false);
      try {
        const supabase = getSupabaseBrowserClient();
        const [row, members, customerList, noteList] = await Promise.all([
          getWorkspaceTaskById(supabase, workspaceId, taskId),
          listMembers(supabase, workspaceId),
          listCustomers(supabase, workspaceId),
          listWorkspaceTaskNotes(supabase, workspaceId, taskId),
        ]);
        if (cancelled) return;
        setAssignable(workspaceMembersAssignable(members));
        setCustomers(customerList);
        setNotes(noteList);
        // "Copia para" es opcional. Si la tabla no existe, no debe romper la pantalla.
        try {
          const copyList = await listWorkspaceTaskCopies(supabase, workspaceId, taskId);
          if (!cancelled) {
            setCopies(copyList);
            setCopiesEnabled(true);
          }
        } catch {
          if (!cancelled) {
            setCopies([]);
            setCopiesEnabled(false);
          }
        }
        if (!row) {
          setTask(null);
          setTaskReady(true);
          return;
        }
        setTask(row);
        setTaskReady(true);
        const isInternal = row.customer_id == null;
        setScope(isInternal ? "interna" : "cliente");
        setCustomerId(row.customer_id ?? "");
        setTitulo(row.titulo);
        setDescripcion(row.descripcion ?? "");
        setEstado(row.estado);
        setPrioridad(row.prioridad);
        setAssignedToUserId(row.assigned_to_user_id ?? "");
        setReassignToUserId(row.assigned_to_user_id ?? "");
        setVenceElLocal(toDatetimeLocalValue(row.vence_el));
        setProximoSeguimiento(row.proximo_seguimiento ?? "");
        setProximoSeguimientoAtLocal(
          toDatetimeLocalValue(row.proximo_seguimiento_at),
        );
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            formatError(error, "No se pudo cargar la tarea."),
          );
          setTask(null);
          setTaskReady(true);
        }
      } finally {
        if (!cancelled) setInternalLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceId, taskId, isExterno]);

  async function handlePostNote() {
    if (!taskId || !taskReady || !task) return;
    const trimmed = noteBody.trim();
    if (!trimmed) return;
    setPostingNote(true);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const created = await createWorkspaceTaskNote(
        supabase,
        workspaceId,
        taskId,
        trimmed,
      );
      setNotes((prev) => [...prev, created]);
      setNoteBody("");
    } catch (error) {
      setMessage(formatError(error, "No se pudo guardar la nota."));
    } finally {
      setPostingNote(false);
    }
  }

  async function handleConfirmReassign() {
    if (!taskId || !task) return;
    setReassigning(true);
    setMessage(null);
    try {
      const dueIsoByPreset: Record<
        Exclude<ReassignDuePreset, "keep">,
        string
      > = {
        now: new Date().toISOString(),
        "1h": new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
        "3h": new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
        "1d": new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        "1w": new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };
      const venceEl =
        reassignDuePreset === "keep"
          ? undefined
          : dueIsoByPreset[reassignDuePreset];

      const supabase = getSupabaseBrowserClient();
      const updated = await updateWorkspaceTask(supabase, workspaceId, taskId, {
        assigned_to_user_id: reassignToUserId ? reassignToUserId : null,
        ...(venceEl ? { vence_el: venceEl } : {}),
      });
      setTask(updated);
      setAssignedToUserId(updated.assigned_to_user_id ?? "");
      setReassignToUserId(updated.assigned_to_user_id ?? "");
      setReassignDuePreset("keep");
      setMessage("Responsable actualizado.");
    } catch (error) {
      setMessage(formatError(error, "No se pudo reasignar la tarea."));
    } finally {
      setReassigning(false);
    }
  }

  async function handleAddCopy() {
    if (!taskId || !taskReady || !task) return;
    if (!copiesEnabled) return;
    if (!copyToUserId) return;
    setCopyBusy(true);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const created = await addWorkspaceTaskCopy(
        supabase,
        workspaceId,
        taskId,
        copyToUserId,
      );
      setCopies((prev) => [...prev, created]);
      setCopyToUserId("");
      setMessage("Copia agregada.");
    } catch (error) {
      setMessage(formatError(error, "No se pudo agregar la copia."));
    } finally {
      setCopyBusy(false);
    }
  }

  async function handleRemoveCopy(copiedUserId: string) {
    if (!taskId || !taskReady || !task) return;
    if (!copiesEnabled) return;
    setCopyBusy(true);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      await removeWorkspaceTaskCopy(supabase, workspaceId, taskId, copiedUserId);
      setCopies((prev) => prev.filter((c) => c.copied_user_id !== copiedUserId));
      setMessage("Copia eliminada.");
    } catch (error) {
      setMessage(formatError(error, "No se pudo quitar la copia."));
    } finally {
      setCopyBusy(false);
    }
  }

  async function handleGuardarVencimientoSolo() {
    if (!taskId || !task) return;
    setSaving(true);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const updated = await updateWorkspaceTask(supabase, workspaceId, taskId, {
        vence_el: fromDatetimeLocalValue(venceElLocal),
      });
      setTask(updated);
      setVenceElLocal(toDatetimeLocalValue(updated.vence_el));
      setMessage("Vencimiento actualizado.");
    } catch (error) {
      setMessage(formatError(error, "No se pudo actualizar el vencimiento."));
    } finally {
      setSaving(false);
    }
  }

  async function handleGuardar() {
    if (!taskId || !task) return;
    const trimmed = titulo.trim();
    if (!trimmed) {
      setMessage("El título es obligatorio.");
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const updated = await updateWorkspaceTask(supabase, workspaceId, taskId, {
        customer_id: scope === "cliente" && customerId ? customerId : null,
        titulo: trimmed,
        descripcion: descripcion.trim() || null,
        estado,
        prioridad,
        assigned_to_user_id: assignedToUserId ? assignedToUserId : null,
        vence_el: fromDatetimeLocalValue(venceElLocal),
        proximo_seguimiento: proximoSeguimiento.trim() || null,
        proximo_seguimiento_at: fromDatetimeLocalValue(
          proximoSeguimientoAtLocal,
        ),
      });
      setTask(updated);
      setMessage("Cambios guardados.");
    } catch (error) {
      setMessage(formatError(error, "No se pudo guardar la tarea."));
    } finally {
      setSaving(false);
    }
  }

  const controlClass =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-sky-400 dark:focus:ring-sky-400/20";

  if (isExterno) return <NoAccess titulo="Detalle de tarea" />;

  const assignableIds = new Set(
    assignable.map((m) => m.user_id).filter(Boolean) as string[],
  );
  const assignedOrphan =
    assignedToUserId && !assignableIds.has(assignedToUserId);

  const membersByUserId = new Map(
    assignable
      .filter((m) => m.user_id)
      .map((m) => [m.user_id as string, m]),
  );

  const customersById = new Map(customers.map((c) => [c.id, c]));
  const selectedCustomer = customerId ? customersById.get(customerId) : null;
  const filteredCustomers =
    scope === "cliente"
      ? customers.filter((c) =>
          c.label.toLowerCase().includes(customerQuery.trim().toLowerCase()),
        )
      : [];

  const noteControlClass =
    "w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-sky-400 dark:focus:ring-sky-400/20";

  const threadMaxHeightClass = useMemo(() => {
    // ~3 mensajes visibles, el resto con scroll.
    return "max-h-[360px] sm:max-h-[420px]";
  }, []);

  const venceElDirty = useMemo(() => {
    if (!task) return false;
    const next = fromDatetimeLocalValue(venceElLocal);
    const prev = task.vence_el ?? null;
    return next !== prev;
  }, [task, venceElLocal]);

  useEffect(() => {
    const el = threadRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [taskId, notes.length]);

  useEffect(() => {
    const pendingPaths = notes
      .map((n) => n.attachment_storage_path)
      .filter((path): path is string => Boolean(path && !attachmentUrls[path]));
    if (pendingPaths.length === 0) return undefined;

    let cancelled = false;
    void (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const entries = await Promise.all(
          pendingPaths.map(async (path) => [
            path,
            await getWorkspaceTaskAttachmentSignedUrl(supabase, path),
          ] as const),
        );
        if (!cancelled) {
          setAttachmentUrls((prev) => ({
            ...prev,
            ...Object.fromEntries(entries),
          }));
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(formatError(error, "No se pudo cargar un adjunto."));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [notes, attachmentUrls]);

  async function handlePickedFile(kind: "foto" | "archivo", file: File | null) {
    if (!file || !taskId || !taskReady || !task) return;

    setUploadingAttachment(true);
    setMessage(null);
    const supabase = getSupabaseBrowserClient();
    let uploaded: Awaited<ReturnType<typeof uploadWorkspaceTaskAttachment>> | null =
      null;
    try {
      uploaded = await uploadWorkspaceTaskAttachment(
        supabase,
        workspaceId,
        taskId,
        file,
      );
      const body =
        noteBody.trim() ||
        `${kind === "foto" ? "Foto" : "Archivo"} adjunto: ${uploaded.filename}`;
      const created = await createWorkspaceTaskNote(
        supabase,
        workspaceId,
        taskId,
        body,
        {
          attachment_storage_path: uploaded.storagePath,
          attachment_filename: uploaded.filename,
          attachment_mime_type: uploaded.mimeType,
          attachment_size_bytes: uploaded.sizeBytes,
        },
      );
      setNotes((prev) => [...prev, created]);
      setNoteBody("");
      setMessage(`${kind === "foto" ? "Foto" : "Archivo"} guardado en el hilo.`);
    } catch (error) {
      if (uploaded) {
        await supabase.storage
          .from(WORKSPACE_TASK_ATTACHMENT_BUCKET)
          .remove([uploaded.storagePath]);
      }
      setMessage(formatError(error, "No se pudo guardar el adjunto."));
    } finally {
      setUploadingAttachment(false);
    }
  }

  async function handleDeleteTask() {
    if (!taskId || !task) return;
    setDeleting(true);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();

      await deleteWorkspaceTask(supabase, workspaceId, taskId);
      setDeleteOpen(false);
      router.replace("/app/tareas");
    } catch (error) {
      setMessage(formatError(error, "No se pudo eliminar la tarea."));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="grid gap-6">
      <header
        className={`relative space-y-2 pl-4 before:absolute before:left-0 before:top-1 before:bottom-1 before:w-1 before:rounded-full ${MODULE_BAR.tareas}`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/app/tareas"
            className="text-sm font-medium text-sky-700 hover:text-sky-600 dark:text-sky-300 dark:hover:text-sky-200"
          >
            ← Tareas
          </Link>
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.25em] ${MODULE_CHIP.tareas}`}
          >
            Tarea
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl ${MODULE_ICON_BG.tareas}`}
          >
            <ModuleIcon id="tareas" className="h-4 w-4" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {loading ? (
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Cargando…
              </span>
            ) : task ? (
              <>
                <span className="inline-flex max-w-[56ch] items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-800 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/40 dark:text-slate-100">
                  {titulo.trim() || task.titulo}
                </span>
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/40 dark:text-slate-200">
                  Prioridad: {labelPrioridad(prioridad)}
                </span>
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/40 dark:text-slate-200">
                  Creó:{" "}
                  {task.created_by_user_id === appUser.id
                    ? "Tú"
                    : membersByUserId.get(task.created_by_user_id)?.email ??
                      "Usuario"}
                </span>
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/40 dark:text-slate-200">
                  Responsable:{" "}
                  {assignedToUserId
                    ? membersByUserId.get(assignedToUserId)?.email ??
                      "Asignado"
                    : "Sin responsable"}
                </span>
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/40 dark:text-slate-200">
                  Vence:{" "}
                  {task.vence_el
                    ? new Date(task.vence_el).toLocaleString(undefined, {
                        year: "2-digit",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZoneName: "short",
                      })
                    : "—"}
                </span>
              </>
            ) : (
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Tarea
              </span>
            )}
          </div>
        </div>
      </header>

      {loadError ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100">
          {loadError}
        </p>
      ) : null}

      {message ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200">
          {message}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Cargando tarea…
        </p>
      ) : taskReady && task === null ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-6 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-300">
          No se encontró la tarea o no tenés permiso para verla.
        </div>
      ) : taskReady && task ? (
        <div className="grid gap-5">
          <div className="grid max-w-3xl gap-4">
            <header className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                Avances
              </p>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Hilo de la tarea
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Notas cronológicas para registrar avances, acuerdos o
                instrucciones. Sin realtime en esta versión.
              </p>
            </header>

            {notes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-6 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-300">
                Aún no hay notas. Escribe la primera para empezar el hilo.
              </div>
            ) : (
              <div
                ref={threadRef}
                className={`rounded-2xl border border-slate-200 bg-white/60 p-3 shadow-sm ${threadMaxHeightClass} overflow-y-auto dark:border-slate-800/80 dark:bg-slate-900/30 dark:shadow-none`}
              >
                <ul className="grid gap-3">
                  {notes.map((n) => {
                    const isMine = n.created_by_user_id === appUser.id;
                    const author = membersByUserId.get(n.created_by_user_id);
                    const authorLabel = isMine
                      ? "Tú"
                      : author?.email ?? "Usuario";
                    const attachmentUrl = n.attachment_storage_path
                      ? attachmentUrls[n.attachment_storage_path]
                      : null;
                    const isImage =
                      n.attachment_mime_type?.startsWith("image/") ?? false;
                    return (
                      <li
                        key={n.id}
                        className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[46rem] rounded-2xl border px-4 py-3 shadow-sm ${
                            isMine
                              ? "border-sky-200 bg-sky-50 text-slate-900 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-slate-100"
                              : "border-slate-200 bg-white text-slate-900 dark:border-slate-800/80 dark:bg-slate-900/40 dark:text-slate-100"
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                              {authorLabel}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              {new Date(n.created_at).toLocaleString(undefined, {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </span>
                          </div>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800 dark:text-slate-100">
                            {n.body}
                          </p>
                          {n.attachment_storage_path ? (
                            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white/70 dark:border-slate-700 dark:bg-slate-950/40">
                              {attachmentUrl && isImage ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={attachmentUrl}
                                  alt={n.attachment_filename ?? "Adjunto"}
                                  className="max-h-72 w-full object-contain"
                                />
                              ) : null}
                              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs">
                                <span className="font-medium text-slate-700 dark:text-slate-200">
                                  {n.attachment_filename ?? "Adjunto"}
                                </span>
                                {attachmentUrl ? (
                                  <a
                                    href={attachmentUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="font-semibold text-sky-700 hover:text-sky-600 dark:text-sky-300 dark:hover:text-sky-200"
                                  >
                                    Abrir
                                  </a>
                                ) : (
                                  <span className="text-slate-500 dark:text-slate-400">
                                    Cargando…
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/40 dark:shadow-none">
              <label className="grid gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  Nueva nota
                </span>
                <textarea
                  className={`${noteControlClass} min-h-[96px] resize-y`}
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  placeholder="Escribe un avance, acuerdo o instrucción…"
                  disabled={postingNote || uploadingAttachment}
                />
              </label>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.currentTarget.files?.item(0) ?? null;
                    e.currentTarget.value = "";
                    void handlePickedFile("foto", file);
                  }}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.currentTarget.files?.item(0) ?? null;
                    e.currentTarget.value = "";
                    void handlePickedFile("foto", file);
                  }}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.currentTarget.files?.item(0) ?? null;
                    e.currentTarget.value = "";
                    void handlePickedFile("archivo", file);
                  }}
                />
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={uploadingAttachment}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
                >
                  {uploadingAttachment ? "Guardando…" : "Tomar foto"}
                </button>
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={uploadingAttachment}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
                >
                  Subir foto
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAttachment}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
                >
                  Subir archivo
                </button>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Adjuntos hasta 20 MB; las fotos quedan en el hilo.
                </span>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm sm:col-span-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                    Reasignar (opcional)
                  </span>
                  <select
                    className={controlClass}
                    value={reassignToUserId}
                    onChange={(e) => setReassignToUserId(e.target.value)}
                    disabled={reassigning}
                  >
                    <option value="">Sin responsable</option>
                    {assignable.map((m) =>
                      m.user_id ? (
                        <option key={m.id} value={m.user_id}>
                          {m.email} · {ROL_SHORT[m.rol]}
                        </option>
                      ) : null,
                    )}
                  </select>
                </label>

                <label className="grid gap-1.5 text-sm sm:col-span-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                    Copia para (opcional)
                  </span>
                  {!copiesEnabled ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      (Opcional) Activa “Copia para” corriendo la migración de
                      <span className="font-semibold"> workspace_task_copies</span>.
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <select
                      className={controlClass}
                      value={copyToUserId}
                      onChange={(e) => setCopyToUserId(e.target.value)}
                      disabled={copyBusy || !copiesEnabled}
                    >
                      <option value="">Selecciona un miembro…</option>
                      {assignable.map((m) =>
                        m.user_id ? (
                          <option key={m.id} value={m.user_id}>
                            {m.email} · {ROL_SHORT[m.rol]}
                          </option>
                        ) : null,
                      )}
                    </select>
                    <button
                      type="button"
                      onClick={() => void handleAddCopy()}
                      disabled={!copyToUserId || copyBusy || !copiesEnabled}
                      className="rounded-xl border border-emerald-500/40 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-400/30 dark:bg-slate-900/60 dark:text-emerald-200 dark:hover:bg-emerald-400/10"
                    >
                      {copyBusy ? "Aplicando…" : "Agregar copia"}
                    </button>
                  </div>
                  {copies.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {copies.map((c) => {
                        const email =
                          membersByUserId.get(c.copied_user_id)?.email ?? "Usuario";
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => void handleRemoveCopy(c.copied_user_id)}
                            disabled={copyBusy}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800/80 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:border-rose-400/40 dark:hover:bg-rose-500/10"
                            title="Quitar copia"
                          >
                            {email}
                            <span aria-hidden className="text-[12px] text-slate-500 dark:text-slate-400">
                              ×
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      Los usuarios en “copia” reciben avisos cuando hay notas nuevas.
                    </p>
                  )}
                </label>

                <label className="grid gap-1.5 text-sm">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                    Vencimiento (opcional)
                  </span>
                  <select
                    className={controlClass}
                    value={reassignDuePreset}
                    onChange={(e) =>
                      setReassignDuePreset(e.target.value as ReassignDuePreset)
                    }
                    disabled={reassigning}
                  >
                    <option value="keep">Sin cambio</option>
                    <option value="now">La primera opción (vence ahora)</option>
                    <option value="1h">1 hora</option>
                    <option value="3h">3 horas</option>
                    <option value="1d">1 día</option>
                    <option value="1w">1 semana</option>
                  </select>
                </label>

                <button
                  type="button"
                  onClick={() => void handlePostNote()}
                  disabled={postingNote || uploadingAttachment || !noteBody.trim()}
                  className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-sky-400 dark:text-slate-950 dark:hover:bg-sky-300"
                >
                  {postingNote ? "Enviando…" : "Agregar nota"}
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void handleConfirmReassign()}
                  disabled={
                    reassigning ||
                    ((task.assigned_to_user_id ?? "") === reassignToUserId &&
                      reassignDuePreset === "keep")
                  }
                  className="rounded-xl border border-sky-500/40 bg-white px-4 py-2 text-sm font-semibold text-sky-700 shadow-sm transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-sky-400/30 dark:bg-slate-900/60 dark:text-sky-200 dark:hover:bg-sky-400/10"
                >
                  {reassigning ? "Aplicando…" : "Aplicar responsable/vencimiento"}
                </button>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Puedes cambiar solo el vencimiento aunque no reasignes ni escribas nota.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50/60 p-4 dark:border-rose-500/30 dark:bg-rose-500/10">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-rose-900 dark:text-rose-100">
                  Zona peligrosa
                </p>
                <p className="mt-1 text-xs text-rose-800/80 dark:text-rose-100/80">
                  Eliminar mueve la tarea a la papelera por 15 días.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="shrink-0 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-500 dark:bg-rose-500 dark:hover:bg-rose-400"
              >
                Eliminar tarea
              </button>
            </div>
          </div>

          <details className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm open:shadow-sm dark:border-slate-800/80 dark:bg-slate-900/40 dark:shadow-none">
            <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900 dark:text-slate-100">
              Editar detalles de la tarea
              <span className="ml-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                (solo vencimiento)
              </span>
            </summary>
            <div className="mt-4 grid gap-4">
              <label className="grid gap-1.5 text-sm">
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  Vencimiento
                </span>
                <input
                  type="datetime-local"
                  className={controlClass}
                  value={venceElLocal}
                  onChange={(e) => setVenceElLocal(e.target.value)}
                  disabled={saving}
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setVenceElLocal(addMsToNow(1 * 60 * 60 * 1000))
                    }
                    disabled={saving}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
                  >
                    + 1 hora
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setVenceElLocal(addMsToNow(3 * 60 * 60 * 1000))
                    }
                    disabled={saving}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
                  >
                    + 3 horas
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setVenceElLocal(addMsToNow(24 * 60 * 60 * 1000))
                    }
                    disabled={saving}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
                  >
                    + 1 día
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setVenceElLocal(addMsToNow(7 * 24 * 60 * 60 * 1000))
                    }
                    disabled={saving}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
                  >
                    + 1 semana
                  </button>
                </div>
              </label>
              <div>
                {venceElDirty ? (
                  <button
                    type="button"
                    onClick={() => void handleGuardarVencimientoSolo()}
                    disabled={saving}
                    className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-sky-400 dark:text-slate-950 dark:hover:bg-sky-300"
                  >
                    {saving ? "Guardando…" : "Guardar cambios"}
                  </button>
                ) : null}
              </div>
            </div>
          </details>
        </div>
      ) : null}

      <ConfirmDialog
        open={deleteOpen}
        title="Eliminar tarea"
        description="La tarea se moverá a la papelera.\n\nSe conservará 15 días y después se eliminará automáticamente."
        confirmLabel="Sí, mover a papelera"
        cancelLabel="Cancelar"
        tone="destructive"
        busy={deleting}
        onClose={() => (deleting ? null : setDeleteOpen(false))}
        onConfirm={() => void handleDeleteTask()}
      />
    </section>
  );
}
