"use client";

import Link from "next/link";
import { useWorkspace } from "@/lib/workspace/context";

const TILES = [
  {
    href: "/app/caso",
    label: "Caso",
    description:
      "Pantalla principal. Carpetas, casos y conversación con el agente.",
  },
  {
    href: "/app/cliente",
    label: "Cliente",
    description: "Listado derivado de los casos que tienes registrados.",
  },
  {
    href: "/app/marca",
    label: "Marca",
    description:
      "Define el enfoque del agente. Capa funcional del muro de marcas.",
  },
  {
    href: "/app/usuario",
    label: "Usuario",
    description: "Datos de tu sesión y perfil.",
  },
] as const;

export default function DashboardPage() {
  const { appUser, workspaceId } = useWorkspace();
  const displayName =
    [appUser.nombre, appUser.apellido].filter(Boolean).join(" ").trim() ||
    appUser.email;

  return (
    <section className="grid gap-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-300">
          Dashboard
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-white">
          Bienvenido, {displayName}.
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          Estructura base del ERP. La vista de caso es la pantalla principal y
          más importante; todo lo demás orbita alrededor de ella.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TILES.map((tile) => (
          <Link
            key={tile.href}
            href={tile.href}
            className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 transition hover:border-emerald-400/40"
          >
            <p className="text-sm font-semibold text-white">{tile.label}</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              {tile.description}
            </p>
          </Link>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">
          Workspace ID
        </p>
        <p className="mt-2 break-all text-sm text-slate-100">{workspaceId}</p>
      </div>
    </section>
  );
}
