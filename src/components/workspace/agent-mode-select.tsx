"use client";

import {
  BRANDS,
  ENABLED_AGENT_MODES,
  type BrandId,
} from "@/lib/brands/brands";

type AgentModeSelectProps = {
  value: BrandId;
  onChange: (value: BrandId) => void;
  disabled?: boolean;
};

export function AgentModeSelect({
  value,
  onChange,
  disabled,
}: AgentModeSelectProps) {
  return (
    <div className="grid gap-2">
      <label className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
        Modo del agente
      </label>
      <select
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-emerald-400 dark:focus:ring-emerald-400/20"
        value={value}
        onChange={(event) => onChange(event.target.value as BrandId)}
        disabled={disabled}
      >
        {BRANDS.map((brand) => {
          const enabled = ENABLED_AGENT_MODES.includes(brand.id);
          const label =
            brand.id === "general"
              ? "General"
              : enabled
                ? `Especialista ${brand.label}`
                : `Especialista ${brand.label} — v1.1`;
          return (
            <option key={brand.id} value={brand.id} disabled={!enabled}>
              {label}
            </option>
          );
        })}
      </select>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Los modos especialistas por marca se activan en la v1.1 con catálogo
        indexado.
      </p>
    </div>
  );
}
