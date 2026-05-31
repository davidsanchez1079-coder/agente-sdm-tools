"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useIsExterno, useWorkspace } from "@/lib/workspace/context";
import { NoAccess } from "@/components/layout/no-access";
import {
  hardDeleteWorkspaceTask,
  listTrashedWorkspaceTasks,
  restoreWorkspaceTask,
  type WorkspaceTaskRow,
} from "@/lib/workspace-tasks/workspace-tasks-db";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatError } from "@/lib/errors/format";
import { MODULE_BAR, MODULE_CHIP, MODULE_ICON_BG } from "@/lib/modules/modules";
import { ModuleIcon } from "@/components/ui/module-icon";

function daysLeft(deletedAtIso: string) {
  const deletedAt = new Date(deletedAtIso).getTime();
  const purgeAt = deletedAt + 15 * 24 * 60 * 60 * 1000;
  const diffMs = purgeAt - Date.now();
  return Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
}

export default function TareasReciclajePage() {
  const isExterno = useIsExterno();
  const { workspaceId, workspaceRol } = useWorkspace() as any;
  const router = useRouter();

  const [tasks, setTasks] = useState<WorkspaceTaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const [confirmHardId, setConfirmHardId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isGerente = workspaceRol === "gerente";

  useEffect(() => {
    if (isExterno || !isGerente) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setMessage(null);
      try {
        const supabase = getSupabaseBrowserClient();
        const list = await listTrashedWorkspaceTasks(supabase, workspaceId);
        if (!cancelled) setTasks(list);
      } catch (e) {
        if (!cancelled) setMessage(formatError(e, "No se pudo cargar la papelera."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceId, isExterno, isGerente]);

  const sorted = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const ad = a.deleted_at ? new Date(a.deleted_at).getTime() : 0;
      const bd = b.deleted_at ? new Date(b.deleted_at).getTime() : 0;
      return bd - ad;
    });
  }, [tasks]);

  async function handleRestore(taskId: string) {
    setBusy(true);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      await restoreWorkspaceTask(supabase, workspaceId, taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setMessage("Tarea restaurada.");
    } catch (e) {
      setMessage(formatError(e, "No se pudo restaurar la tarea."));
    } finally {
      setBusy(false);
    }
  }

  async function handleHardDelete(taskId: string) {
    setBusy(true);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      await hardDeleteWorkspaceTask(supabase, workspaceId, taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setConfirmHardId(null);
      setMessage("Tarea eliminada definitivamente.");
    } catch (e) {
      setMessage(formatError(e, "No se pudo eliminar definitivamente."));
    } finally {
      setBusy(false);
    }
  }

  if (isExterno) return <NoAccess titulo="Papelera de tareas" />;
  if (!isGerente) return <NoAccess titulo="Papelera de tareas" />;

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
            ← Volver a tareas
          </Link>
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.25em] ${MODULE_CHIP.tareas}`}
          >
            Papelera
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${MODULE_ICON_BG.tareas}`}>
            <ModuleIcon id="tareas" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
              Bandeja de reciclaje
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Las tareas eliminadas se conservan 15 días y luego se purgan automáticamente.
            </p>
          </div>
        </div>
      </header>

      {message ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200">
          {message}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Cargando…</p>
      ) : sorted.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-6 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-300">
          No hay tareas en la papelera.
        </div>
      ) : (
        <ul className="grid gap-2">
          {sorted.map((t) => (
            <li
              key={t.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/40 dark:shadow-none"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900 dark:text-white">
                    {t.titulo}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Eliminada:{" "}
                    {t.deleted_at
                      ? new Date(t.deleted_at).toLocaleString(undefined, {
                          dateStyle: "short",
                          timeStyle: "short",
                        })
                      : "—"}
                    {t.deleted_at ? ` · ${daysLeft(t.deleted_at)} días restantes` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleRestore(t.id)}
                    disabled={busy}
                    className="rounded-xl border border-emerald-500/40 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-400/30 dark:bg-slate-900/60 dark:text-emerald-200 dark:hover:bg-emerald-400/10"
                  >
                    Restaurar
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmHardId(t.id)}
                    disabled={busy}
                    className="rounded-xl border border-rose-500/40 bg-white px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-400/30 dark:bg-slate-900/60 dark:text-rose-200 dark:hover:bg-rose-500/10"
                  >
                    Borrar definitivo
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={confirmHardId != null}
        title="Eliminar definitivamente"
        description="Esta acción es permanente.\n\nLa tarea se borrará para siempre (incluyendo su hilo)."
        confirmLabel="Sí, borrar definitivo"
        cancelLabel="Cancelar"
        tone="destructive"
        busy={busy}
        onClose={() => (busy ? null : setConfirmHardId(null))}
        onConfirm={() => void handleHardDelete(confirmHardId as string)}
      />
    </section>
  );
}

