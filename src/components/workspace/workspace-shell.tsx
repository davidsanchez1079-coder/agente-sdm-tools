"use client";

import { useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { createCase, createFolder, listCases, listFolders } from "@/lib/workspace/folders";
import { createMessage, listMessages } from "@/lib/workspace/messages";

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
  const [selectedCase, setSelectedCase] = useState<CaseItem | null>(null);
  const [folderName, setFolderName] = useState("");
  const [caseTitle, setCaseTitle] = useState("");
  const [caseClient, setCaseClient] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<
    {
      id: string;
      case_id: string;
      author: "user" | "agent";
      content: string;
      mode_used: "general" | "sandvik" | "vargus" | "korloy" | "dormer" | "boehlerit";
      created_at: string;
    }[]
  >([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [loadingCases, setLoadingCases] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

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

    setLoadingFolders(true);
    setMessage(null);

    try {
      const row = await createFolder(supabase, workspaceId, folderName.trim());
      setFolders((prev) => [...prev, row]);
      setFolderName("");
      setMessage("Carpeta creada correctamente.");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "No se pudo crear la carpeta.";
      setMessage(`Falló crear carpeta: ${detail}`);
    }

    setLoadingFolders(false);
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

    setLoadingCases(true);
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
      const detail = error instanceof Error ? error.message : "No se pudo crear el caso.";
      setMessage(`Falló crear caso: ${detail}`);
    }

    setLoadingCases(false);
  }

  async function handleSelectCase(caseItem: CaseItem) {
    setSelectedCase(caseItem);
    setLoadingMessages(true);
    setMessage(null);

    try {
      const rows = await listMessages(supabase, caseItem.id);
      setMessages(rows);
      setMessage(rows.length ? "Caso cargado correctamente." : "Caso listo para iniciar conversación.");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "No se pudieron cargar mensajes.";
      setMessage(`Falló cargar mensajes: ${detail}`);
    }

    setLoadingMessages(false);
  }

  async function handleSendMessage() {
    if (!selectedCase || !chatInput.trim()) return;

    setLoadingMessages(true);
    setMessage(null);

    try {
      const userMessage = await createMessage(supabase, selectedCase.id, "user", chatInput.trim());
      const agentMessage = await createMessage(
        supabase,
        selectedCase.id,
        "agent",
        `Recibí su mensaje sobre el caso \"${selectedCase.titulo}\". El siguiente bloque conectará el agente técnico real.`,
      );

      setMessages((prev) => [...prev, userMessage, agentMessage]);
      setChatInput("");
      setMessage("Mensaje guardado en el caso.");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "No se pudo guardar el mensaje.";
      setMessage(`Falló enviar mensaje: ${detail}`);
    }

    setLoadingMessages(false);
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

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-[0.8fr_0.9fr_1.1fr]">
        <section className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 md:col-span-1">
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
              className="rounded-2xl bg-emerald-400 px-4 py-3 font-medium text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              onClick={() => void handleCreateFolder()}
              disabled={loadingFolders}
            >
              {loadingFolders ? "Creando..." : "Crear carpeta"}
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

        <section className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 md:col-span-1">
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
              disabled={!selectedFolderId || loadingCases}
            >
              {loadingCases ? "Creando..." : "Crear caso"}
            </button>
          </div>

          <div className="grid gap-2">
            {loadingCases ? (
              <p className="text-sm text-slate-400">Cargando casos...</p>
            ) : cases.length ? (
              cases.map((caseItem) => (
                <button
                  key={caseItem.id}
                  className={`rounded-2xl border p-4 text-left transition ${
                    selectedCase?.id === caseItem.id
                      ? "border-cyan-400 bg-cyan-400/10"
                      : "border-slate-800 bg-slate-900"
                  }`}
                  type="button"
                  onClick={() => void handleSelectCase(caseItem)}
                >
                  <p className="text-sm font-medium text-white">{caseItem.titulo}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                    {caseItem.estado}
                  </p>
                  {caseItem.cliente ? (
                    <p className="mt-2 text-sm text-slate-300">Cliente: {caseItem.cliente}</p>
                  ) : null}
                </button>
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

        <section className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 md:col-span-2 xl:col-span-1">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-white">Detalle del caso</h3>
            <p className="text-sm text-slate-400">
              {selectedCase
                ? `Conversación del caso: ${selectedCase.titulo}`
                : "Seleccione un caso para abrir su conversación."}
            </p>
          </div>

          <div className="grid gap-3">
            <textarea
              className="min-h-36 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-50 outline-none transition focus:border-emerald-400"
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              placeholder="Escriba el contexto técnico del caso"
              disabled={!selectedCase}
            />
            <button
              className="rounded-2xl bg-emerald-400 px-4 py-3 font-medium text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              onClick={() => void handleSendMessage()}
              disabled={!selectedCase || loadingMessages}
            >
              {loadingMessages ? "Guardando..." : "Enviar al caso"}
            </button>
          </div>

          <div className="grid gap-3">
            {loadingMessages ? (
              <p className="text-sm text-slate-400">Cargando conversación...</p>
            ) : messages.length ? (
              messages.map((entry) => (
                <article
                  key={entry.id}
                  className={`rounded-2xl border p-4 ${
                    entry.author === "user"
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-cyan-500/30 bg-cyan-500/5"
                  }`}
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    {entry.author === "user" ? "Usuario" : "Agente"}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-100">{entry.content}</p>
                </article>
              ))
            ) : (
              <p className="text-sm text-slate-400">
                {selectedCase
                  ? "Este caso todavía no tiene mensajes."
                  : "Primero seleccione un caso."}
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
