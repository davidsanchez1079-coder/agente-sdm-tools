"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { listMessages } from "@/lib/workspace/messages";
import { updateCase, type CaseRow } from "@/lib/workspace/folders";
import {
  BRANDS,
  ENABLED_AGENT_MODES,
  type BrandId,
} from "@/lib/brands/brands";
import {
  CASE_ESTADOS,
  CASE_PRIORIDADES,
  CASE_RESULTADOS_CIERRE,
  estadoBadge,
  estadoLabel,
  formatPotencialUsd,
  prioridadBadge,
  prioridadLabel,
  resultadoCierreBadge,
  resultadoCierreLabel,
  type CaseEstado,
  type CasePrioridad,
  type CaseResultadoCierre,
} from "@/lib/cases/cases";
import {
  MODULE_BAR,
  MODULE_CHIP,
  MODULE_ICON_BG,
} from "@/lib/modules/modules";
import { ModuleIcon } from "@/components/ui/module-icon";
import { AgentModeSelect } from "./agent-mode-select";
import { CaseAttachments } from "./case-attachments";
import { AttachmentSelector } from "./attachment-selector";
import {
  listAttachments,
  type AttachmentRow,
} from "@/lib/workspace/attachments";

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
  const derived: BrandId = match?.id ?? "general";
  // En v1 solo "general" está habilitado. Si el caso trae fabricante cuyo
  // modo especialista aún no existe, caemos a general para no auto-seleccionar
  // una opción deshabilitada del dropdown.
  return ENABLED_AGENT_MODES.includes(derived) ? derived : "general";
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

const MESSAGE_TIME_FORMAT = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function formatMessageTime(iso: string): string {
  try {
    return MESSAGE_TIME_FORMAT.format(new Date(iso));
  } catch {
    return iso;
  }
}

