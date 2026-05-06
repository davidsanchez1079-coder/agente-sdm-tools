"use client";

import Link from "next/link";
import { useIsExterno, useWorkspace } from "@/lib/workspace/context";
import {
  MODULES,
  MODULE_ARROW,
  MODULE_BAR,
  MODULE_CHIP,
  MODULE_HOVER_RING,
  MODULE_ICON_BG,
  type ModuleId,
} from "@/lib/modules/modules";
import { ModuleIcon } from "@/components/ui/module-icon";

const TILES: {
  id: ModuleId;
  description: string;
}[] = [
  {
    id: "caso",
    description:
      "Pantalla principal. Carpetas, casos y conversación con el agente.",
  },
  {
    id: "tareas",
    description:
      "Tareas internas del workspace: responsables, vencimientos, comentarios y adjuntos.",
  },
  {
    id: "customers",
    description: "Catálogo base de clientes y casos asociados.",
  },
  {
    id: "agentes",
    description:
      "Personas asignables a clientes y casos como agente involucrado (técnico, apoyo comercial, otro responsable).",
  },
  {
    id: "accesos",
    description:
      "Quién está autorizado en el workspace, con qué rol, qué marcas tiene asignadas y qué se le compartió.",
  },
  {
    id: "brands",
    description:
      "Catálogo de fabricantes. El fabricante del caso activa el modo Especialista del agente.",
  },
  {
    id: "usuario",
    description: "Datos de tu sesión y perfil.",
  },
];

const EXTERNO_TILE_IDS: ReadonlySet<ModuleId> = new Set([
  "caso",
  "customers",
  "usuario",
]);

export default function DashboardPage() {
  const isExterno = useIsExterno();
  const { appUser, workspaceId } = useWorkspace();
  const displayName =
    [appUser.nombre, appUser.apellido].filter(Boolean).join(" ").trim() ||
    appUser.email;
  const visibleTiles = isExterno
    ? TILES.filter((t) => EXTERNO_TILE_IDS.has(t.id))
    : TILES;

  return (
    <section className="grid gap-7">
      <header
        className={`relative space-y-2 pl-4 before:absolute before:left-0 before:top-1 before:bottom-1 before:w-1 before:rounded-full ${MODULE_BAR.dashboard}`}
      >
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.25em] ${MODULE_CHIP.dashboard}`}
        >
          Dashboard
        </span>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
          Bienvenido, {displayName}.
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
          Estructura base del ERP. La vista de caso es la pantalla principal;
          todo lo demás orbita alrededor de ella.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {visibleTiles.map(({ id, description }) => {
          const meta = MODULES[id];
          return (
            <Link
              key={meta.href}
              href={meta.href}
              className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-transparent transition duration-150 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800/80 dark:bg-slate-900/40 dark:shadow-none ${MODULE_HOVER_RING[id]} before:absolute before:left-0 before:top-0 before:h-full before:w-1 ${MODULE_BAR[id]}`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${MODULE_ICON_BG[id]}`}
                >
                  <ModuleIcon id={id} className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${MODULE_CHIP[id]}`}
                  >
                    {meta.label}
                  </span>
                  <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
                    {description}
                  </p>
                  <div
                    className={`mt-4 inline-flex items-center gap-1 text-sm font-semibold ${MODULE_ARROW[id]}`}
                  >
                    Abrir
                    <span aria-hidden className="transition group-hover:translate-x-0.5">
                      →
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/40 dark:shadow-none">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
          Workspace ID
        </p>
        <p className="mt-2 break-all font-mono text-sm text-slate-800 dark:text-slate-100">
          {workspaceId}
        </p>
      </div>
    </section>
  );
}
