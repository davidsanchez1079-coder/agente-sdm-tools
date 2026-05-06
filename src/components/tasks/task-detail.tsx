"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useCanManage, useWorkspace } from "@/lib/workspace/context";
import {
  listShareableMembers,
  type ShareableMember,
} from "@/lib/cases/shares";
import { listCustomers, type CustomerRow } from "@/lib/customers/customers-db";
import {
  listMembers,
  memberStatus,
  type WorkspaceMemberRow,
} from "@/lib/permisos/permisos-db";
import {
  deleteWorkspaceTask,
  getWorkspaceTask,
  updateWorkspaceTask,
} from "@/lib/tasks/tasks-db";
import {
  addTaskComment,
  deleteTaskComment,
  listTaskComments,
} from "@/lib/tasks/task-comments-db";
import {
  addTaskShare,
  listActiveTaskShares,
  revokeTaskShare,
  updateTaskSharePermission,
} from "@/lib/tasks/task-shares";
import type {
  TaskAttachmentRow,
  TaskCommentWithAuthor,
  TaskEstado,
  TaskPrioridad,
  TaskSharePermission,
  TaskShareRow,
  WorkspaceTaskWithRelations,
} from "@/lib/tasks/types";
import {
  createTaskAttachmentSignedUrl,
  deleteTaskAttachment,
  listTaskAttachments,
  uploadTaskAttachment,
} from "@/lib/tasks/task-attachments-db";
import { DUE_DATE_PRESETS, dueAtFromPreset } from "@/lib/tasks/due-presets";
import {
  MODULE_BAR,
  MODULE_CHIP,
  MODULE_ICON_BG,
} from "@/lib/modules/modules";
import { ModuleIcon } from "@/components/ui/module-icon";
import { formatError } from "@/lib/errors/format";
import { TaskUrgencyBadge } from "./task-urgency-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const ESTADO_LABEL: Record<TaskEstado, string> = {
  pendiente: "Pendiente",
  en_proceso: "En proceso",
  completada: "Completada",
  cerrada: "Cerrada",
};

const PRIORIDAD_LABEL: Record<TaskPrioridad, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  urgente: "Urgente",
};

function displayUser(
  u: { nombre: string; apellido: string | null; email: string } | null | undefined,
) {
  if (!u) return "—";
  const n = [u.nombre, u.apellido].filter(Boolean).join(" ").trim();
  return n || u.email;
}

