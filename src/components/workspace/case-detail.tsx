"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { createMessage, listMessages } from "@/lib/workspace/messages";
import { buildGeneralAgentResponse } from "@/lib/agent/general-response";
import { buildSpecialistAgentResponse } from "@/lib/agent/specialist-response";
import type { BrandId } from "@/lib/brands/brands";
import { AgentModeSelect } from "./agent-mode-select";

type CaseRow = {
  id: string;
  folder_id: string;
  titulo: string;
  cliente: string | null;
  operacion: string | null;
  material: string | null;
  maquina: string | null;
  marca_preferida: string | null;
  estado: string;
  created_at: string;
};

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

export function CaseDetail({ caseId }: CaseDetailProps) {
  const [caseItem, setCaseItem] = useState<CaseRow | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [agentMode, setAgentMode] = useState<BrandId>("general");
  const [message, setMessage] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: caseData, error: caseError } = await supabase
          .from("cases")
          .select(
            "id, folder_id, titulo, cliente, operacion, material, maquina, marca_preferida, estado, created_at",
          )
          .eq("id", caseId)
          .maybeSingle<CaseRow>();

        if (cancelled) return;
        if (caseError) throw caseError;
        if (!caseData) {
          setNotFound(true);
          return;
        }
        setCaseItem(caseData);

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
    return <p className="text-sm text-slate-400">Cargando caso…</p>;
  }

  if (notFound) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
        <p className="text-sm text-slate-300">
          No encontré ese caso. Puede estar borrado o no tienes acceso.
        </p>
        <Link
          href="/app/caso"
          className="mt-4 inline-flex rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-200 transition hover:border-emerald-400"
        >
          Volver a casos
        </Link>
      </div>
    );
  }

  if (!caseItem) return null;

  return (
    <section className="grid min-w-0 gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/app/caso"
            className="text-xs text-slate-400 transition hover:text-emerald-300"
          >
            ← Volver a casos
          </Link>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            {caseItem.titulo}
          </h2>
          <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-slate-400">
            {caseItem.estado}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {caseItem.cliente ? (
          <InfoTile label="Cliente" value={caseItem.cliente} />
        ) : null}
        {caseItem.operacion ? (
          <InfoTile label="Operación" value={caseItem.operacion} />
        ) : null}
        {caseItem.material ? (
          <InfoTile label="Material" value={caseItem.material} />
        ) : null}
        {caseItem.maquina ? (
          <InfoTile label="Máquina" value={caseItem.maquina} />
        ) : null}
        {caseItem.marca_preferida ? (
          <InfoTile label="Marca preferida" value={caseItem.marca_preferida} />
        ) : null}
      </div>

      <div className="grid gap-5 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 lg:p-6">
        <AgentModeSelect
          value={agentMode}
          onChange={setAgentMode}
          disabled={sending}
        />
        <div className="grid gap-3">
          <textarea
            className="min-h-32 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-50 outline-none transition focus:border-emerald-400"
            value={chatInput}
            onChange={(event) => setChatInput(event.target.value)}
            placeholder="Escribe el contexto técnico del caso"
            disabled={sending}
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={sending || !chatInput.trim()}
            className="rounded-xl bg-emerald-400 px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
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
              className={`rounded-xl border p-4 ${
                entry.author === "user"
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-cyan-500/30 bg-cyan-500/5"
              }`}
            >
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
                {entry.author === "user"
                  ? "Usuario"
                  : `Agente · ${entry.mode_used}`}
              </p>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-100">
                {entry.content}
              </p>
            </article>
          ))
        ) : (
          <p className="text-sm leading-6 text-slate-400">
            Este caso todavía no tiene mensajes.
          </p>
        )}
      </div>

      {message ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-300">
          {message}
        </div>
      ) : null}
    </section>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 break-words text-sm text-slate-100">{value}</p>
    </div>
  );
}
