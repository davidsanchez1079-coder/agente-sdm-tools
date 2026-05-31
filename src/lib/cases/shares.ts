import type { SupabaseClient } from "@supabase/supabase-js";

export type CaseSharePermission = "view" | "edit";

export type CaseShareRow = {
  id: string;
  case_id: string;
  shared_with_email: string;
  shared_with_member_id: string | null;
  shared_by: string | null;
  shared_at: string;
  revoked_at: string | null;
  permission: CaseSharePermission;
};

export type ShareableMember = {
  member_id: string;
  user_id: string;
  email: string;
  display_name: string;
  rol: "gerente" | "interno" | "externo";
};

// Alias retrocompatible. Quitar cuando todos los consumidores migren.
export type ShareableInterno = ShareableMember;


const SHARE_COLUMNS =
  "id, case_id, shared_with_email, shared_with_member_id, shared_by, shared_at, revoked_at, permission";

export async function listActiveShares(
  supabase: SupabaseClient,
  caseId: string,
): Promise<CaseShareRow[]> {
  const { data, error } = await supabase
    .from("case_shares")
    .select(SHARE_COLUMNS)
    .eq("case_id", caseId)
    .is("revoked_at", null)
    .order("shared_at", { ascending: false })
    .returns<CaseShareRow[]>();
  if (error) throw error;
  return data ?? [];
}

type ListWorkspaceMembersForCaseFlowRow = {
  member_id: string;
  user_id: string;
  email: string;
  rol: string;
  display_name: string;
};

export async function listShareableMembers(
  supabase: SupabaseClient,
  workspaceId: string,
  caseId?: string | null,
): Promise<ShareableMember[]> {
  const { data, error } = await supabase.rpc("list_workspace_members_for_case_flow", {
    workspace_id_input: workspaceId,
    case_id_input: caseId ?? null,
  });
  if (error) throw error;
  const rows = (data ?? []) as ListWorkspaceMembersForCaseFlowRow[];
  return rows.map((r) => {
    const rol =
      r.rol === "gerente" || r.rol === "interno" || r.rol === "externo"
        ? r.rol
        : ("externo" as const);
    return {
      member_id: r.member_id,
      user_id: r.user_id,
      email: r.email,
      rol,
      display_name: r.display_name || r.email,
    };
  });
}

// Alias retrocompatible.
export const listShareableInternos = listShareableMembers;

export async function addShare(
  supabase: SupabaseClient,
  caseId: string,
  member: ShareableMember,
  sharedByUserId: string,
  permission: CaseSharePermission,
): Promise<CaseShareRow> {
  const existing = await supabase
    .from("case_shares")
    .select(SHARE_COLUMNS)
    .eq("case_id", caseId)
    .ilike("shared_with_email", member.email)
    .maybeSingle<CaseShareRow>();

  if (existing.data) {
    const { data, error } = await supabase
      .from("case_shares")
      .update({
        shared_with_member_id: member.member_id,
        shared_by: sharedByUserId,
        shared_at: new Date().toISOString(),
        revoked_at: null,
        permission,
      })
      .eq("id", existing.data.id)
      .select(SHARE_COLUMNS)
      .single<CaseShareRow>();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("case_shares")
    .insert({
      case_id: caseId,
      shared_with_email: member.email,
      shared_with_member_id: member.member_id,
      shared_by: sharedByUserId,
      permission,
    })
    .select(SHARE_COLUMNS)
    .single<CaseShareRow>();
  if (error) throw error;
  return data;
}

/** Tras crear un caso: comparte con varios miembros (mismo permiso). Omite al creador. */
export async function addInitialCaseShares(
  supabase: SupabaseClient,
  caseId: string,
  sharedByUserId: string,
  members: ShareableMember[],
  permission: CaseSharePermission,
): Promise<void> {
  for (const member of members) {
    if (member.user_id === sharedByUserId) continue;
    await addShare(supabase, caseId, member, sharedByUserId, permission);
  }
}

export async function updateSharePermission(
  supabase: SupabaseClient,
  shareId: string,
  permission: CaseSharePermission,
): Promise<CaseShareRow> {
  const { data, error } = await supabase
    .from("case_shares")
    .update({ permission })
    .eq("id", shareId)
    .select(SHARE_COLUMNS)
    .single<CaseShareRow>();
  if (error) throw error;
  return data;
}

export async function revokeShare(
  supabase: SupabaseClient,
  shareId: string,
): Promise<void> {
  const { error } = await supabase
    .from("case_shares")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", shareId);
  if (error) throw error;
}