const CASE_COLUMNS =
  "id, folder_id, titulo, cliente, operacion, material, maquina, marca_preferida, estado, prioridad, siguiente_accion, resumen_ejecutivo, resultado_cierre, requiere_rap, created_at";

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
  const [potencialDraft, setPotencialDraft] = useState("");
  const [savingResumen, setSavingResumen] = useState(false);
  const [savingSiguiente, setSavingSiguiente] = useState(false);
  const [savingEstado, setSavingEstado] = useState(false);
  const [savingPrioridad, setSavingPrioridad] = useState(false);
  const [savingResultado, setSavingResultado] = useState(false);
  const [savingRap, setSavingRap] = useState(false);
  const [savingPotencial, setSavingPotencial] = useState(false);

  const [attachments, setAttachments] = useState<AttachmentRow[]>([]);
  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState<
    string[]
  >([]);

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
        setPotencialDraft(
          caseData.potencial_usd != null
            ? String(caseData.potencial_usd)
            : "",
        );
        setAgentMode(deriveAgentMode(caseData.marca_preferida));
        setSelectedAttachmentIds([]);

        const [msgs, atts] = await Promise.all([
          listMessages(supabase, caseId),
          listAttachments(supabase, caseId),
        ]);
        if (!cancelled) {
          setMessages(msgs);
          setAttachments(atts);
        }
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

  async function handleChangeResultado(
    resultado: CaseResultadoCierre | null,
  ) {
    if (!caseItem || caseItem.resultado_cierre === resultado) return;
    setSavingResultado(true);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const updated = await updateCase(supabase, caseItem.id, {
        resultado_cierre: resultado,
      });
      setCaseItem(updated);
      setMessage("Resultado de cierre actualizado.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el resultado de cierre.",
      );
    } finally {
      setSavingResultado(false);
    }
  }

  async function handleSavePotencial() {
    if (!caseItem) return;
    const raw = potencialDraft.trim().replace(/[,\s]/g, "");
    const parsed = raw === "" ? null : Number(raw);
    if (parsed !== null && (Number.isNaN(parsed) || parsed < 0)) {
      setMessage("Valor inválido para potencial. Usa un entero ≥ 0.");
      return;
    }
    setSavingPotencial(true);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const updated = await updateCase(supabase, caseItem.id, {
        potencial_usd: parsed === null ? null : Math.trunc(parsed),
      });
      setCaseItem(updated);
      setPotencialDraft(
        updated.potencial_usd != null ? String(updated.potencial_usd) : "",
      );
      setMessage("Potencial USD guardado.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el potencial.",
      );
    } finally {
      setSavingPotencial(false);
    }
  }

  async function handleChangeRap(requiereRap: boolean) {
    if (!caseItem || caseItem.requiere_rap === requiereRap) return;
    setSavingRap(true);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const updated = await updateCase(supabase, caseItem.id, {
        requiere_rap: requiereRap,
      });
      setCaseItem(updated);
      setMessage(
        requiereRap
          ? "Marcado como Requiere RAP."
          : "Se quitó la marca Requiere RAP.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el flag de RAP.",
      );
    } finally {
      setSavingRap(false);
    }
  }

  async function handleSend() {
    if (!caseItem || !chatInput.trim()) return;
    setSending(true);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const text = chatInput.trim();

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        throw new Error("Sesión expirada. Vuelve a iniciar sesión.");
      }

      const response = await fetch("/api/agent/respond", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          caseId: caseItem.id,
          content: text,
          mode: agentMode,
          attachmentIds: selectedAttachmentIds,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        userMessage?: MessageRow;
        agentMessage?: MessageRow;
        error?: string;
      };

      if (!response.ok) {
        if (payload.userMessage) {
          setMessages((prev) => [...prev, payload.userMessage as MessageRow]);
          setChatInput("");
        }
        throw new Error(payload.error ?? "Error al llamar al agente.");
      }

      if (!payload.userMessage || !payload.agentMessage) {
        throw new Error("Respuesta inválida del servidor.");
      }

      setMessages((prev) => [
        ...prev,
        payload.userMessage as MessageRow,
        payload.agentMessage as MessageRow,
      ]);
      setChatInput("");
      setSelectedAttachmentIds([]);
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
  const potencialRaw = potencialDraft.trim().replace(/[,\s]/g, "");
  const potencialNum = potencialRaw === "" ? null : Number(potencialRaw);
  const potencialInvalid =
    potencialRaw !== "" &&
    (Number.isNaN(potencialNum as number) || (potencialNum as number) < 0);
  const potencialDirty =
    !potencialInvalid &&
    (caseItem.potencial_usd ?? null) !==
      (potencialNum === null ? null : Math.trunc(potencialNum as number));
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
      {/* Header con breadcrumb, título y etiquetas rápidas */}
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
          {caseItem.cliente ? (
            <span className="rounded-full border border-cyan-500/40 bg-cyan-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-800 dark:border-cyan-400/40 dark:bg-cyan-500/15 dark:text-cyan-200">
              {caseItem.cliente}
            </span>
          ) : null}
          {caseItem.resultado_cierre ? (
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${resultadoCierreBadge(caseItem.resultado_cierre)}`}
            >
              {resultadoCierreLabel(caseItem.resultado_cierre)}
            </span>
          ) : null}
          {caseItem.requiere_rap ? (
            <span className="rounded-full border border-violet-500/40 bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-800 dark:border-violet-400/40 dark:bg-violet-500/15 dark:text-violet-200">
              Requiere RAP
            </span>
          ) : null}
        </div>
      </div>

      {/* Chat — espacio de trabajo primario */}
      <div className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:p-6 dark:border-slate-800/80 dark:bg-slate-900/40 dark:shadow-none">
        <AgentModeSelect
          value={agentMode}
          onChange={setAgentMode}
          disabled={sending}
        />
        <div className="grid gap-4">
          <textarea
            className={`${controlClass} min-h-32`}
            value={chatInput}
            onChange={(event) => setChatInput(event.target.value)}
            placeholder="Escribe el contexto técnico del caso"
            disabled={sending}
          />
          <CaseAttachments
            caseId={caseItem.id}
            attachments={attachments}
            onChange={(next) => {
              setAttachments(next);
              // Si el usuario borra un adjunto que estaba seleccionado para
              // el próximo mensaje, lo saco del set seleccionado también.
              setSelectedAttachmentIds((prev) =>
                prev.filter((id) => next.some((row) => row.id === id)),
              );
            }}
          />
          <AttachmentSelector
            attachments={attachments}
            selectedIds={selectedAttachmentIds}
            onChange={setSelectedAttachmentIds}
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

      <div className="grid gap-2">
        {messages.length ? (
          [...messages].reverse().map((entry) => (
            <article
              key={entry.id}
              className={`rounded-xl border px-3.5 py-3 shadow-sm dark:shadow-none ${
                entry.author === "user"
                  ? "border-emerald-500/40 bg-emerald-50/80 dark:border-emerald-400/30 dark:bg-emerald-500/5"
                  : "border-cyan-500/40 bg-cyan-50/80 dark:border-cyan-400/30 dark:bg-cyan-500/5"
              }`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  {entry.author === "user"
                    ? "Usuario"
                    : `Agente · ${entry.mode_used}`}
                </p>
                <time
                  dateTime={entry.created_at}
                  className="text-[10px] font-medium tabular-nums text-slate-500 dark:text-slate-400"
                >
                  {formatMessageTime(entry.created_at)}
                </time>
              </div>
              <div className="mt-1.5 space-y-1.5 text-sm leading-6 text-slate-900 dark:text-slate-100 [&_p]:whitespace-pre-wrap [&_p]:break-words">
                {entry.content
                  .split(/\n{2,}/)
                  .filter((chunk) => chunk.trim().length > 0)
                  .map((chunk, index) => (
                    <p key={index}>{chunk}</p>
                  ))}
              </div>
            </article>
          ))
        ) : (
          <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
            Este caso todavía no tiene mensajes.
          </p>
        )}
      </div>

      {/* Ficha operativa — datos del caso para consulta y seguimiento */}
      <div className="flex items-center gap-3 pt-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">
          Ficha operativa
        </span>
        <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800/80" />
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
            Potencial (USD)
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Valor estimado del caso en dólares. Opcional. Ayuda a priorizar.
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-900 dark:text-slate-100">
            Registrado: {formatPotencialUsd(caseItem.potencial_usd)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500 dark:text-slate-400">
              $
            </span>
            <input
              className={`${controlClass} pl-7`}
              type="text"
              inputMode="numeric"
              value={potencialDraft}
              onChange={(event) => setPotencialDraft(event.target.value)}
              placeholder="0"
              disabled={savingPotencial}
            />
          </div>
          <button
            type="button"
            onClick={() => void handleSavePotencial()}
            disabled={
              savingPotencial || potencialInvalid || !potencialDirty
            }
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-400 dark:text-slate-950 dark:shadow-none dark:hover:bg-emerald-300"
          >
            {savingPotencial ? "Guardando…" : "Guardar"}
          </button>
        </div>
        {potencialInvalid ? (
          <span className="text-xs text-rose-600 dark:text-rose-300">
            Ingresa un entero mayor o igual a 0.
          </span>
        ) : potencialDirty ? (
          <span className="text-xs text-amber-600 dark:text-amber-300">
            Sin guardar
          </span>
        ) : null}
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

      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/40 dark:shadow-none">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            Cierre formal
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {caseItem.estado === "cerrado"
              ? "Desenlace del caso y bandera de reporte. Puedes dejar los campos sin registrar si no aplican."
              : "Puedes preparar estos datos antes de cerrar el caso. Quedan vinculados al cierre cuando cambies el estado a Cerrado."}
          </p>
        </div>

        <label className="grid gap-1.5 text-sm">
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            Resultado de cierre
          </span>
          <select
            className={controlClass}
            value={caseItem.resultado_cierre ?? ""}
            onChange={(event) => {
              const raw = event.target.value;
              void handleChangeResultado(
                raw === "" ? null : (raw as CaseResultadoCierre),
              );
            }}
            disabled={savingResultado}
          >
            <option value="">No registrado</option>
            {CASE_RESULTADOS_CIERRE.map((row) => (
              <option key={row.id} value={row.id}>
                {row.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 transition hover:border-violet-500/40 dark:border-slate-800/80 dark:bg-slate-950/40 dark:hover:border-violet-400/40">
          <input
            type="checkbox"
            checked={caseItem.requiere_rap}
            onChange={(event) => void handleChangeRap(event.target.checked)}
            disabled={savingRap}
            className="mt-0.5 h-4 w-4 rounded border-slate-400 text-violet-600 focus:ring-2 focus:ring-violet-500/30 dark:border-slate-600 dark:bg-slate-950 dark:text-violet-400"
          />
          <div className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-slate-900 dark:text-white">
              Requiere RAP
            </span>
            <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
              Marca si el caso requiere Reporte de Ahorros y Productividad.
              Opcional; se puede activar en cualquier momento y revisar al
              cierre.
            </span>
          </div>
        </label>
      </div>

      {caseItem.requiere_rap ? (
        <div className="relative overflow-hidden rounded-2xl border border-violet-500/30 bg-violet-50/60 p-5 shadow-sm dark:border-violet-400/30 dark:bg-violet-500/5 dark:shadow-none before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-violet-500 dark:before:bg-violet-400">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-violet-500/40 bg-violet-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-violet-800 dark:border-violet-400/40 dark:bg-violet-500/15 dark:text-violet-200">
              Reporte de Ahorros y Productividad
            </span>
            <span className="inline-flex items-center rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              Próximamente
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-800 dark:text-slate-200">
            Este caso está marcado como Requiere RAP. Aquí vivirá la
            sección específica para capturar los datos del reporte formal
            cuando el módulo se construya.
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-400">
            Por ahora solo está el flag. Esta área queda reservada para los
            campos del RAP (mediciones, indicadores, comparativos y
            entrega) en una ronda posterior.
          </p>
        </div>
      ) : null}

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
