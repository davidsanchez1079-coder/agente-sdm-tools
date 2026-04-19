"use client";

import { useState } from "react";
import { useWorkspace } from "@/lib/workspace/context";
import { FolderPanel } from "@/components/workspace/folder-panel";
import { CaseForm } from "@/components/workspace/case-form";
import { CaseList } from "@/components/workspace/case-list";
import {
  MODULE_BAR,
  MODULE_CHIP,
  MODULE_ICON_BG,
} from "@/lib/modules/modules";
import { ModuleIcon } from "@/components/ui/module-icon";

export default function CasoIndexPage() {
  const { workspaceId } = useWorkspace();
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  return (
    <section className="grid min-w-0 gap-6">
      <header
        className={`relative space-y-2 pl-4 before:absolute before:left-0 before:top-1 before:bottom-1 before:w-1 before:rounded-full ${MODULE_BAR.caso}`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${MODULE_ICON_BG.caso}`}
          >
            <ModuleIcon id="caso" />
          </div>
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.25em] ${MODULE_CHIP.caso}`}
          >
            Caso
          </span>
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Carpetas y casos
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
          Selecciona una carpeta para ver sus casos. Toca un caso para abrir
          su conversación con el agente.
        </p>
      </header>

      <div className="grid min-w-0 gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <FolderPanel
          workspaceId={workspaceId}
          selectedFolderId={selectedFolderId}
          onSelectFolder={setSelectedFolderId}
          onMessage={setMessage}
        />

        <section className="grid min-w-0 gap-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:p-5 dark:border-slate-800/80 dark:bg-slate-900/40 dark:shadow-none">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Casos
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
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
        <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-700 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60 dark:text-slate-300 dark:shadow-none">
          {message}
        </div>
      ) : null}
    </section>
  );
}
