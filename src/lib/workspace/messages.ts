import type { SupabaseClient } from "@supabase/supabase-js";
import type { BrandId } from "@/lib/brands/brands";

type MessageRow = {
  id: string;
  case_id: string;
  author: "user" | "agent";
  content: string;
  mode_used: BrandId;
  created_at: string;
};

export async function listMessages(supabase: SupabaseClient, caseId: string) {
  const { data, error } = await supabase
    .from("messages")
    .select("id, case_id, author, content, mode_used, created_at")
    .eq("case_id", caseId)
    .order("created_at", { ascending: true })
    .returns<MessageRow[]>();

  if (error) throw error;
  return data;
}

export async function createMessage(
  supabase: SupabaseClient,
  caseId: string,
  author: "user" | "agent",
  content: string,
  modeUsed: MessageRow["mode_used"] = "general",
) {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      case_id: caseId,
      author,
      content,
      mode_used: modeUsed,
      tokens_input: 0,
      tokens_output: 0,
      cost_usd: 0,
    })
    .select("id, case_id, author, content, mode_used, created_at")
    .single<MessageRow>();

  if (error) throw error;
  return data;
}
