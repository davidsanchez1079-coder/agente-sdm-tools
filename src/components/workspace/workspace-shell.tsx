"use client";

import { useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { createCase, createFolder, listCases, listFolders } from "@/lib/workspace/folders";

type WorkspaceShellProps = {
  userName: string;
  email: string;
  workspaceId: string;
};

type Folder = {
  id: string;
  workspace_id: string;
  parent_folder_id: string | null;
  nombre: string;
  created_at: string;
};

type CaseItem = {
  id: string;
  folder_id: string;
  titulo: string;
  cliente: string | null;
  estado: string;
  created_at: string;
};

export function WorkspaceShell({ userName, email, workspaceId }: WorkspaceShellProps) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [folderName, setFolderName] = useState("");
  const [caseTitle, setCaseTitle] = useState("");
  const [caseClient, setCaseClient] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [loadingCases, setLoadingCases] = useState(false);

  async function handleLoadFolders() {
    setLoadingFolders(true);
    setMessage(null);

    try {
      const rows = await listFolders(supabase, workspaceId);
      setFolders(rows);
      setMessage(rows.length ? "Carpetas cargadas." : "Todavía no hay carpetas.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudieron cargar carpetas.");
    }

    setLoadingFolders(false);
  }

  async function handleCreateFolder() {
    if (!folderName.trim()) return;

    setMessage(null);

    try {
      const row = await createFolder(supabase, workspaceId, folderName.trim());
      setFolders((prev) => [...prev, row]);
      setFolderName("");
      setMessage("Carpeta creada correctamente.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo crear la carpeta.");
    }
  }

  async function handleSelectFolder(folderId: string) {
    setSelectedFolderId(folderId);
    setLoadingCases(true);
    setMessage(null);

    try {
      const rows = await listCases(supabase, folderId);
      setCases(rows);
      setMessage(rows.length ? "Casos cargados." : "Esta carpeta todavía no tiene casos.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudieron cargar los casos.");
    }

    setLoadingCases(false);
  }

  async function handleCreateCase() {
    if (!selectedFolderId || !caseTitle.trim()) return;

    setMessage(null);

    try {
      const row = await createCase(
        supabase,
        selectedFolderId,
        caseTitle.trim(),
        caseClient.trim() || undefined,
      );
      setCases((prev) => [row, ...prev]);
      setCaseTitle("");
      setCaseClient("");
      setMessage("Caso creado correctamente.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo crear el caso.");
    }
  }

  return (
    <section className="grid gap-6 rounded-3xl border border-emerald-500/20 bg-slate-900/80 p-6 shadow-2xl shadow-emerald-950/10">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-300">
          Workspace activo
        </p>
        <h2 className="text-2xl font-semibold text-white">Bienvenido, {userName}</h2>
        <p className="text-sm leading-7 text-slate-300">
          Ya hay estructura viva para carpetas y casos. El siguiente bloque será refinar la
          navegación y conectar el chat del agente a cada caso.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Correo</p>
          <p className="mt-2 text-sm text-slate-100">{email}</p>
        </article>

        <article className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Workspace ID</p>
          <p className="mt-2 break-all text-sm text-slate-100">{workspaceId}</p>
        </article>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-white">Carpetas</h3>
            <button
              className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-100 transition hover:border-emerald-400 hover:text-emerald-300"
              onClick={() => void handleLoadFolders()}
              type="button"
            >
              {loadingFolders ? "Cargando..." : "Recargar"}
            </button>
          </div>

          <div className="grid gap-3">
            <input
              className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-50 outline-none transition focus:border-emerald-400"
              value={folderName}
              onChange={(event) => setFolderName(event.target.value)}
              placeholder="Nombre de carpeta"
            />
            <button
              className="rounded-2xl bg-emerald-400 px-4 py-3 font-medium text-slate-950 transition hover:bg-emerald-300"
              type="button"
              onClick={() => void handleCreateFolder()}
            >
              Crear carpeta
            </button>
          </div>

          <div className="grid gap-2">
            {folders.length ? (
              folders.map((folder) => (
                <button
                  key={folder.id}
                  className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                    selectedFolderId === folder.id
                      ? "border-emerald-400 bg-emerald-400/10 text-emerald-200"
                      : "border-slate-800 bg-slate-900 text-slate-200 hover:border-slate-700"
                  }`}
                  type="button"
                  onClick={() => void handleSelectFolder(folder.id)}
                >
                  {folder.nombre}
                </button>
              ))
            ) : (
              <p className="text-sm text-slate-400">Todavía no hay carpetas creadas.</p>
            )}
          </div>
        </section>

        <section className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-white">Casos</h3>
            <p className="text-sm text-slate-400">
              Seleccione una carpeta para ver y crear casos asociados.
            </p>
          </div>

          <div className="grid gap-3">
            <input
              className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-50 outline-none transition focus:border-cyan-400"
              value={caseTitle}
              onChange={(event) => setCaseTitle(event.target.value)}
              placeholder="Título del caso"
              disabled={!selectedFolderId}
            />
            <input
              className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-50 outline-none transition focus:border-cyan-400"
              value={caseClient}
              onChange={(event) => setCaseClient(event.target.value)}
              placeholder="Cliente (opcional)"
              disabled={!selectedFolderId}
            />
            <button
              className="rounded-2xl bg-cyan-400 px-4 py-3 font-medium text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              onClick={() => void handleCreateCase()}
              disabled={!selectedFolderId}
            >
              Crear caso
            </button>
          </div>

          <div className="grid gap-2">
            {loadingCases ? (
              <p className="text-sm text-slate-400">Cargando casos...</p>
            ) : cases.length ? (
              cases.map((caseItem) => (
                <article
                  key={caseItem.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-4"
                >
                  <p className="text-sm font-medium text-white">{caseItem.titulo}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                    {caseItem.estado}
                  </p>
                  {caseItem.cliente ? (
                    <p className="mt-2 text-sm text-slate-300">Cliente: {caseItem.cliente}</p>
                  ) : null}
                </article>
              ))
            ) : (
              <p className="text-sm text-slate-400">
                {selectedFolderId
                  ? "Esta carpeta todavía no tiene casos."
                  : "Primero seleccione una carpeta."}
              </p>
            )}
          </div>
        </section>
      </div>

      {message ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-300">
          {message}
        </div>
      ) : null}
    </section>
  );
}
