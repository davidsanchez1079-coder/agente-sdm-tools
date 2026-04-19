"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { createMessage, listMessages } from "@/lib/workspace/messages";
import { updateCase, type CaseRow } from "@/lib/workspace/folders";
import { buildGeneralAgentResponse } from "@/lib/agent/general-response";
import { buildSpecialistAgentResponse } from "@/lib/agent/specialist-response";
import { BRANDS, type BrandId } from "@/lib/brands/brands";
import {
  CASE_ESTADOS,
  CASE_PRIORIDADES,
  estadoBadge,
  estadoLabel,
  prioridadBadge,
  prioridadLabel,
  type CaseEstado,
  type CasePrioridad,
} from "@/lib/cases/cases";
import {
  MODULE_BAR,
  MODULE_CHIP,
  MODULE_ICON_BG,
} from "@/lib/modules/modules";
import { ModuleIcon } from "@/components/ui/module-icon";
import { AgentModeSelect } from "./agent-mode-select";

type MessageRow = {
  id: string;
  case_id: string;
  author: "user" | "agent";
  content: string;
  mode_used: BrandId;
  created_at: string;
};

type CaseDetailProps = {
  caseId: string;
};

function deriveAgentMode(marcaPreferida: string | null): BrandId {
  if (!marcaPreferida) return "general";
  const normalized = marcaPreferida.trim().toLowerCase();
  const match = BRANDS.find(
    (brand) =>
      brand.id === normalized || brand.label.toLowerCase() === normalized,
  );
  return match?.id ?? "general";
}

function describeFabricante(marcaPreferida: string | null) {
  if (!marcaPreferida) return "Sin asignar";
  const normalized = marcaPreferida.trim().toLowerCase();
  const match = BRANDS.find(
    (brand) =>
      brand.id === normalized || brand.label.toLowerCase() === normalized,
  );
  return match?.label ?? marcaPreferida;
}

const CASE_COLUMNS =
  "id, folder_id, titulo, cliente, operacion, material, maquina, marca_preferida, estado, prioridad, siguiente_accion, resumen_ejecutivo, created_at";

