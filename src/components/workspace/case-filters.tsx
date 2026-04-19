"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CASE_ESTADOS,
  CASE_PRIORIDADES,
  estadoLabel,
  prioridadLabel,
  type CaseEstado,
  type CasePrioridad,
} from "@/lib/cases/cases";
import {
  countActivePanelFilters,
  EMPTY_FILTERS,
  hasAnyFilterOrQuery,
  parseFiltersFromParams,
  serializeFiltersToParams,
  SORT_OPTIONS,
  type CaseFilters,
  type RapFilter,
  type SortKey,
} from "@/lib/cases/filters";
import { BRANDS, type BrandId } from "@/lib/brands/brands";
import { CUSTOMERS, type CustomerId } from "@/lib/customers/customers";

const FABRICANTES = BRANDS.filter((brand) => brand.id !== "general");

export function CaseFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [panelOpen, setPanelOpen] = useState(false);

  const filters = useMemo(
    () => parseFiltersFromParams(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const activePanelCount = countActivePanelFilters(filters);
  const hasAnything = hasAnyFilterOrQuery(filters);

  const pushFilters = useCallback(
    (next: CaseFilters) => {
      const base = new URLSearchParams(searchParams.toString());
      const merged = serializeFiltersToParams(next, base);
      const query = merged.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  function toggleFromArray<T extends string>(list: T[], value: T): T[] {
    return list.includes(value)
      ? list.filter((item) => item !== value)
      : [...list, value];
  }

  const handleSearchChange = (value: string) =>
    pushFilters({ ...filters, q: value });

  const handleToggleEstado = (value: CaseEstado) =>
    pushFilters({
      ...filters,
      estados: toggleFromArray(filters.estados, value),
    });

  const handleTogglePrioridad = (value: CasePrioridad) =>
    pushFilters({
      ...filters,
      prioridades: toggleFromArray(filters.prioridades, value),
    });

  const handleToggleCliente = (value: CustomerId) =>
    pushFilters({
      ...filters,
      clientes: toggleFromArray(filters.clientes, value),
    });

  const handleToggleFabricante = (value: BrandId) =>
    pushFilters({
      ...filters,
      fabricantes: toggleFromArray(filters.fabricantes, value),
    });

  const handleSetRap = (value: RapFilter) =>
    pushFilters({ ...filters, rap: value });

  const handleSetSort = (value: SortKey) =>
    pushFilters({ ...filters, sort: value });

  const handleReset = () => {
    pushFilters(EMPTY_FILTERS);
    setPanelOpen(false);
  };

  const pillBase =
    "cursor-pointer select-none rounded-full border px-3 py-1 text-xs font-medium transition";
  const pillActive =
    "border-emerald-500/50 bg-emerald-100 text-emerald-800 dark:border-emerald-400/50 dark:bg-emerald-500/15 dark:text-emerald-200";
  const pillInactive =
    "border-slate-300 bg-white text-slate-700 hover:border-emerald-500/40 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:border-emerald-400/40";

  return (
    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/40 dark:shadow-none">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 dark:text-slate-500">
            ⌕
          </span>
          <input
            type="search"
            value={filters.q}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder="Buscar por título, cliente, operación, material…"
            className="w-full min-w-0 rounded-xl border border-slate-300 bg-white pl-8 pr-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-emerald-400 dark:focus:ring-emerald-400/20"
          />
        </div>

        <select
          value={filters.sort}
          onChange={(event) => handleSetSort(event.target.value as SortKey)}
          className="shrink-0 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:focus:border-emerald-400 dark:focus:ring-emerald-400/20"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setPanelOpen((prev) => !prev)}
          className={`shrink-0 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
            panelOpen || activePanelCount > 0
              ? "border-emerald-500/50 bg-emerald-50 text-emerald-800 dark:border-emerald-400/50 dark:bg-emerald-500/10 dark:text-emerald-200"
              : "border-slate-300 bg-white text-slate-700 hover:border-emerald-500/40 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:border-emerald-400/40"
          }`}
        >
          Filtros
          {activePanelCount > 0 ? (
            <span className="ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white dark:bg-emerald-400 dark:text-slate-950">
              {activePanelCount}
            </span>
          ) : null}
        </button>

        {hasAnything ? (
          <button
            type="button"
            onClick={handleReset}
            className="shrink-0 rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:border-rose-500 hover:bg-rose-50 hover:text-rose-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-rose-400/60 dark:hover:bg-rose-500/10 dark:hover:text-rose-200"
          >
            Limpiar
          </button>
        ) : null}
      </div>

      {hasAnything ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {filters.q.trim() ? (
            <Chip
              label={`Buscar: “${filters.q.trim()}”`}
              onRemove={() => handleSearchChange("")}
            />
          ) : null}
          {filters.estados.map((id) => (
            <Chip
              key={`estado-${id}`}
              label={`Estado: ${estadoLabel(id)}`}
              onRemove={() => handleToggleEstado(id)}
            />
          ))}
          {filters.prioridades.map((id) => (
            <Chip
              key={`prioridad-${id}`}
              label={`Prioridad: ${prioridadLabel(id)}`}
              onRemove={() => handleTogglePrioridad(id)}
            />
          ))}
          {filters.clientes.map((id) => {
            const label = CUSTOMERS.find((c) => c.id === id)?.label ?? id;
            return (
              <Chip
                key={`cliente-${id}`}
                label={`Cliente: ${label}`}
                onRemove={() => handleToggleCliente(id)}
              />
            );
          })}
          {filters.fabricantes.map((id) => {
            const label = BRANDS.find((b) => b.id === id)?.label ?? id;
            return (
              <Chip
                key={`fabricante-${id}`}
                label={`Fabricante: ${label}`}
                onRemove={() => handleToggleFabricante(id)}
              />
            );
          })}
          {filters.rap !== "all" ? (
            <Chip
              label={`RAP: ${filters.rap === "yes" ? "Sí" : "No"}`}
              onRemove={() => handleSetRap("all")}
            />
          ) : null}
        </div>
      ) : null}

      {panelOpen ? (
        <div className="grid gap-4 border-t border-slate-200 pt-3 dark:border-slate-800/80">
          <FilterGroup label="Estado">
            {CASE_ESTADOS.map((row) => {
              const active = filters.estados.includes(row.id);
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => handleToggleEstado(row.id)}
                  className={`${pillBase} ${active ? pillActive : pillInactive}`}
                >
                  {row.label}
                </button>
              );
            })}
          </FilterGroup>

          <FilterGroup label="Prioridad">
            {CASE_PRIORIDADES.map((row) => {
              const active = filters.prioridades.includes(row.id);
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => handleTogglePrioridad(row.id)}
                  className={`${pillBase} ${active ? pillActive : pillInactive}`}
                >
                  {row.label}
                </button>
              );
            })}
          </FilterGroup>

          <FilterGroup label="Cliente">
            {CUSTOMERS.map((customer) => {
              const active = filters.clientes.includes(customer.id);
              return (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => handleToggleCliente(customer.id)}
                  className={`${pillBase} ${active ? pillActive : pillInactive}`}
                >
                  {customer.label}
                </button>
              );
            })}
          </FilterGroup>

          <FilterGroup label="Fabricante">
            {FABRICANTES.map((brand) => {
              const active = filters.fabricantes.includes(brand.id);
              return (
                <button
                  key={brand.id}
                  type="button"
                  onClick={() => handleToggleFabricante(brand.id)}
                  className={`${pillBase} ${active ? pillActive : pillInactive}`}
                >
                  {brand.label}
                </button>
              );
            })}
          </FilterGroup>

          <FilterGroup label="Requiere RAP">
            {(["all", "yes", "no"] as RapFilter[]).map((value) => {
              const active = filters.rap === value;
              const labelMap: Record<RapFilter, string> = {
                all: "Todos",
                yes: "Sí",
                no: "No",
              };
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleSetRap(value)}
                  className={`${pillBase} ${active ? pillActive : pillInactive}`}
                >
                  {labelMap[value]}
                </button>
              );
            })}
          </FilterGroup>
        </div>
      ) : null}
    </div>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-800 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-200">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Quitar filtro ${label}`}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-emerald-700 transition hover:bg-emerald-200 dark:text-emerald-200 dark:hover:bg-emerald-500/30"
      >
        ×
      </button>
    </span>
  );
}
