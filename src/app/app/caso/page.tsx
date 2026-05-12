"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useWorkspace, useIsExterno } from "@/lib/workspace/context";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  listCustomers,
  type CustomerRow,
} from "@/lib/customers/customers-db";
import { CustomerPanel } from "@/components/workspace/customer-panel";
import { CaseList } from "@/components/workspace/case-list";
import { CaseFilters } from "@/components/workspace/case-filters";
import { CaseForm } from "@/components/workspace/case-form";
import {
  MODULE_BAR,
  MODULE_CHIP,
  MODULE_ICON_BG,
} from "@/lib/modules/modules";
import { ModuleIcon } from "@/components/ui/module-icon";
import { formatError } from "@/lib/errors/format";

export default function CasoIndexPage() {
  const { workspaceId } = useWorkspace();
  const isExterno = useIsExterno();
  const [message, setMessage] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [selectedCustomerLabel, setSelectedCustomerLabel] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const dismissCreateModal = useCallback(() => {
    setCreateOpen(false);
    setSelectedCustomerLabel("");
  }, []);

  useEffect(() => {
    if (!createOpen || isExterno) return;
    let cancelled = false;
    (async () => {
      setCustomersLoading(true);
      try {
        const supabase = getSupabaseBrowserClient();
        const list = await listCustomers(supabase, workspaceId);
        if (!cancelled) setCustomers(list);
      } catch (error) {
        if (!cancelled) {
          setMessage(
            formatError(error, "No se pudieron cargar los clientes."),
          );
        }
      } finally {
        if (!cancelled) setCustomersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [createOpen, workspaceId, isExterno]);

  useEffect(() => {
    if (!createOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") dismissCreateModal();
    }
    window.addEventListener("keydown", onKey);
    closeButtonRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [createOpen, dismissCreateModal]);

  return (
    <section className="grid min-w-0 gap-6">
      <header
        className={`relative space-y-2 pl-4 before:absolute before:left-0 before:top-1 before:bottom-1 before:w-1 before:rounded-full ${MODULE_BAR.caso}`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${MODULE_ICON_BG.caso}`}
          >
            <ModuleIcon id="caso" />
          </div>
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.25em] ${MODULE_CHIP.caso}`}
          >
            Caso/Oportunidad
          </span>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Casos/Oportunidades
          </h2>
          {!isExterno ? (
            <button
              type="button"
              onClick={() => {
                setMessage(null);
                setCreateOpen(true);
              }}
              className="inline-flex w-full shrink-0 items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 sm:mt-0.5 sm:w-auto dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400"
            >
              Crear caso/oportunidad
            </button>
          ) : null}
        </div>
        <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
          {isExterno ? (
            <>
              Vista de los casos de tu workspace según tus marcas asignadas.
              Abre un caso para ver el detalle.
            </>
          ) : (
            <>
              Vista global de todos los casos del workspace. Usa{" "}
              <strong className="font-semibold text-slate-800 dark:text-slate-200">
                Crear caso/oportunidad
              </strong>{" "}
              para dar de alta sin salir de esta pantalla, o el panel de
              clientes a la izquierda.
            </>
          )}
        </p>
      </header>

      <div className="grid min-w-0 gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <CustomerPanel workspaceId={workspaceId} onMessage={setMessage} />

        <section className="grid min-w-0 gap-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:p-5 dark:border-slate-800/80 dark:bg-slate-900/40 dark:shadow-none">
          <Suspense
            fallback={
              <div className="h-12 animate-pulse rounded-2xl border border-slate-200 bg-white/50 dark:border-slate-800/80 dark:bg-slate-900/30" />
            }
          >
            <CaseFilters />
          </Suspense>

          <Suspense
            fallback={
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Cargando casos…
              </p>
            }
          >
            <CaseList
              onMessage={setMessage}
              refreshToken={refreshToken}
            />
          </Suspense>
        </section>
      </div>

      {message && !createOpen ? (
        <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-700 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60 dark:text-slate-300 dark:shadow-none">
          {message}
        </div>
      ) : null}

      {createOpen && !isExterno ? (
        <div
          className="fixed inset-0 z-50 grid place-items-end justify-items-stretch bg-slate-900/50 p-0 backdrop-blur-sm sm:place-items-center sm:justify-items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-case-dialog-title"
          onClick={(event) => {
            if (event.target === event.currentTarget) dismissCreateModal();
          }}
        >
          <div className="flex max-h-[min(92vh,900px)] w-full max-w-lg flex-col rounded-t-2xl border border-slate-200 bg-white shadow-xl sm:max-h-[90vh] sm:rounded-2xl dark:border-slate-800/80 dark:bg-slate-900">
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 dark:border-slate-800/80 sm:px-5">
              <div>
                <h3
                  id="create-case-dialog-title"
                  className="text-lg font-semibold text-slate-900 dark:text-white"
                >
                  Nuevo caso u oportunidad
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Elige el cliente y completa el formulario. Queda en esta
                  pantalla.
                </p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={dismissCreateModal}
                className="rounded-lg border border-slate-200 px-2.5 py-1 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/80"
              >
                Cerrar
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
              {message && createOpen ? (
                <div
                  role="status"
                  className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-100"
                >
                  {message}
                </div>
              ) : null}
              {customersLoading ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Cargando clientes…
                </p>
              ) : customers.length === 0 ? (
                <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
                  No hay clientes en el workspace. Crea primero un cliente en
                  el catálogo.
                </p>
              ) : (
                <>
                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      Cliente
                    </span>
                    <select
                      value={selectedCustomerLabel}
                      onChange={(e) =>
                        setSelectedCustomerLabel(e.target.value)
                      }
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    >
                      <option value="">Selecciona un cliente…</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.label}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  {selectedCustomerLabel ? (
                    <div className="mt-5 border-t border-slate-100 pt-5 dark:border-slate-800/80">
                      <CaseForm
                        key={selectedCustomerLabel}
                        workspaceId={workspaceId}
                        customerLabel={selectedCustomerLabel}
                        onCreated={() => {
                          setRefreshToken((n) => n + 1);
                          dismissCreateModal();
                          setMessage("Caso creado.");
                        }}
                        onMessage={setMessage}
                      />
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
