import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { BRANDS, type BrandId } from "@/lib/brands/brands";
import { respondToCase } from "@/lib/agent/orchestrator";
import { fetchAttachmentsAsContentBlocks } from "@/lib/agent/attachments";
import type { CaseRow } from "@/lib/workspace/folders";

type Body = {
  caseId?: unknown;
  content?: unknown;
  mode?: unknown;
  attachmentIds?: unknown;
};

const CASE_COLUMNS =
  "id, folder_id, titulo, cliente, operacion, material, maquina, marca_preferida, estado, prioridad, siguiente_accion, resumen_ejecutivo, resultado_cierre, requiere_rap, potencial_usd, created_at";

const ALL_BRAND_IDS: BrandId[] = BRANDS.map((b) => b.id);

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

type HistoryRow = {
  author: "user" | "agent";
  content: string;
  created_at: string;
};

export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return jsonError("Body inválido.", 400);
  }

  const caseId = typeof body.caseId === "string" ? body.caseId : "";
  const content = typeof body.content === "string" ? body.content.trim() : "";
  const modeRaw = typeof body.mode === "string" ? body.mode : "general";
  const mode: BrandId = (ALL_BRAND_IDS as string[]).includes(modeRaw)
    ? (modeRaw as BrandId)
    : "general";

  const attachmentIds: string[] = Array.isArray(body.attachmentIds)
    ? body.attachmentIds.filter(
        (value): value is string => typeof value === "string",
      )
    : [];

  if (!caseId) return jsonError("caseId requerido.", 400);
  if (!content) return jsonError("content requerido.", 400);

  if (!process.env.ANTHROPIC_API_KEY) {
    return jsonError(
      "Servicio del agente sin configurar (falta ANTHROPIC_API_KEY).",
      503,
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonError("Supabase no configurado.", 503);
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return jsonError("Sin sesión.", 401);

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: caseData, error: caseError } = await supabase
    .from("cases")
    .select(CASE_COLUMNS)
    .eq("id", caseId)
    .maybeSingle<CaseRow>();

  if (caseError) return jsonError(caseError.message, 500);
  if (!caseData) return jsonError("Caso no encontrado o sin acceso.", 404);

  const { data: historyData, error: historyError } = await supabase
    .from("messages")
    .select("author, content, created_at")
    .eq("case_id", caseId)
    .order("created_at", { ascending: true })
    .returns<HistoryRow[]>();

  if (historyError) return jsonError(historyError.message, 500);

  const { data: userMessage, error: insertUserError } = await supabase
    .from("messages")
    .insert({
      case_id: caseId,
      author: "user",
      content,
      mode_used: mode,
    })
    .select("id, case_id, author, content, mode_used, created_at")
    .single();

  if (insertUserError || !userMessage) {
    return jsonError(
      insertUserError?.message ?? "No se pudo guardar tu mensaje.",
      500,
    );
  }

  let userContentBlocks;
  try {
    userContentBlocks =
      attachmentIds.length > 0
        ? await fetchAttachmentsAsContentBlocks(
            supabase,
            caseId,
            attachmentIds,
          )
        : undefined;
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudieron cargar los adjuntos seleccionados.",
        userMessage,
      },
      { status: 502 },
    );
  }

  let agentResult;
  try {
    agentResult = await respondToCase({
      caseRow: caseData,
      history: [
        ...(historyData ?? []).map((h) => ({
          author: h.author,
          content: h.content,
        })),
        { author: "user" as const, content },
      ],
      mode,
      userContentBlocks,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error del agente IA.",
        userMessage,
      },
      { status: 502 },
    );
  }

  const { data: agentMessage, error: insertAgentError } = await supabase
    .from("messages")
    .insert({
      case_id: caseId,
      author: "agent",
      content: agentResult.text,
      mode_used: mode,
      tokens_input: agentResult.usage.tokensInput,
      tokens_output: agentResult.usage.tokensOutput,
      cost_usd: agentResult.usage.costUsd.toFixed(6),
    })
    .select("id, case_id, author, content, mode_used, created_at")
    .single();

  if (insertAgentError || !agentMessage) {
    return NextResponse.json(
      {
        error:
          insertAgentError?.message ??
          "No se pudo guardar la respuesta del agente.",
        userMessage,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ userMessage, agentMessage });
}
