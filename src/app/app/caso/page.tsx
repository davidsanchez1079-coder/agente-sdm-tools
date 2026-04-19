"use client";

import { useState } from "react";
import { useWorkspace } from "@/lib/workspace/context";
import { FolderPanel } from "@/components/workspace/folder-panel";
import { CaseForm } from "@/components/workspace/case-form";
import { CaseList } from "@/components/workspace/case-list";

export default function CasoIndexPage() {
  const { workspaceId } = useWorkspace();
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  return (
    <section className="grid min-w-0 gap-5">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-300">
          Caso
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-white">
          Carpetas y casos
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          Selecciona una carpeta para ver sus casos. Toca un caso para abrir su
          conversación con el agente.
        </p>
      </header>

      <div className="grid min-w-0 gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <FolderPanel
          workspaceId={workspaceId}
          selectedFolderId={selectedFolderId}
          onSelectFolder={setSelectedFolderId}
          onMessage={setMessage}
        />

        <section className="grid min-w-0 gap-5 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 lg:p-5">
          <div>
            <h3 className="text-lg font-semibold text-white">Casos</h3>
            <p className="mt-1 text-sm text-slate-400">
              {selectedFolderId
                ? "Casos de la carpeta seleccionada."
                : "Selecciona una carpeta para ver sus casos."}
            </p>
          </div>

          <CaseForm
            folderId={selectedFolderId}
            onCreated={() => setRefreshToken((token) => token + 1)}
            onMessage={setMessage}
          />

          <CaseList
            folderId={selectedFolderId}
            refreshToken={refreshToken}
            onMessage={setMessage}
          />
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
