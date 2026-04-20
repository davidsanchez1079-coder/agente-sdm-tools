import type { CaseRow } from "@/lib/workspace/folders";
import type { BrandId } from "@/lib/brands/brands";
import { getAnthropicClient, getAnthropicModel } from "./anthropic-client";
import {
  buildSystemBlocks,
  type BuildSystemBlocksOptions,
} from "./prompts";
import type { UserContentBlock } from "./attachments";

type Turn = {
  author: "user" | "agent";
  content: string;
};

export type AgentUsage = {
  tokensInput: number;
  tokensOutput: number;
  costUsd: number;
};

export type AgentResult = {
  text: string;
  mode: BrandId;
  usage: AgentUsage;
  modelUsed: string;
};

// Precios aproximados de Claude Sonnet 4.6 en USD por millón de tokens.
// Si cambias el modelo via ANTHROPIC_MODEL, el costo registrado quedará
// estimado con estas tarifas; ajustar cuando se soporten más modelos.
const SONNET_RATES = {
  input: 3,
  cacheWrite: 3.75,
  cacheRead: 0.3,
  output: 15,
};

function estimateCost(usage: {
  input: number;
  cacheWrite: number;
  cacheRead: number;
  output: number;
}): number {
  return (
    (usage.input * SONNET_RATES.input +
      usage.cacheWrite * SONNET_RATES.cacheWrite +
      usage.cacheRead * SONNET_RATES.cacheRead +
      usage.output * SONNET_RATES.output) /
    1_000_000
  );
}

export type RespondToCaseOptions = BuildSystemBlocksOptions;

export async function respondToCase({
  caseRow,
  history,
  mode,
  sources,
  userContentBlocks,
}: {
  caseRow: CaseRow;
  history: Turn[];
  mode: BrandId;
  sources?: RespondToCaseOptions;
  /**
   * Bloques multimodales (imagen, PDF) que se inyectan en el ÚLTIMO
   * turno del historial cuando ese turno es del usuario. Permite que
   * el agente analice adjuntos específicos del caso seleccionados por
   * el usuario para esta pregunta.
   */
  userContentBlocks?: UserContentBlock[];
}): Promise<AgentResult> {
  const client = getAnthropicClient();
  const model = getAnthropicModel();

  const systemBlocks = buildSystemBlocks(mode, caseRow, sources);

  const trimmed = history.slice(-20);
  const hasAttachments =
    userContentBlocks !== undefined && userContentBlocks.length > 0;
  const messages = trimmed.map((turn, index) => {
    const isLast = index === trimmed.length - 1;
    if (isLast && hasAttachments && turn.author === "user") {
      return {
        role: "user" as const,
        content: [
          { type: "text" as const, text: turn.content },
          ...(userContentBlocks ?? []),
        ],
      };
    }
    return {
      role:
        turn.author === "agent" ? ("assistant" as const) : ("user" as const),
      content: turn.content,
    };
  });

  const response = await client.messages.create({
    model,
    max_tokens: 1500,
    system: systemBlocks,
    messages,
  });

  const text = response.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .filter((chunk) => chunk.length > 0)
    .join("\n\n")
    .trim();

  const usageRaw = response.usage;
  const inputTokens = usageRaw?.input_tokens ?? 0;
  const cacheCreation = usageRaw?.cache_creation_input_tokens ?? 0;
  const cacheRead = usageRaw?.cache_read_input_tokens ?? 0;
  const outputTokens = usageRaw?.output_tokens ?? 0;

  const costUsd = estimateCost({
    input: inputTokens,
    cacheWrite: cacheCreation,
    cacheRead,
    output: outputTokens,
  });

  return {
    text,
    mode,
    usage: {
      tokensInput: inputTokens + cacheCreation + cacheRead,
      tokensOutput: outputTokens,
      costUsd,
    },
    modelUsed: model,
  };
}
