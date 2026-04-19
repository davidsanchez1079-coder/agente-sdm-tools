"use client";

type WorkspaceShellProps = {
  userName: string;
  email: string;
  workspaceId: string;
};

export function WorkspaceShell({ userName, email, workspaceId }: WorkspaceShellProps) {
  return (
    <section className="grid gap-6 rounded-3xl border border-emerald-500/20 bg-slate-900/80 p-6 shadow-2xl shadow-emerald-950/10">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-300">
          Workspace activo
        </p>
        <h2 className="text-2xl font-semibold text-white">Bienvenido, {userName}</h2>
        <p className="text-sm leading-7 text-slate-300">
          Ya quedó creada la estructura mínima del usuario en Supabase. El siguiente bloque
          será carpetas, casos y navegación real del workspace.
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
    </section>
  );
}
