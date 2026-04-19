"use client";

import { useWorkspace } from "@/lib/workspace/context";

export default function UsuarioPage() {
  const { appUser } = useWorkspace();
  const displayName =
    [appUser.nombre, appUser.apellido].filter(Boolean).join(" ").trim() ||
    appUser.email;

  return (
    <section className="grid gap-5">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-300">
          Usuario
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-white">
          {displayName}
        </h2>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Tile label="Correo" value={appUser.email} />
        <Tile label="Rol" value={appUser.rol} />
        <Tile label="ID interno" value={appUser.id} />
      </div>

      <p className="text-sm leading-6 text-slate-400">
        Ajustes de perfil, 2FA y preferencias entran en una fase posterior.
      </p>
    </section>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 break-words text-sm text-slate-100">{value}</p>
    </div>
  );
}