export function TaskDetail({ taskId }: { taskId: string }) {
  const router = useRouter();
  const { workspaceId, appUser, workspaceRol } = useWorkspace();
  const canManage = useCanManage();

  const [task, setTask] = useState<WorkspaceTaskWithRelations | null>(null);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [members, setMembers] = useState<WorkspaceMemberRow[]>([]);
  const [comments, setComments] = useState<TaskCommentWithAuthor[]>([]);
  const [shares, setShares] = useState<TaskShareRow[]>([]);
  const [shareable, setShareable] = useState<ShareableMember[]>([]);
  const [attachments, setAttachments] = useState<TaskAttachmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [estado, setEstado] = useState<TaskEstado>("pendiente");
  const [prioridad, setPrioridad] = useState<TaskPrioridad>("media");
  const [assigneeId, setAssigneeId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [venceLocal, setVenceLocal] = useState("");
  const [proxSegLocal, setProxSegLocal] = useState("");

  const [commentBody, setCommentBody] = useState("");
  const [shareMemberId, setShareMemberId] = useState("");
  const [sharePermission, setSharePermission] =
    useState<TaskSharePermission>("edit");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const assigneeOptions = useMemo(() => {
    const out: { userId: string; label: string }[] = [];
    for (const m of members) {
      if (memberStatus(m) === "inactivo") continue;
      if (m.rol === "externo") continue;
      if (!m.user_id) continue;
      out.push({ userId: m.user_id, label: m.email });
    }
    return out.sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [members]);

  useEffect(() => {
    if (workspaceRol === "externo") {
      router.replace("/app");
    }
  }, [workspaceRol, router]);

  async function refreshAll() {
    const supabase = getSupabaseBrowserClient();
    const [t, sh, at, comms] = await Promise.all([
      getWorkspaceTask(supabase, taskId),
      listActiveTaskShares(supabase, taskId),
      listTaskAttachments(supabase, taskId),
      listTaskComments(supabase, taskId),
    ]);
    setTask(t);
    setShares(sh);
    setAttachments(at);
    setComments(comms);
    if (t) {
      setTitle(t.title);
      setDescription(t.description ?? "");
      setEstado(t.estado);
      setPrioridad(t.prioridad);
      setAssigneeId(t.assigned_to_user_id);
      setCustomerId(t.customer_id ?? "");
      setVenceLocal(
        t.vence_el ? new Date(t.vence_el).toISOString().slice(0, 16) : "",
      );
      setProxSegLocal(
        t.proximo_seguimiento_at
          ? new Date(t.proximo_seguimiento_at).toISOString().slice(0, 16)
          : "",
      );
    }
  }

  useEffect(() => {
    if (workspaceRol === "externo") return;
    let cancelled = false;
    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const [clist, mlist, collaborators] = await Promise.all([
          listCustomers(supabase, workspaceId),
          listMembers(supabase, workspaceId),
          listShareableMembers(supabase, workspaceId),
        ]);
        if (cancelled) return;
        setCustomers(clist);
        setMembers(mlist);
        setShareable(collaborators);
        await refreshAll();
      } catch (e) {
        if (!cancelled)
          setMessage(
            formatError(e, "No se pudo cargar la tarea."),
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh on taskId/workspace
  }, [taskId, workspaceId, workspaceRol]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!task) return;
    setSaving(true);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      await updateWorkspaceTask(supabase, task.id, {
        title,
        description: description.trim() || null,
        estado,
        prioridad,
        assignedToUserId: assigneeId,
        customerId: customerId || null,
        venceEl: venceLocal ? new Date(venceLocal).toISOString() : null,
        proximoSeguimientoAt: new Date(proxSegLocal).toISOString(),
      });
      await refreshAll();
    } catch (err) {
      setMessage(formatError(err, "No se pudo guardar."));
    } finally {
      setSaving(false);
    }
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentBody.trim()) return;
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      await addTaskComment(supabase, taskId, appUser.id, commentBody);
      setCommentBody("");
      setComments(await listTaskComments(supabase, taskId));
    } catch (err) {
      setMessage(formatError(err, "No se pudo publicar el comentario."));
    }
  }

  async function handleAddShare(e: React.FormEvent) {
    e.preventDefault();
    const member = shareable.find((m) => m.member_id === shareMemberId);
    if (!member) {
      setMessage("Selecciona un miembro.");
      return;
    }
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      await addTaskShare(supabase, taskId, member, appUser.id, sharePermission);
      setShares(await listActiveTaskShares(supabase, taskId));
    } catch (err) {
      setMessage(formatError(err, "No se pudo compartir."));
    }
  }

  async function handleUploadFile(file: File | null) {
    if (!file) return;
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      await uploadTaskAttachment(supabase, taskId, appUser.id, file);
      setAttachments(await listTaskAttachments(supabase, taskId));
    } catch (err) {
      setMessage(formatError(err, "No se pudo subir el archivo."));
    }
  }

  async function openDownload(row: TaskAttachmentRow) {
    try {
      const supabase = getSupabaseBrowserClient();
      const url = await createTaskAttachmentSignedUrl(
        supabase,
        row.storage_path,
        120,
      );
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setMessage(formatError(err, "No se pudo abrir el archivo."));
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      await deleteWorkspaceTask(supabase, taskId);
      router.replace("/app/tareas");
    } catch (err) {
      setMessage(formatError(err, "No se pudo eliminar la tarea."));
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  if (workspaceRol === "externo") {
    return null;
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 text-sm text-slate-500">
        Cargando…
      </main>
    );
  }

  if (!task) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          No se encontró la tarea o no tienes acceso.
        </p>
        <Link
          href="/app/tareas"
          className="mt-4 inline-block text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-300"
        >
          ← Volver a tareas
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <header
        className={`relative mb-6 space-y-2 pl-4 before:absolute before:left-0 before:top-1 before:bottom-1 before:w-1 before:rounded-full ${MODULE_BAR.tareas}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link
              href="/app/tareas"
              className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              ← Tareas
            </Link>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.25em] ${MODULE_CHIP.tareas}`}
              >
                Tarea
              </span>
              <TaskUrgencyBadge venceEl={task.vence_el} estado={task.estado} />
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
              {task.title}
            </h1>
          </div>
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-xl ${MODULE_ICON_BG.tareas}`}
          >
            <ModuleIcon id="tareas" className="h-5 w-5" />
          </div>
        </div>
      </header>

      {message ? (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100">
          {message}
        </div>
      ) : null}

      {task.case_id ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900/50">
          <span className="text-slate-600 dark:text-slate-400">Caso vinculado:</span>
          <Link
            href={`/app/caso/${task.case_id}`}
            className="font-medium text-emerald-700 hover:underline dark:text-emerald-300"
          >
            Abrir caso
          </Link>
        </div>
      ) : (
        <div className="mb-4 rounded-xl border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
          <span className="font-medium text-slate-700 dark:text-slate-300">
            Promover a caso:
          </span>{" "}
          próximamente
        </div>
      )}

      <form
        onSubmit={(e) => void handleSave(e)}
        className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/40"
      >
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
          Editar
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Título
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              required
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Descripción
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Estado
            </span>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value as TaskEstado)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            >
              {(Object.keys(ESTADO_LABEL) as TaskEstado[]).map((k) => (
                <option key={k} value={k}>
                  {ESTADO_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Prioridad
            </span>
            <select
              value={prioridad}
              onChange={(e) => setPrioridad(e.target.value as TaskPrioridad)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            >
              {(Object.keys(PRIORIDAD_LABEL) as TaskPrioridad[]).map((k) => (
                <option key={k} value={k}>
                  {PRIORIDAD_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Responsable
            </span>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            >
              {assigneeOptions.map((o) => (
                <option key={o.userId} value={o.userId}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Cliente (opcional)
            </span>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="">—</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Vence
            </span>
            <input
              type="datetime-local"
              value={venceLocal}
              onChange={(e) => setVenceLocal(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
            <div className="mt-1 flex flex-wrap gap-1">
              {DUE_DATE_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() =>
                    setVenceLocal(
                      dueAtFromPreset(p.id).toISOString().slice(0, 16),
                    )
                  }
                  className="rounded-md border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Próximo seguimiento
            </span>
            <input
              type="datetime-local"
              value={proxSegLocal}
              onChange={(e) => setProxSegLocal(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              required
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900"
          >
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
          {canManage ? (
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-medium text-rose-800 hover:bg-rose-50 dark:border-rose-500/40 dark:text-rose-200 dark:hover:bg-rose-500/10"
            >
              Eliminar tarea
            </button>
          ) : null}
        </div>
      </form>

      <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
          Comentarios
        </h2>
        <ul className="mt-3 space-y-3">
          {comments.map((c) => (
            <li
              key={c.id}
              className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950/50"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {displayUser(c.author)}
                </span>
                <span>
                  {new Date(c.created_at).toLocaleString("es-MX", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-slate-800 dark:text-slate-200">
                {c.body}
              </p>
              {c.author_user_id === appUser.id || canManage ? (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const supabase = getSupabaseBrowserClient();
                      await deleteTaskComment(supabase, c.id);
                      setComments(await listTaskComments(supabase, taskId));
                    } catch (err) {
                      setMessage(formatError(err, "No se pudo completar la acción."));
                    }
                  }}
                  className="mt-2 text-[11px] font-medium text-rose-600 hover:underline dark:text-rose-400"
                >
                  Eliminar
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        <form onSubmit={(e) => void handleAddComment(e)} className="mt-4">
          <textarea
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            rows={2}
            placeholder="Escribe un comentario…"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
          <button
            type="submit"
            className="mt-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900"
          >
            Publicar
          </button>
        </form>
      </section>

      <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
          Colaboradores
        </h2>
        <ul className="mt-3 space-y-2 text-sm">
          {shares.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-800"
            >
              <span>{s.shared_with_email}</span>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={s.permission}
                  onChange={async (e) => {
                    try {
                      const supabase = getSupabaseBrowserClient();
                      await updateTaskSharePermission(
                        supabase,
                        s.id,
                        e.target.value as TaskSharePermission,
                      );
                      setShares(await listActiveTaskShares(supabase, taskId));
                    } catch (err) {
                      setMessage(formatError(err, "No se pudo completar la acción."));
                    }
                  }}
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-950"
                >
                  <option value="view">Solo ver</option>
                  <option value="edit">Editar</option>
                </select>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const supabase = getSupabaseBrowserClient();
                      await revokeTaskShare(supabase, s.id);
                      setShares(await listActiveTaskShares(supabase, taskId));
                    } catch (err) {
                      setMessage(formatError(err, "No se pudo completar la acción."));
                    }
                  }}
                  className="text-xs font-medium text-rose-600 hover:underline"
                >
                  Revocar
                </button>
              </div>
            </li>
          ))}
        </ul>
        <form onSubmit={(e) => void handleAddShare(e)} className="mt-4 flex flex-wrap gap-2">
          <select
            value={shareMemberId}
            onChange={(e) => setShareMemberId(e.target.value)}
            className="min-w-[12rem] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          >
            <option value="">Miembro…</option>
            {shareable.map((m) => (
              <option key={m.member_id} value={m.member_id}>
                {m.display_name} ({m.rol})
              </option>
            ))}
          </select>
          <select
            value={sharePermission}
            onChange={(e) =>
              setSharePermission(e.target.value as TaskSharePermission)
            }
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          >
            <option value="view">Solo ver</option>
            <option value="edit">Editar</option>
          </select>
          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900"
          >
            Compartir
          </button>
        </form>
      </section>

      <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
          Adjuntos
        </h2>
        <input
          type="file"
          onChange={(e) => void handleUploadFile(e.target.files?.[0] ?? null)}
          className="mt-3 block w-full text-sm"
        />
        <ul className="mt-3 space-y-2 text-sm">
          {attachments.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-800"
            >
              <button
                type="button"
                onClick={() => void openDownload(a)}
                className="text-left font-medium text-emerald-700 hover:underline dark:text-emerald-300"
              >
                {a.filename}
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const supabase = getSupabaseBrowserClient();
                    await deleteTaskAttachment(supabase, a);
                    setAttachments(await listTaskAttachments(supabase, taskId));
                  } catch (err) {
                    setMessage(formatError(err, "No se pudo completar la acción."));
                  }
                }}
                className="text-xs text-rose-600 hover:underline"
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      </section>

      <ConfirmDialog
        open={deleteOpen}
        title="Eliminar tarea"
        description="Se borrarán comentarios, adjuntos y compartidos asociados. Esta acción no se puede deshacer."
        confirmLabel={deleting ? "Eliminando…" : "Eliminar"}
        busy={deleting}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => void confirmDelete()}
      />
    </main>
  );
}
