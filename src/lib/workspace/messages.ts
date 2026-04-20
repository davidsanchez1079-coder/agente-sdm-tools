import type { SupabaseClient } from "@supabase/supabase-js";
import type { BrandId } from "@/lib/brands/brands";

export type MessageRow = {
  id: string;
  case_id: string;
  author: "user" | "agent";
  content: string;
  mode_used: BrandId;
  created_at: string;
  attachment_ids: string[];
};

type MessageAttachmentLink = {
  message_id: string;
  attachment_id: string;
};

const MESSAGE_COLUMNS = "id, case_id, author, content, mode_used, created_at";

export async function listMessages(
  supabase: SupabaseClient,
  caseId: string,
): Promise<MessageRow[]> {
  const { data: msgs, error } = await supabase
    .from("messages")
    .select(MESSAGE_COLUMNS)
    .eq("case_id", caseId)
    .order("created_at", { ascending: true })
    .returns<Omit<MessageRow, "attachment_ids">[]>();

  if (error) throw error;
  if (!msgs || msgs.length === 0) return [];

  const messageIds = msgs.map((m) => m.id);
  const { data: links, error: linkError } = await supabase
    .from("message_attachments")
    .select("message_id, attachment_id")
    .in("message_id", messageIds)
    .returns<MessageAttachmentLink[]>();

  if (linkError) throw linkError;

  const byMessage = new Map<string, string[]>();
  for (const link of links ?? []) {
    const arr = byMessage.get(link.message_id);
    if (arr) arr.push(link.attachment_id);
    else byMessage.set(link.message_id, [link.attachment_id]);
  }

  return msgs.map((m) => ({
    ...m,
    attachment_ids: byMessage.get(m.id) ?? [],
  }));
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
    .select(MESSAGE_COLUMNS)
    .single<Omit<MessageRow, "attachment_ids">>();

  if (error) throw error;
  return { ...data, attachment_ids: [] as string[] };
}
