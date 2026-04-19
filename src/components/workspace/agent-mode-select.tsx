"use client";

import { BRANDS, type BrandId } from "@/lib/brands/brands";

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
      <label className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
        Modo del agente
      </label>
      <select
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-50 outline-none transition focus:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        value={value}
        onChange={(event) => onChange(event.target.value as BrandId)}
        disabled={disabled}
      >
        {BRANDS.map((brand) => (
          <option key={brand.id} value={brand.id}>
            {brand.id === "general"
              ? "General"
              : `Especialista ${brand.label}`}
          </option>
        ))}
      </select>
    </div>
  );
}
