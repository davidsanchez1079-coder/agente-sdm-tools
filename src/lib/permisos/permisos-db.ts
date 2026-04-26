import type { SupabaseClient } from "@supabase/supabase-js";

export type WorkspaceMemberRol = "gerente" | "interno" | "externo";

export type WorkspaceMemberRow = {
  id: string;
  workspace_id: string;
  user_id: string | null;
  email: string;
  rol: WorkspaceMemberRol;
  activo: boolean;
  invited_by: string | null;
  invited_at: string;
  joined_at: string | null;
  invitation_token: string | null;
  invitation_expires_at: string | null;
  created_at: string;
};

const MEMBER_COLUMNS =
  "id, workspace_id, user_id, email, rol, activo, invited_by, invited_at, joined_at, invitation_token, invitation_expires_at, created_at";

export type MemberStatus = "pendiente" | "activo" | "inactivo";

export function memberStatus(row: WorkspaceMemberRow): MemberStatus {
  if (!row.activo) return "inactivo";
  if (!row.joined_at) return "pendiente";
  return "activo";
}

export async function listMembers(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<WorkspaceMemberRow[]> {
  const { data, error } = await supabase
    .from("workspace_members")
    .select(MEMBER_COLUMNS)
    .eq("workspace_id", workspaceId)
    .order("rol", { ascending: true })
    .order("email", { ascending: true })
    .returns<WorkspaceMemberRow[]>();
  if (error) throw error;
  return data ?? [];
}

// Devuelve el id del workspace_members.id correspondiente al auth user
// actual. null si no es member o no se resolvió. Útil para gating UI.
export async function getMyMembership(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<WorkspaceMemberRow | null> {
  const { data, error } = await supabase
    .from("workspace_members")
    .select(MEMBER_COLUMNS)
    .eq("workspace_id", workspaceId)
    .not("user_id", "is", null)
    .returns<WorkspaceMemberRow[]>();
  if (error) throw error;
  // RLS deja ver solo lo del workspace en el que el caller es member
  // (gerente ve todos; interno/externo ven solo el suyo). El filtro
  // posterior contra user_id se hace via la sesión, pero PostgREST no
  // expone auth.uid() directamente al cliente — el truco es que para
  // un interno/externo este query solo devolverá una fila (la suya).
  // Para gerente que ve varias filas, el fallback es buscar por email
  // del session.user.email; ese se resuelve en la página vía
  // supabase.auth.getUser().
  return data && data.length > 0 ? data[0] : null;
}

export async function getMemberBrands(
  supabase: SupabaseClient,
  memberId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("workspace_member_brands")
    .select("brand_id")
    .eq("member_id", memberId)
    .returns<{ brand_id: string }[]>();
  if (error) throw error;
  return (data ?? []).map((r) => r.brand_id);
}

export async function getMemberBrandsBatch(
  supabase: SupabaseClient,
  memberIds: string[],
): Promise<Record<string, string[]>> {
  if (memberIds.length === 0) return {};
  const { data, error } = await supabase
    .from("workspace_member_brands")
    .select("member_id, brand_id")
    .in("member_id", memberIds)
    .returns<{ member_id: string; brand_id: string }[]>();
  if (error) throw error;
  const byMember: Record<string, string[]> = {};
  for (const row of data ?? []) {
    if (!byMember[row.member_id]) byMember[row.member_id] = [];
    byMember[row.member_id].push(row.brand_id);
  }
  return byMember;
}
