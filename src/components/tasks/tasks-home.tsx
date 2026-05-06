"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getClientEnv } from "@/lib/env";
import { useWorkspace, type AppUser } from "@/lib/workspace/context";
import { listCustomers, type CustomerRow } from "@/lib/customers/customers-db";
import {
  listMembers,
  memberStatus,
  type WorkspaceMemberRow,
} from "@/lib/permisos/permisos-db";
import {
  createWorkspaceTask,
  listWorkspaceTasks,
} from "@/lib/tasks/tasks-db";
import { DUE_DATE_PRESETS, dueAtFromPreset } from "@/lib/tasks/due-presets";
import type {
  TaskEstado,
  TaskPrioridad,
  WorkspaceTaskWithRelations,
} from "@/lib/tasks/types";
import {
  MODULE_BAR,
  MODULE_CHIP,
  MODULE_ICON_BG,
} from "@/lib/modules/modules";
import { ModuleIcon } from "@/components/ui/module-icon";
import { formatError } from "@/lib/errors/format";
import { TaskUrgencyBadge, sortTasksByUrgency } from "./task-urgency-badge";

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

type AssigneeOption = {
  userId: string;
  label: string;
};

/** Igual que `auth.uid()` en RLS: claim `sub` del JWT que PostgREST envía. */
type TareasDebugSnapshot = {
  supabaseUrl: string | null;
  supabaseHost: string | null;
  sessionUserId: string | null;
  sessionUserEmail: string | null;
  getUserId: string | null;
  getUserError: string | null;
  sessionVsGetUserMismatch: boolean;
  appUserId: string;
  appAuthUserId: string;
  appUserEmail: string;
  sessionVsAppUserMismatch: boolean;
  workspaceId: string;
  workspaceRol: string;
  capturedAt: string;
};

