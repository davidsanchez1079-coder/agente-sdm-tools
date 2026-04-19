"use client";

import { BRANDS, type BrandStatus } from "@/lib/brands/brands";

const STATUS_LABEL: Record<BrandStatus, string> = {
  always: "Siempre disponible",
  indexed: "Indexada",
  coming_soon: "Próximamente",
};

const STATUS_STYLE: Record<BrandStatus, string> = {
  always: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
  indexed: "border-cyan-400/40 bg-cyan-400/10 text-cyan-200",
  coming_soon: "border-slate-700 bg-slate-900 text-slate-300",
};

export default function MarcaPage() {
  return (
    <section className="grid gap-5">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-300">
          Marca
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-white">
          Enfoque del agente
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          La marca define qué muro de conocimiento usa el agente. En modo
          General cruza todo; en modo Especialista solo recomienda dentro de la
          marca elegida. Este panel entrará como capa funcional conectada al
          chat en la próxima fase.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {BRANDS.map((brand) => (
          <article
            key={brand.id}
            className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-white">
                {brand.label}
              </h3>
              <span
                className={`rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-[0.15em] ${STATUS_STYLE[brand.status]}`}
              >
                {STATUS_LABEL[brand.status]}
              </span>
            </div>
            <p className="text-sm leading-6 text-slate-300">
              {brand.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
