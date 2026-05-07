"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (searchParams.get("new") === "1") setShowAlta(true);
  }, [searchParams]);

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
      setTasks((prev) => [created, ...prev]);
      setAltaScope("interna");
      setAltaCustomerId("");
      setAltaCustomerQuery("");
      setAltaAssignedToUserId("");
      setAltaTitulo("");
      setAltaDescripcion("");
      setAltaEstado("pendiente");
      setAltaPrioridad("normal");
      setAltaVenceElLocal("");
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

