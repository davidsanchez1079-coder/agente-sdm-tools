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
    <section className="grid min-w-0 gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 lg:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-white">Carpetas</h3>
        <button
          type="button"
          onClick={() => void reload()}
          className="rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-200 transition hover:border-emerald-400 hover:text-emerald-300"
        >
          {loading ? "Cargando…" : "Recargar"}
        </button>
      </div>

      <div className="grid gap-3">
        <input
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-50 outline-none transition focus:border-emerald-400"
          value={folderName}
          onChange={(event) => setFolderName(event.target.value)}
          placeholder="Nombre de carpeta"
        />
        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={loading || !folderName.trim()}
          className="rounded-xl bg-emerald-400 px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Procesando…" : "Crear carpeta"}
        </button>
      </div>

      <div className="grid gap-2">
        {folders.length ? (
          folders.map((folder) => (
            <div
              key={folder.id}
              className={`flex min-w-0 items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm transition ${
                selectedFolderId === folder.id
                  ? "border-emerald-400 bg-emerald-400/10 text-emerald-200"
                  : "border-slate-800 bg-slate-900 text-slate-200 hover:border-slate-700"
              }`}
            >
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-left"
                onClick={() => onSelectFolder(folder.id)}
              >
                {folder.nombre}
              </button>
              <button
                type="button"
                className="shrink-0 rounded-lg border border-rose-700 px-3 py-2 text-xs text-rose-300 transition hover:bg-rose-900/30"
                onClick={() => void handleDelete(folder.id)}
              >
                Borrar
              </button>
            </div>
          ))
        ) : (
          <p className="text-sm leading-6 text-slate-400">
            Todavía no hay carpetas.
          </p>
        )}
      </div>
    </section>
  );
}
