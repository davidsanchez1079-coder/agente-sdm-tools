"use client";

import { BRANDS, type BrandStatus } from "@/lib/brands/brands";
import {
  MODULE_BAR,
  MODULE_CHIP,
  MODULE_ICON_BG,
} from "@/lib/modules/modules";
import { ModuleIcon } from "@/components/ui/module-icon";
import { useIsExterno } from "@/lib/workspace/context";
import { NoAccess } from "@/components/layout/no-access";

const STATUS_LABEL: Record<BrandStatus, string> = {
  always: "Siempre disponible",
  indexed: "Indexada",
  coming_soon: "Próximamente",
};

const STATUS_STYLE: Record<BrandStatus, string> = {
  always:
    "border-emerald-500/40 bg-emerald-100 text-emerald-800 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-200",
  indexed:
    "border-cyan-500/40 bg-cyan-100 text-cyan-800 dark:border-cyan-400/40 dark:bg-cyan-500/15 dark:text-cyan-200",
  coming_soon:
    "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300",
};

const FABRICANTES = BRANDS.filter((brand) => brand.id !== "general");

export default function BrandsPage() {
  const isExterno = useIsExterno();
  if (isExterno) return <NoAccess titulo="Marcas" />;
  return (
    <section className="grid gap-6">
      <header
        className={`relative space-y-2 pl-4 before:absolute before:left-0 before:top-1 before:bottom-1 before:w-1 before:rounded-full ${MODULE_BAR.brands}`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${MODULE_ICON_BG.brands}`}
          >
            <ModuleIcon id="brands" />
          </div>
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.25em] ${MODULE_CHIP.brands}`}
          >
            Fabricante/Marca
          </span>
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Catálogo de fabricantes
        </h2>
        <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
          Catálogo base. El fabricante seleccionado en cada caso activa
          automáticamente el modo Especialista del agente al abrir la
          conversación.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FABRICANTES.map((brand) => (
          <article
            key={brand.id}
            className="relative grid gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 pl-6 shadow-sm transition duration-150 hover:border-amber-500/40 dark:border-slate-800/80 dark:bg-slate-900/40 dark:shadow-none dark:hover:border-amber-400/40 before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-amber-500/70 dark:before:bg-amber-400/70"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {brand.label}
              </h3>
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] ${STATUS_STYLE[brand.status]}`}
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
