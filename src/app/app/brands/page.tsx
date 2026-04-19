"use client";

import { BRANDS, type BrandStatus } from "@/lib/brands/brands";

const STATUS_LABEL: Record<BrandStatus, string> = {
  always: "Siempre disponible",
  indexed: "Indexada",
  coming_soon: "Próximamente",
};

const STATUS_STYLE: Record<BrandStatus, string> = {
  always:
    "border-emerald-500/40 bg-emerald-100 text-emerald-800 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-200",
  indexed:
    "border-cyan-500/40 bg-cyan-100 text-cyan-800 dark:border-cyan-400/40 dark:bg-cyan-400/10 dark:text-cyan-200",
  coming_soon:
    "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
};

const FABRICANTES = BRANDS.filter((brand) => brand.id !== "general");

export default function BrandsPage() {
  return (
    <section className="grid gap-5">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-300">
          Fabricante/Marca
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
          Catálogo de fabricantes
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
          Catálogo base. El fabricante seleccionado en cada caso activa
          automáticamente el modo Especialista del agente al abrir la
          conversación.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FABRICANTES.map((brand) => (
          <article
            key={brand.id}
            className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950/60"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {brand.label}
              </h3>
              <span
                className={`rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-[0.15em] ${STATUS_STYLE[brand.status]}`}
              >
                {STATUS_LABEL[brand.status]}
              </span>
            </div>
            <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">
              {brand.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
