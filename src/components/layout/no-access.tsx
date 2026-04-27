"use client";

export function NoAccess({ titulo }: { titulo: string }) {
  return (
    <section className="grid gap-3">
      <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
        {titulo}
      </h2>
      <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
        No tienes acceso a esta sección. Tu rol en este workspace es de visor.
        Si necesitas acceso, contacta al gerente que te invitó.
      </div>
    </section>
  );
}
