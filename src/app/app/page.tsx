"use client";

import Link from "next/link";
import { useWorkspace } from "@/lib/workspace/context";

const TILES = [
  {
    href: "/app/caso",
    label: "Caso",
    description:
      "Pantalla principal. Carpetas, casos y conversación con el agente.",
    accent:
      "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200",
  },
  {
    href: "/app/customers",
    label: "Cliente",
    description: "Catálogo base de clientes y casos asociados.",
    accent:
      "bg-cyan-500/10 text-cyan-700 dark:bg-cyan-400/15 dark:text-cyan-200",
  },
  {
    href: "/app/brands",
    label: "Fabricante/Marca",
    description:
      "Catálogo base. El fabricante del caso activa el modo Especialista del agente.",
    accent:
      "bg-amber-500/10 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200",
  },
  {
    href: "/app/usuario",
    label: "Usuario",
    description: "Datos de tu sesión y perfil.",
    accent:
      "bg-slate-500/10 text-slate-700 dark:bg-slate-500/20 dark:text-slate-200",
  },
] as const;

export default function DashboardPage() {
  const { appUser, workspaceId } = useWorkspace();
  const displayName =
    [appUser.nombre, appUser.apellido].filter(Boolean).join(" ").trim() ||
    appUser.email;

  return (
    <section className="grid gap-7">
      <header className="space-y-2">
        <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200">
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {TILES.map((tile) => (
          <Link
            key={tile.href}
            href={tile.href}
            className="group grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-150 hover:-translate-y-0.5 hover:border-emerald-500/50 hover:shadow-md dark:border-slate-800/80 dark:bg-slate-900/40 dark:shadow-none dark:hover:border-emerald-400/50 dark:hover:bg-slate-900/70"
          >
            <span
              className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${tile.accent}`}
            >
              {tile.label}
            </span>
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
              {tile.description}
            </p>
            <span className="mt-auto text-xs text-slate-400 transition group-hover:text-emerald-600 dark:text-slate-500 dark:group-hover:text-emerald-300">
              Abrir →
            </span>
          </Link>
        ))}
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
