import type { CaseRow } from "@/lib/workspace/folders";
import type { BrandId } from "@/lib/brands/brands";
import { BASE_RULES } from "./base";
import { buildCaseContext } from "./case-context";
import { GENERAL_MODE_RULES } from "./general";
import { SPECIALIST_COMMON_RULES } from "./specialist-common";
import { SANDVIK_PROFILE } from "./sandvik";
import { VARGUS_PROFILE } from "./vargus";
import { KORLOY_PROFILE } from "./korloy";
import { DORMER_PROFILE } from "./dormer";
import { AMEC_PROFILE } from "./amec";

export type SystemBlock = {
  type: "text";
  text: string;
  cache_control?: { type: "ephemeral" };
};

const BRAND_PROFILES: Record<Exclude<BrandId, "general" | "otro">, string> = {
  sandvik: SANDVIK_PROFILE,
  vargus: VARGUS_PROFILE,
  korloy: KORLOY_PROFILE,
  dormer: DORMER_PROFILE,
  amec: AMEC_PROFILE,
  // GESAC aún no tiene modo especialista; placeholder.
  gesac: "GESAC — Fabricante agregado al catálogo. Modo especialista pendiente.",
};

function buildModeBlock(mode: BrandId): string {
  if (mode === "general" || mode === "otro") return GENERAL_MODE_RULES;
  return `${SPECIALIST_COMMON_RULES}\n\n${BRAND_PROFILES[mode]}`;
}

/**
 * Opciones para inyectar fuentes externas al prompt (fuentes 1 y 2 de la
 * jerarquía definida en BASE_RULES).
 *
 * PRINCIPIO DE RECUPERACIÓN SELECTIVA (aplica cuando estas fuentes se
 * conecten en rondas posteriores):
 *
 * El retriever que provea retrievedContext o attachmentsContext DEBE ser
 * proporcional a la complejidad de la pregunta, NO exhaustivo. Su flujo:
 *   1. Clasificar tipo y dificultad de la pregunta (simple / media /
 *      compleja) a partir del turno actual más el contexto del caso.
 *   2. Decidir cuánto material recuperar en función de esa clasificación:
 *      pregunta simple → contexto mínimo (o nada, dejar que el modelo
 *      responda con memoria); pregunta media → 1 sección puntual
 *      relevante; pregunta compleja → varias secciones o una rama.
 *   3. Devolver SOLO los fragmentos realmente relevantes para el turno.
 *
 * Nunca leer la biblioteca entera ni todos los adjuntos por cada pregunta.
 * El objetivo del retriever es hacer al sistema más rápido, más barato y
 * más preciso que cualquier estrategia de "inyectar todo el catálogo".
 *
 * Este contrato se respeta tanto en la biblioteca interna como en la
 * lectura de adjuntos (p.ej. si el caso tiene 10 PDFs y la pregunta es
 * sobre uno, no se inyectan los otros 9).
 *
 * VALIDACIÓN DE CÓDIGOS ESPECÍFICOS (capacidad futura, no implementada):
 *
 * Cuando el sistema tenga validación en vivo de códigos contra librería
 * interna o contra catálogos/páginas oficiales de cada marca, el
 * orchestrator recibirá aquí los códigos ya validados con su fuente y
 * su link oficial. Con esa información inyectada, el agente podrá
 * afirmar el código y compartir el enlace oficial para que el vendedor
 * lo abra en planta. Sin ese pipe de validación, la REGLA DURA de
 * BASE_RULES sigue vigente: el agente no afirma códigos desde memoria
 * y no inventa enlaces.
 */
export type BuildSystemBlocksOptions = {
  // Fuente 1 (prioridad máxima): catálogo técnico propio de la marca.
  // Se inyecta cuando el retrieval RAG esté conectado (ronda posterior).
  retrievedContext?: string | null;
  // Fuente 2: adjuntos del caso (PDFs, fotos, planos) + análisis de
  // visión. Se inyecta cuando attachments + visión estén conectados.
  attachmentsContext?: string | null;
};

export function buildSystemBlocks(
  mode: BrandId,
  caseRow: CaseRow,
  options?: BuildSystemBlocksOptions,
): SystemBlock[] {
  const blocks: SystemBlock[] = [
    {
      type: "text",
      text: BASE_RULES,
      cache_control: { type: "ephemeral" },
    },
    {
      type: "text",
      text: buildModeBlock(mode),
      cache_control: { type: "ephemeral" },
    },
  ];

  // Fuente 1: catálogo indexado de la marca (RAG). Prioridad sobre
  // conocimiento general. Se inyecta solo cuando exista contexto
  // recuperado por el retrieval.
  if (options?.retrievedContext) {
    blocks.push({
      type: "text",
      text: `CATÁLOGO TÉCNICO DE LA MARCA (fuente de prioridad 1; úsala como base primaria, por encima del conocimiento general):\n\n${options.retrievedContext}`,
    });
  }

  // Fuente 2: adjuntos del caso con lectura de PDFs, fotos o planos.
  // Se inyecta cuando el caso tenga attachments procesados.
  if (options?.attachmentsContext) {
    blocks.push({
      type: "text",
      text: `ADJUNTOS DEL CASO (fuente de prioridad 2; considera antes del conocimiento general):\n\n${options.attachmentsContext}`,
    });
  }

  blocks.push({
    type: "text",
    text: buildCaseContext(caseRow),
  });

  return blocks;
}

export { buildCaseContext };
