"use client";

import { useWorkspace } from "@/lib/workspace/context";

export default function UsuarioPage() {
  const { appUser } = useWorkspace();
  const displayName =
    [appUser.nombre, appUser.apellido].filter(Boolean).join(" ").trim() ||
    appUser.email;

  return (
    <section className="grid gap-6">
      <header className="space-y-2">
        <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200">
          Usuario
        </span>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          {displayName}
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
          Datos de tu sesión. Ajustes de perfil, 2FA y preferencias entran en
          una fase posterior.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Tile label="Correo" value={appUser.email} mono />
        <Tile label="Rol" value={appUser.rol} />
        <Tile label="ID interno" value={appUser.id} mono />
      </div>
    </section>
  );
}

function Tile({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/40 dark:shadow-none">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p
        className={`mt-2 break-words text-sm text-slate-900 dark:text-slate-100 ${mono ? "font-mono" : "font-medium"}`}
      >
        {value}
      </p>
    </div>
  );
}