async function captureTareasDebugSnapshot(
  supabase: ReturnType<typeof getSupabaseBrowserClient>,
  ctx: { appUser: AppUser; workspaceId: string; workspaceRol: string },
): Promise<TareasDebugSnapshot> {
  const { NEXT_PUBLIC_SUPABASE_URL } = getClientEnv();
  const url = NEXT_PUBLIC_SUPABASE_URL ?? null;
  let host: string | null = null;
  try {
    host = url ? new URL(url).host : null;
  } catch {
    host = null;
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const sessionUid = sessionData.session?.user?.id ?? null;
  const sessionEmail = sessionData.session?.user?.email ?? null;

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const getUserId = userData.user?.id ?? null;

  return {
    supabaseUrl: url,
    supabaseHost: host,
    sessionUserId: sessionUid,
    sessionUserEmail: sessionEmail,
    getUserId,
    getUserError: userErr?.message ?? null,
    sessionVsGetUserMismatch: Boolean(
      sessionUid && getUserId && sessionUid !== getUserId,
    ),
    appUserId: ctx.appUser.id,
    appAuthUserId: ctx.appUser.authUserId,
    appUserEmail: ctx.appUser.email,
    sessionVsAppUserMismatch: Boolean(
      sessionUid && sessionUid !== ctx.appUser.authUserId,
    ),
    workspaceId: ctx.workspaceId,
    workspaceRol: ctx.workspaceRol,
    capturedAt: new Date().toISOString(),
  };
}

/** Panel temporal solo con ?debugTareas=1 (diagnóstico capturable). */
function TareasDebugFixedPanel({
  snapshot,
  fallbackWorkspaceId,
  fallbackWorkspaceRol,
  fallbackAppUser,
}: {
  snapshot: TareasDebugSnapshot | null;
  fallbackWorkspaceId: string;
  fallbackWorkspaceRol: string;
  fallbackAppUser: AppUser;
}) {
  const supabaseHost = snapshot?.supabaseHost ?? "—";
  const supabaseUrl = snapshot?.supabaseUrl ?? "—";
  const sessionUserId = snapshot?.sessionUserId ?? "—";
  const authGetUserId = snapshot?.getUserId ?? "—";
  const appUserId = snapshot?.appUserId ?? fallbackAppUser.id;
  const appUserAuthUserId = snapshot?.appAuthUserId ?? fallbackAppUser.authUserId;
  const sessionEmail = snapshot?.sessionUserEmail ?? "—";
  const appEmail = snapshot?.appUserEmail ?? fallbackAppUser.email;
  const email =
    snapshot == null
      ? `(appUser mientras carga) ${appEmail}`
      : `${sessionEmail} | ${appEmail}`;
  const workspaceId = snapshot?.workspaceId ?? fallbackWorkspaceId;
  const workspaceRol = snapshot?.workspaceRol ?? fallbackWorkspaceRol;
  const mismatchSessionVsGetUser = snapshot
    ? String(snapshot.sessionVsGetUserMismatch)
    : "—";
  const mismatchSessionVsAppUser = snapshot
    ? String(snapshot.sessionVsAppUserMismatch)
    : "—";

  const line = (label: string, value: string) => (
    <div className="break-all font-mono leading-snug">
      <span className="font-sans font-bold text-black">{label}: </span>
      <span className="text-neutral-900">{value}</span>
    </div>
  );

  return (
    <div
      className="fixed inset-x-0 top-0 z-[9999] max-h-[min(50vh,360px)] overflow-y-auto border-b-4 border-black bg-yellow-300 px-3 py-2 text-[13px] text-black shadow-lg"
      role="region"
      aria-label="Depuración temporal tareas"
    >
      <div className="mb-2 border-b-2 border-black pb-1 font-sans text-sm font-black uppercase tracking-wide">
        DEBUG TAREAS (temporal) — ?debugTareas=1
      </div>
      <div className="grid gap-1">
        {line("supabaseHost", supabaseHost)}
        {line("supabaseUrl", supabaseUrl)}
        {line("sessionUserId", sessionUserId)}
        {line("authGetUserId", authGetUserId)}
        {line("appUserId", appUserId)}
        {line("appUserAuthUserId", appUserAuthUserId)}
        {line("email", email)}
        {line("workspaceId", workspaceId)}
        {line("workspaceRol", workspaceRol)}
        {line("mismatchSessionVsGetUser", mismatchSessionVsGetUser)}
        {line("mismatchSessionVsAppUser", mismatchSessionVsAppUser)}
        {snapshot?.getUserError
          ? line("getUserError", snapshot.getUserError)
          : null}
        {snapshot
          ? line("capturedAt", snapshot.capturedAt)
          : line("capturedAt", "pendiente")}
      </div>
    </div>
  );
}

function useAssigneeOptions(
  members: WorkspaceMemberRow[],
): AssigneeOption[] {
  return useMemo(() => {
    const out: AssigneeOption[] = [];
    for (const m of members) {
      if (memberStatus(m) === "inactivo") continue;
      if (m.rol === "externo") continue;
      if (!m.user_id) continue;
      out.push({ userId: m.user_id, label: m.email });
    }
    return out.sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [members]);
}

export function TasksHome() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showTareasDebugPanel = searchParams.get("debugTareas") === "1";
  const { workspaceId, appUser, workspaceRol } = useWorkspace();
  const [tasks, setTasks] = useState<WorkspaceTaskWithRelations[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [members, setMembers] = useState<WorkspaceMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [tareasDebug, setTareasDebug] = useState<TareasDebugSnapshot | null>(
    null,
  );

  const [showNew, setShowNew] = useState(false);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [estado, setEstado] = useState<TaskEstado>("pendiente");
  const [prioridad, setPrioridad] = useState<TaskPrioridad>("media");
  const [assigneeId, setAssigneeId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [duePreset, setDuePreset] = useState<string>("1d");
  const [proxSeg, setProxSeg] = useState(() =>
    new Date().toISOString().slice(0, 16),
  );

  const assigneeOptions = useAssigneeOptions(members);
  const sortedTasks = useMemo(() => sortTasksByUrgency(tasks), [tasks]);

  useEffect(() => {
    if (workspaceRol === "externo") {
      router.replace("/app");
    }
  }, [workspaceRol, router]);

  useEffect(() => {
    if (workspaceRol === "externo") return;
    let cancelled = false;
    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const [tlist, clist, mlist] = await Promise.all([
          listWorkspaceTasks(supabase, workspaceId),
          listCustomers(supabase, workspaceId),
          listMembers(supabase, workspaceId),
        ]);
        if (cancelled) return;
        setTasks(tlist);
        setCustomers(clist);
        setMembers(mlist);
        const opts = mlist.filter(
          (m) =>
            m.activo &&
            m.user_id &&
            (m.rol === "gerente" || m.rol === "interno"),
        );
        const self = opts.find((m) => m.user_id === appUser.id);
        setAssigneeId(self?.user_id ?? opts[0]?.user_id ?? "");

        if (showTareasDebugPanel) {
          const snap = await captureTareasDebugSnapshot(supabase, {
            appUser,
            workspaceId,
            workspaceRol,
          });
          setTareasDebug(snap);
          // eslint-disable-next-line no-console
          console.info("[tareas] debug snapshot (post-carga)", snap);
        }
      } catch (e) {
        if (!cancelled)
          setMessage(
            formatError(e, "No se pudieron cargar las tareas."),
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    workspaceId,
    workspaceRol,
    appUser.id,
    appUser.authUserId,
    showTareasDebugPanel,
  ]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setMessage("El título es obligatorio.");
      return;
    }
    if (!assigneeId) {
      setMessage("Selecciona un responsable.");
      return;
    }
    setCreating(true);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      if (showTareasDebugPanel) {
        const preInsert = await captureTareasDebugSnapshot(supabase, {
          appUser,
          workspaceId,
          workspaceRol,
        });
        setTareasDebug(preInsert);
        // eslint-disable-next-line no-console
        console.info("[tareas] debug snapshot (antes de insert)", preInsert);
      }
      const vence = dueAtFromPreset(duePreset).toISOString();
      const proximo = new Date(proxSeg).toISOString();
      await createWorkspaceTask(supabase, {
        workspaceId,
        title,
        description: description.trim() || null,
        estado,
        prioridad,
        assignedToUserId: assigneeId,
        createdByUserId: appUser.id,
        customerId: customerId || null,
        venceEl: vence,
        proximoSeguimientoAt: proximo,
      });
      const list = await listWorkspaceTasks(supabase, workspaceId);
      setTasks(list);
      setShowNew(false);
      setTitle("");
      setDescription("");
      setEstado("pendiente");
      setPrioridad("media");
      setDuePreset("1d");
      setProxSeg(new Date().toISOString().slice(0, 16));
    } catch (err) {
      setMessage(formatError(err, "No se pudo crear la tarea."));
    } finally {
      setCreating(false);
    }
  }

  if (workspaceRol === "externo") {
    return null;
  }

  return (
    <>
      {showTareasDebugPanel ? (
        <TareasDebugFixedPanel
          snapshot={tareasDebug}
          fallbackWorkspaceId={workspaceId}
          fallbackWorkspaceRol={workspaceRol}
          fallbackAppUser={appUser}
        />
      ) : null}
      <main
        className={`mx-auto max-w-6xl px-4 py-6 ${showTareasDebugPanel ? "pt-[min(50vh,360px)] sm:pt-52" : ""}`}
      >
      <header
        className={`relative mb-6 space-y-2 pl-4 before:absolute before:left-0 before:top-1 before:bottom-1 before:w-1 before:rounded-full ${MODULE_BAR.tareas}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.25em] ${MODULE_CHIP.tareas}`}
            >
              Tareas
            </span>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
              Seguimiento interno
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
              Tablero de tareas del workspace. Solo gerentes e internos.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-xl ${MODULE_ICON_BG.tareas}`}
            >
              <ModuleIcon id="tareas" className="h-5 w-5" />
            </div>
            <button
              type="button"
              onClick={() => setShowNew(true)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              Nueva tarea
            </button>
          </div>
        </div>
      </header>

      {message ? (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100">
          {message}
        </div>
      ) : null}

      {showNew ? (
        <form
          onSubmit={(e) => void handleCreate(e)}
          className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/40"
        >
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Nueva tarea
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
                required
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
                Vence (preset)
              </span>
              <select
                value={duePreset}
                onChange={(e) => setDuePreset(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              >
                {DUE_DATE_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Próximo seguimiento
              </span>
              <input
                type="datetime-local"
                value={proxSeg}
                onChange={(e) => setProxSeg(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                required
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={creating}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900"
            >
              {creating ? "Guardando…" : "Crear"}
            </button>
            <button
              type="button"
              onClick={() => setShowNew(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm dark:border-slate-700"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
        {loading ? (
          <p className="p-6 text-sm text-slate-500">Cargando…</p>
        ) : sortedTasks.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">
            No hay tareas. Crea la primera con el botón «Nueva tarea».
          </p>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Urgencia</th>
                <th className="px-4 py-3">Título</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Prioridad</th>
                <th className="px-4 py-3">Responsable</th>
                <th className="px-4 py-3">Vence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sortedTasks.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3">
                    <TaskUrgencyBadge venceEl={t.vence_el} estado={t.estado} />
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                    <Link
                      href={`/app/tareas/${t.id}`}
                      className="hover:underline"
                    >
                      {t.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {ESTADO_LABEL[t.estado]}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {PRIORIDAD_LABEL[t.prioridad]}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {displayUser(t.assignee)}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {t.vence_el
                      ? new Date(t.vence_el).toLocaleString("es-MX", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
    </>
  );
}
