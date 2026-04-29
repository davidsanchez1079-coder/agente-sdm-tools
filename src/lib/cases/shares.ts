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

export async function listShareableMembers(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<ShareableMember[]> {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("id, user_id, email, rol, users!inner(id, nombre, apellido, email)")
    .eq("workspace_id", workspaceId)
    .eq("activo", true)
    .not("user_id", "is", null)
    .not("joined_at", "is", null);
  if (error) throw error;
  type Row = {
    id: string;
    user_id: string;
    email: string;
    rol: "gerente" | "interno" | "externo";
    users: { id: string; nombre: string; apellido: string | null; email: string } | null;
  };
  const rows = (data ?? []) as unknown as Row[];
  return rows.map((r) => {
    const fullName = r.users
      ? [r.users.nombre, r.users.apellido].filter(Boolean).join(" ").trim()
      : "";
    return {
      member_id: r.id,
      user_id: r.user_id,
      email: r.email,
      rol: r.rol,
      display_name: fullName || r.email,
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
