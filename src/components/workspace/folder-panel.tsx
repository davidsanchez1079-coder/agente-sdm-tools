"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  createFolder,
  deleteFolder,
  listFolders,
} from "@/lib/workspace/folders";

type Folder = {
  id: string;
  workspace_id: string;
  parent_folder_id: string | null;
  nombre: string;
  created_at: string;
};

type FolderPanelProps = {
  workspaceId: string;
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onMessage?: (message: string | null) => void;
};

export function FolderPanel({
  workspaceId,
  selectedFolderId,
  onSelectFolder,
  onMessage,
}: FolderPanelProps) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [folderName, setFolderName] = useState("");
  const [loading, setLoading] = useState(false);

  const notify = useCallback(
    (msg: string | null) => {
      onMessage?.(msg);
    },
    [onMessage],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const rows = await listFolders(supabase, workspaceId);
        if (!cancelled) setFolders(rows);
      } catch (error) {
        if (!cancelled) {
          notify(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar carpetas.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceId, notify]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const rows = await listFolders(supabase, workspaceId);
      setFolders(rows);
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar carpetas.",
      );
    } finally {
      setLoading(false);
    }
  }, [workspaceId, notify]);

  async function handleCreate() {
    if (!folderName.trim()) return;
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const row = await createFolder(supabase, workspaceId, folderName.trim());
      setFolders((prev) => [...prev, row]);
      setFolderName("");
      notify("Carpeta creada.");
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "No se pudo crear la carpeta.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(folderId: string) {
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      await deleteFolder(supabase, folderId);
      setFolders((prev) => prev.filter((folder) => folder.id !== folderId));
      if (selectedFolderId === folderId) onSelectFolder(null);
      notify("Carpeta eliminada.");
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar la carpeta.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="grid min-w-0 gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:p-5 dark:border-slate-800/80 dark:bg-slate-900/40 dark:shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          Carpetas
        </h3>
        <button
          type="button"
          onClick={() => void reload()}
          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-800 dark:text-slate-300 dark:hover:border-emerald-400/60 dark:hover:bg-emerald-400/10 dark:hover:text-emerald-200"
        >
          {loading ? "Cargando…" : "Recargar"}
        </button>
      </div>

      <div className="grid gap-3">
        <input
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-emerald-400 dark:focus:ring-emerald-400/20"
          value={folderName}
          onChange={(event) => setFolderName(event.target.value)}
          placeholder="Nombre de carpeta"
        />
        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={loading || !folderName.trim()}
          className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-400 dark:text-slate-950 dark:shadow-none dark:hover:bg-emerald-300"
        >
          {loading ? "Procesando…" : "Crear carpeta"}
        </button>
      </div>

      <div className="grid gap-2">
        {folders.length ? (
          folders.map((folder) => {
            const selected = selectedFolderId === folder.id;
            return (
              <div
                key={folder.id}
                className={`flex min-w-0 items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition ${
                  selected
                    ? "border-emerald-500/40 bg-emerald-50 text-emerald-800 shadow-[inset_3px_0_0_0_rgb(5_150_105)] dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-100 dark:shadow-[inset_3px_0_0_0_rgb(52_211_153)]"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800/80 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900"
                }`}
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left font-medium"
                  onClick={() => onSelectFolder(folder.id)}
                >
                  {folder.nombre}
                </button>
                <button
                  type="button"
                  className="shrink-0 rounded-lg border border-rose-300 px-2.5 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100 dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-500/10"
                  onClick={() => void handleDelete(folder.id)}
                >
                  Borrar
                </button>
              </div>
            );
          })
        ) : (
          <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
            Todavía no hay carpetas.
          </p>
        )}
      </div>
    </section>
  );
}