export function CaseDetail({ caseId }: CaseDetailProps) {
  const [caseItem, setCaseItem] = useState<CaseRow | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [agentMode, setAgentMode] = useState<BrandId>("general");
  const [message, setMessage] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [resumenDraft, setResumenDraft] = useState("");
  const [siguienteDraft, setSiguienteDraft] = useState("");
  const [savingResumen, setSavingResumen] = useState(false);
  const [savingSiguiente, setSavingSiguiente] = useState(false);
  const [savingEstado, setSavingEstado] = useState(false);
  const [savingPrioridad, setSavingPrioridad] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: caseData, error: caseError } = await supabase
          .from("cases")
          .select(CASE_COLUMNS)
          .eq("id", caseId)
          .maybeSingle<CaseRow>();

        if (cancelled) return;
        if (caseError) throw caseError;
        if (!caseData) {
          setNotFound(true);
          return;
        }
        setCaseItem(caseData);
        setResumenDraft(caseData.resumen_ejecutivo ?? "");
        setSiguienteDraft(caseData.siguiente_accion ?? "");
        setAgentMode(deriveAgentMode(caseData.marca_preferida));

        const msgs = await listMessages(supabase, caseId);
        if (!cancelled) setMessages(msgs);
      } catch (error) {
        if (!cancelled) {
          setMessage(
            error instanceof Error
              ? error.message
              : "No se pudo cargar el caso.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  async function handleSaveResumen() {
    if (!caseItem) return;
    setSavingResumen(true);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const updated = await updateCase(supabase, caseItem.id, {
        resumen_ejecutivo: resumenDraft.trim() || null,
      });
      setCaseItem(updated);
      setMessage("Resumen ejecutivo guardado.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el resumen.",
      );
    } finally {
      setSavingResumen(false);
    }
  }

  async function handleSaveSiguiente() {
    if (!caseItem) return;
    setSavingSiguiente(true);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const updated = await updateCase(supabase, caseItem.id, {
        siguiente_accion: siguienteDraft.trim() || null,
      });
      setCaseItem(updated);
      setMessage("Siguiente acción guardada.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la siguiente acción.",
      );
    } finally {
      setSavingSiguiente(false);
    }
  }

  async function handleChangeEstado(estado: CaseEstado) {
    if (!caseItem || caseItem.estado === estado) return;
    setSavingEstado(true);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const updated = await updateCase(supabase, caseItem.id, { estado });
      setCaseItem(updated);
      setMessage("Estado actualizado.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el estado.",
      );
    } finally {
      setSavingEstado(false);
    }
  }

  async function handleChangePrioridad(prioridad: CasePrioridad) {
    if (!caseItem || caseItem.prioridad === prioridad) return;
    setSavingPrioridad(true);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const updated = await updateCase(supabase, caseItem.id, { prioridad });
      setCaseItem(updated);
      setMessage("Prioridad actualizada.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar la prioridad.",
      );
    } finally {
      setSavingPrioridad(false);
    }
  }

  async function handleSend() {
    if (!caseItem || !chatInput.trim()) return;
    setSending(true);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const text = chatInput.trim();

      const userMessage = await createMessage(
        supabase,
        caseItem.id,
        "user",
        text,
      );

      const history = messages.map((entry) => ({
        author: entry.author,
        content: entry.content,
      }));

      const agentContent =
        agentMode === "general"
          ? buildGeneralAgentResponse({
              caseTitle: caseItem.titulo,
              client: caseItem.cliente,
              message: text,
              operacion: caseItem.operacion,
              material: caseItem.material,
              maquina: caseItem.maquina,
              marcaPreferida: caseItem.marca_preferida,
              history,
            })
          : buildSpecialistAgentResponse({
              caseTitle: caseItem.titulo,
              client: caseItem.cliente,
              message: text,
              operacion: caseItem.operacion,
              material: caseItem.material,
              maquina: caseItem.maquina,
              marcaPreferida: caseItem.marca_preferida,
              history,
              mode: agentMode,
            });

      const agentMessage = await createMessage(
        supabase,
        caseItem.id,
        "agent",
        agentContent,
        agentMode,
      );

      setMessages((prev) => [
        ...prev,
        userMessage as MessageRow,
        agentMessage as MessageRow,
      ]);
      setChatInput("");
      setMessage("Mensaje guardado.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo enviar el mensaje.",
      );
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Cargando caso…
      </p>
    );
  }

  if (notFound) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/40 dark:shadow-none">
        <p className="text-sm text-slate-700 dark:text-slate-300">
          No encontré ese caso. Puede estar borrado o no tienes acceso.
        </p>
        <Link
          href="/app/caso"
          className="mt-4 inline-flex rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-emerald-500 hover:bg-emerald-50 dark:border-slate-700 dark:text-slate-200 dark:hover:border-emerald-400 dark:hover:bg-emerald-400/10"
        >
          Volver a casos
        </Link>
      </div>
    );
  }

  if (!caseItem) return null;

  const fabricanteLabel = describeFabricante(caseItem.marca_preferida);
  const resumenDirty =
    (caseItem.resumen_ejecutivo ?? "") !== resumenDraft.trim() &&
    resumenDraft.trim() !== "";
  const resumenErased =
    (caseItem.resumen_ejecutivo ?? "") !== "" && resumenDraft.trim() === "";
  const siguienteDirty =
    (caseItem.siguiente_accion ?? "") !== siguienteDraft.trim() &&
    siguienteDraft.trim() !== "";
  const siguienteErased =
    (caseItem.siguiente_accion ?? "") !== "" && siguienteDraft.trim() === "";

  const controlClass =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-emerald-400 dark:focus:ring-emerald-400/20";

  return (
    <section className="grid min-w-0 gap-6">
      <div
        className={`relative space-y-2 pl-4 before:absolute before:left-0 before:top-1 before:bottom-1 before:w-1 before:rounded-full ${MODULE_BAR.caso}`}
      >
        <Link
          href="/app/caso"
          className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 transition hover:text-emerald-700 dark:text-emerald-300 dark:hover:text-emerald-200"
        >
          ← Volver a casos
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${MODULE_ICON_BG.caso}`}
          >
            <ModuleIcon id="caso" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            {caseItem.titulo}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${MODULE_CHIP.caso}`}
          >
            Caso
          </span>
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${estadoBadge(caseItem.estado)}`}
          >
            {estadoLabel(caseItem.estado)}
          </span>
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${prioridadBadge(caseItem.prioridad)}`}
          >
            Prioridad {prioridadLabel(caseItem.prioridad)}
          </span>
        </div>
      </div>

      <div className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/40 dark:shadow-none">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm">
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Estado
            </span>
            <select
              className={controlClass}
              value={caseItem.estado}
              onChange={(event) =>
                void handleChangeEstado(event.target.value as CaseEstado)
              }
              disabled={savingEstado}
            >
              {CASE_ESTADOS.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5 text-sm">
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Prioridad
            </span>
            <select
              className={controlClass}
              value={caseItem.prioridad}
              onChange={(event) =>
                void handleChangePrioridad(
                  event.target.value as CasePrioridad,
                )
              }
              disabled={savingPrioridad}
            >
              {CASE_PRIORIDADES.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/40 dark:shadow-none">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            Siguiente acción
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Qué toca hacer después. Corto y concreto.
          </p>
        </div>
        <input
          className={controlClass}
          value={siguienteDraft}
          onChange={(event) => setSiguienteDraft(event.target.value)}
          placeholder="Ej. Confirmar vida del inserto con operador el viernes."
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleSaveSiguiente()}
            disabled={
              savingSiguiente || (!siguienteDirty && !siguienteErased)
            }
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-400 dark:text-slate-950 dark:shadow-none dark:hover:bg-emerald-300"
          >
            {savingSiguiente ? "Guardando…" : "Guardar"}
          </button>
          {siguienteDirty || siguienteErased ? (
            <span className="text-xs text-amber-600 dark:text-amber-300">
              Sin guardar
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/40 dark:shadow-none">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            Resumen ejecutivo
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Tres o cuatro líneas con lo esencial del caso.
          </p>
        </div>
        <textarea
          className={`${controlClass} min-h-24`}
          value={resumenDraft}
          onChange={(event) => setResumenDraft(event.target.value)}
          placeholder="Qué pasa, qué se probó y qué se recomienda."
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleSaveResumen()}
            disabled={savingResumen || (!resumenDirty && !resumenErased)}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-400 dark:text-slate-950 dark:shadow-none dark:hover:bg-emerald-300"
          >
            {savingResumen ? "Guardando…" : "Guardar"}
          </button>
          {resumenDirty || resumenErased ? (
            <span className="text-xs text-amber-600 dark:text-amber-300">
              Sin guardar
            </span>
          ) : null}
        </div>
      </div>

      <section className="grid gap-3">
        <header>
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            Contexto técnico
          </h3>
        </header>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <InfoTile label="Fabricante" value={fabricanteLabel} />
          <InfoTile
            label="Cliente"
            value={caseItem.cliente ?? "Sin asignar"}
          />
          <InfoTile
            label="Operación"
            value={caseItem.operacion ?? "Sin asignar"}
          />
          <InfoTile
            label="Material"
            value={caseItem.material ?? "Sin asignar"}
          />
          <InfoTile
            label="Máquina"
            value={caseItem.maquina ?? "Sin asignar"}
          />
        </div>
      </section>

      <div className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:p-6 dark:border-slate-800/80 dark:bg-slate-900/40 dark:shadow-none">
        <AgentModeSelect
          value={agentMode}
          onChange={setAgentMode}
          disabled={sending}
        />
        <div className="grid gap-3">
          <textarea
            className={`${controlClass} min-h-32`}
            value={chatInput}
            onChange={(event) => setChatInput(event.target.value)}
            placeholder="Escribe el contexto técnico del caso"
            disabled={sending}
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={sending || !chatInput.trim()}
            className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-400 dark:text-slate-950 dark:shadow-none dark:hover:bg-emerald-300"
          >
            {sending ? "Guardando…" : "Enviar al caso"}
          </button>
        </div>
      </div>

      <div className="grid gap-3">
        {messages.length ? (
          [...messages].reverse().map((entry) => (
            <article
              key={entry.id}
              className={`rounded-xl border p-4 shadow-sm dark:shadow-none ${
                entry.author === "user"
                  ? "border-emerald-500/40 bg-emerald-50/80 dark:border-emerald-400/30 dark:bg-emerald-500/5"
                  : "border-cyan-500/40 bg-cyan-50/80 dark:border-cyan-400/30 dark:bg-cyan-500/5"
              }`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                {entry.author === "user"
                  ? "Usuario"
                  : `Agente · ${entry.mode_used}`}
              </p>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-900 dark:text-slate-100">
                {entry.content}
              </p>
            </article>
          ))
        ) : (
          <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
            Este caso todavía no tiene mensajes.
          </p>
        )}
      </div>

      {message ? (
        <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-700 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60 dark:text-slate-300 dark:shadow-none">
          {message}
        </div>
      ) : null}
    </section>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/40 dark:shadow-none">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-medium text-slate-900 dark:text-slate-100">
        {value}
      </p>
    </div>
  );
}
