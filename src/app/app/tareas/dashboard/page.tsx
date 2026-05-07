"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useIsExterno, useWorkspace } from "@/lib/workspace/context";
import { NoAccess } from "@/components/layout/no-access";
import { listCustomers, type CustomerRow } from "@/lib/customers/customers-db";
import { listMembers } from "@/lib/permisos/permisos-db";
import type { WorkspaceMemberRow } from "@/lib/permisos/permisos-db";
import {
  labelEstado,
  labelPrioridad,
} from "@/lib/workspace-tasks/workspace-task-labels";
import {
  listWorkspaceTasks,
  type WorkspaceTaskEstado,
  type WorkspaceTaskRow,
} from "@/lib/workspace-tasks/workspace-tasks-db";
import {
  MODULE_BAR,
  MODULE_CHIP,
  MODULE_ICON_BG,
} from "@/lib/modules/modules";
import { ModuleIcon } from "@/components/ui/module-icon";
import { formatError } from "@/lib/errors/format";

function isOverdue(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() < Date.now();
}

function formatDue(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

type TaskLastNote = {
  workspace_task_id: string;
  body: string;
  created_at: string;
};

export default function TareasDashboardPage() {
  const isExterno = useIsExterno();
  const { workspaceId, appUser } = useWorkspace();

  const [tasks, setTasks] = useState<WorkspaceTaskRow[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [members, setMembers] = useState<WorkspaceMemberRow[]>([]);
  const [lastNoteByTaskId, setLastNoteByTaskId] = useState<
    Record<string, TaskLastNote>
  >({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [createdEstadoFilter, setCreatedEstadoFilter] = useState<
    WorkspaceTaskEstado | "todos"
  >("todos");
  const [createdResponsableFilter, setCreatedResponsableFilter] =
    useState("todos");
  const [createdClienteFilter, setCreatedClienteFilter] = useState("todos");

  useEffect(() => {
    if (isExterno) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setMessage(null);
      try {
        const supabase = getSupabaseBrowserClient();
        const [list, customerList, memberList] = await Promise.all([
          listWorkspaceTasks(supabase, workspaceId),
          listCustomers(supabase, workspaceId),
          listMembers(supabase, workspaceId),
        ]);
        if (cancelled) return;
        setTasks(list);
        setCustomers(customerList);
        setMembers(memberList);

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
          setMessage(formatError(error, "No se pudo cargar el dashboard."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceId, isExterno]);

  const customersById = useMemo(
    () => new Map(customers.map((c) => [c.id, c])),
    [customers],
  );

  const membersByUserId = useMemo(() => {
    return new Map(
      members
        .filter((m) => m.user_id)
        .map((m) => [m.user_id as string, m]),
    );
  }, [members]);

  function lastActionPreview(taskId: string): string | null {
    const last = lastNoteByTaskId[taskId];
    if (!last) return null;
    const t = last.body.trim().replace(/\s+/g, " ");
    if (!t) return null;
    return t.length > 30 ? `${t.slice(0, 30)}…` : t;
  }

  function responsableLabel(userId: string | null): string {
    if (!userId) return "—";
    return membersByUserId.get(userId)?.email ?? "Asignado";
  }

  const assignedToMe = useMemo(() => {
    const list = tasks.filter((t) => t.assigned_to_user_id === appUser.id);
    // Priorización operativa: vencidas primero, luego por fecha de vencimiento, luego por creación.
    return [...list].sort((a, b) => {
      const ao = isOverdue(a.vence_el);
      const bo = isOverdue(b.vence_el);
      if (ao !== bo) return ao ? -1 : 1;
      const ad = a.vence_el ? new Date(a.vence_el).getTime() : Number.POSITIVE_INFINITY;
      const bd = b.vence_el ? new Date(b.vence_el).getTime() : Number.POSITIVE_INFINITY;
      if (ad !== bd) return ad - bd;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [tasks, appUser.id]);

  const createdByMe = useMemo(() => {
    return tasks.filter((t) => t.created_by_user_id === appUser.id);
  }, [tasks, appUser.id]);

  const createdStats = useMemo(() => {
    const base: Record<WorkspaceTaskEstado, number> = {
      pendiente: 0,
      en_curso: 0,
      hecha: 0,
      cancelada: 0,
    };
    for (const t of createdByMe) base[t.estado] += 1;
    return base;
  }, [createdByMe]);

  const createdResponsableOptions = useMemo(() => {
    const options = new Map<string, string>();
    for (const t of createdByMe) {
      if (!t.assigned_to_user_id) continue;
      options.set(t.assigned_to_user_id, responsableLabel(t.assigned_to_user_id));
    }
    return [...options.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [createdByMe, membersByUserId]);

  const createdClienteOptions = useMemo(() => {
    const options = new Map<string, string>();
    for (const t of createdByMe) {
      if (!t.customer_id) continue;
      options.set(
        t.customer_id,
        customersById.get(t.customer_id)?.label ?? "Cliente",
      );
    }
    return [...options.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [createdByMe, customersById]);

  const filteredCreatedByMe = useMemo(() => {
    return createdByMe.filter((t) => {
      const matchesEstado =
        createdEstadoFilter === "todos" || t.estado === createdEstadoFilter;
      const matchesResponsable =
        createdResponsableFilter === "todos" ||
        (createdResponsableFilter === "sin_responsable"
          ? !t.assigned_to_user_id
          : t.assigned_to_user_id === createdResponsableFilter);
      const matchesCliente =
        createdClienteFilter === "todos" ||
        (createdClienteFilter === "sin_cliente"
          ? !t.customer_id
          : t.customer_id === createdClienteFilter);
      return matchesEstado && matchesResponsable && matchesCliente;
    });
  }, [
    createdByMe,
    createdEstadoFilter,
    createdResponsableFilter,
    createdClienteFilter,
  ]);

  if (isExterno) return <NoAccess titulo="Dashboard de tareas" />;

  return (
    <section className="grid gap-6">
      <header
        className={`relative space-y-2 pl-4 before:absolute before:left-0 before:top-1 before:bottom-1 before:w-1 before:rounded-full ${MODULE_BAR.tareas}`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/app/tareas/list"
            className="text-sm font-medium text-sky-700 hover:text-sky-600 dark:text-sky-300 dark:hover:text-sky-200"
          >
            Ver listado
          </Link>
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.25em] ${MODULE_CHIP.tareas}`}
          >
            Dashboard
          </span>
          <Link
            href="/app/tareas/list?new=1"
            className="ml-auto inline-flex items-center rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-400 dark:bg-sky-400 dark:text-slate-950 dark:hover:bg-sky-300"
          >
            + Nueva tarea
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${MODULE_ICON_BG.tareas}`}
          >
            <ModuleIcon id="tareas" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Tareas
          </h2>
        </div>
        <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
          Enfoque operativo: lo que tienes asignado, y el estado general de lo que
          tú creaste.
        </p>
      </header>

      {message ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200">
          {message}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Cargando dashboard…
        </p>
      ) : (
        <div className="grid gap-6">
          <section className="grid gap-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  Prioridad
                </p>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Asignadas a mí
                </h3>
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {assignedToMe.length} tarea(s)
              </span>
            </div>

            {assignedToMe.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-6 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-300">
                No tienes tareas asignadas por ahora.
              </div>
            ) : (
              <ul className="grid gap-2">
                {assignedToMe.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/app/tareas/${t.id}`}
                      className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-300 hover:bg-sky-50/40 dark:border-slate-800/80 dark:bg-slate-900/40 dark:shadow-none dark:hover:border-sky-500/40 dark:hover:bg-sky-500/5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {t.titulo}
                          </p>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                            {lastActionPreview(t.id) ? (
                              <>
                                <span className="font-semibold">
                                  Último mensaje:
                                </span>{" "}
                                {lastActionPreview(t.id)}
                              </>
                            ) : (
                              <span className="text-slate-500 dark:text-slate-500">
                                Sin notas aún.
                              </span>
                            )}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <span className="rounded-lg border border-slate-200 px-2 py-0.5 dark:border-slate-700">
                              {labelEstado(t.estado)}
                            </span>
                            <span
                              className={`rounded-lg border px-2 py-0.5 ${
                                isOverdue(t.vence_el)
                                  ? "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
                                  : "border-slate-200 dark:border-slate-700"
                              }`}
                            >
                              {labelPrioridad(t.prioridad)}
                            </span>
                            <span className="rounded-lg border border-slate-200 px-2 py-0.5 dark:border-slate-700">
                              {t.customer_id
                                ? `Cliente: ${customersById.get(t.customer_id)?.label ?? "—"}`
                                : "Interna"}
                            </span>
                            <span className="rounded-lg border border-slate-200 px-2 py-0.5 dark:border-slate-700">
                              Responsable: {responsableLabel(t.assigned_to_user_id)}
                            </span>
                          </div>
                        </div>
                        <div className="text-right text-xs">
                          <p
                            className={`font-semibold ${
                              isOverdue(t.vence_el)
                                ? "text-rose-700 dark:text-rose-300"
                                : "text-slate-700 dark:text-slate-200"
                            }`}
                          >
                            Vence: {formatDue(t.vence_el)}
                          </p>
                          <p className="mt-1 text-slate-500 dark:text-slate-400">
                            Abrir →
                          </p>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="grid gap-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  Control
                </p>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Creadas por mí
                </h3>
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {filteredCreatedByMe.length} de {createdByMe.length} tarea(s)
              </span>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-300">
                {(
                  [
                    ["todos", createdByMe.length],
                    ["pendiente", createdStats.pendiente],
                    ["en_curso", createdStats.en_curso],
                    ["hecha", createdStats.hecha],
                    ["cancelada", createdStats.cancelada],
                  ] as const
                ).map(([k, v]) => {
                  const active = createdEstadoFilter === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setCreatedEstadoFilter(k)}
                      className={`rounded-lg border px-2 py-1 text-left transition ${
                        active
                          ? "border-sky-500/50 bg-sky-50 text-sky-800 dark:border-sky-400/40 dark:bg-sky-400/10 dark:text-sky-200"
                          : "border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:text-sky-700 dark:border-slate-800/80 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:border-sky-500/40 dark:hover:text-sky-200"
                      }`}
                    >
                      {k === "todos" ? "Todas" : labelEstado(k)}:{" "}
                      <span className="font-semibold">{v}</span>
                    </button>
                  );
                })}
              </div>

              <label className="grid min-w-[220px] gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  Responsable
                </span>
                <select
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-800/80 dark:bg-slate-900/40 dark:text-slate-200"
                  value={createdResponsableFilter}
                  onChange={(e) => setCreatedResponsableFilter(e.target.value)}
                >
                  <option value="todos">Todos los responsables</option>
                  <option value="sin_responsable">Sin responsable</option>
                  {createdResponsableOptions.map(([userId, label]) => (
                    <option key={userId} value={userId}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid min-w-[220px] gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  Cliente / Interna
                </span>
                <select
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-800/80 dark:bg-slate-900/40 dark:text-slate-200"
                  value={createdClienteFilter}
                  onChange={(e) => setCreatedClienteFilter(e.target.value)}
                >
                  <option value="todos">Todos: clientes e internas</option>
                  <option value="sin_cliente">Interna / Sin cliente</option>
                  {createdClienteOptions.map(([customerId, label]) => (
                    <option key={customerId} value={customerId}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {createdByMe.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-6 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-300">
                Aún no has creado tareas.
              </div>
            ) : filteredCreatedByMe.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-6 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-300">
                No hay tareas con esos filtros.
              </div>
            ) : (
              <ul className="grid gap-2">
                {filteredCreatedByMe.slice(0, 12).map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/app/tareas/${t.id}`}
                      className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-300 hover:bg-sky-50/40 dark:border-slate-800/80 dark:bg-slate-900/40 dark:shadow-none dark:hover:border-sky-500/40 dark:hover:bg-sky-500/5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {t.titulo}
                          </p>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                            {lastActionPreview(t.id) ? (
                              <>
                                <span className="font-semibold">
                                  Último mensaje:
                                </span>{" "}
                                {lastActionPreview(t.id)}
                              </>
                            ) : (
                              <span className="text-slate-500 dark:text-slate-500">
                                Sin notas aún.
                              </span>
                            )}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <span className="rounded-lg border border-slate-200 px-2 py-0.5 dark:border-slate-700">
                              {labelEstado(t.estado)}
                            </span>
                            <span
                              className={`rounded-lg border px-2 py-0.5 ${
                                isOverdue(t.vence_el)
                                  ? "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
                                  : "border-slate-200 dark:border-slate-700"
                              }`}
                            >
                              {labelPrioridad(t.prioridad)}
                            </span>
                            <span className="rounded-lg border border-slate-200 px-2 py-0.5 dark:border-slate-700">
                              {t.customer_id
                                ? `Cliente: ${customersById.get(t.customer_id)?.label ?? "—"}`
                                : "Interna / Sin cliente"}
                            </span>
                            <span className="rounded-lg border border-slate-200 px-2 py-0.5 dark:border-slate-700">
                              Responsable: {responsableLabel(t.assigned_to_user_id)}
                            </span>
                          </div>
                        </div>
                        <div className="text-right text-xs">
                          <p
                            className={`font-semibold ${
                              isOverdue(t.vence_el)
                                ? "text-rose-700 dark:text-rose-300"
                                : "text-slate-700 dark:text-slate-200"
                            }`}
                          >
                            Vence: {formatDue(t.vence_el)}
                          </p>
                          <p className="mt-1 text-slate-500 dark:text-slate-400">
                            Abrir →
                          </p>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {filteredCreatedByMe.length > 12 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Mostrando 12 de {filteredCreatedByMe.length}. Usa el listado para ver todas.
              </p>
            ) : null}
          </section>
        </div>
      )}
    </section>
  );
}

