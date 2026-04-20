import Anthropic from "@anthropic-ai/sdk";

const DEFAULT_MODEL = "claude-sonnet-4-6";

let cached: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (cached) return cached;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY no está configurada.");
  }
  cached = new Anthropic({ apiKey });
  return cached;
}

export function getAnthropicModel(): string {
  return process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;
}
