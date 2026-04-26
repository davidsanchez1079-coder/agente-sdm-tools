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

// Cuenta gerentes activos del workspace. Usado para evitar quitar al
// último gerente (degradar rol o desactivar/eliminar).
export async function countActiveGerentes(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("workspace_members")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("rol", "gerente")
    .eq("activo", true);
  if (error) throw error;
  return count ?? 0;
}

export type CreateInvitationInput = {
  email: string;
  rol: WorkspaceMemberRol;
  brandIds?: string[];
  expiresInDays?: number;
};

// Crea una invitación con token. Devuelve el row con el token para
// armar el link copiable. Si ya existe member con ese email en el
// workspace (case-insensitive) el INSERT choca con el unique index y
// se propaga el error 23505 — el caller puede manejarlo.
export async function createInvitation(
  supabase: SupabaseClient,
  workspaceId: string,
  input: CreateInvitationInput,
): Promise<WorkspaceMemberRow> {
  const expiresInDays = input.expiresInDays ?? 7;
  const expiresAt = new Date(
    Date.now() + expiresInDays * 24 * 60 * 60 * 1000,
  ).toISOString();
  const token = crypto.randomUUID();

  const { data: created, error } = await supabase
    .from("workspace_members")
    .insert({
      workspace_id: workspaceId,
      email: input.email.trim().toLowerCase(),
      rol: input.rol,
      activo: true,
      invitation_token: token,
      invitation_expires_at: expiresAt,
    })
    .select(MEMBER_COLUMNS)
    .single<WorkspaceMemberRow>();
  if (error) throw error;

  if (input.rol === "externo" && input.brandIds && input.brandIds.length > 0) {
    const rows = input.brandIds.map((brandId) => ({
      member_id: created.id,
      brand_id: brandId,
    }));
    const { error: brandErr } = await supabase
      .from("workspace_member_brands")
      .insert(rows);
    if (brandErr) {
      // Member ya creado; reportamos el error de marcas pero no
      // rolleamos manualmente (la transacción está en commit).
      throw brandErr;
    }
  }

  return created;
}

export async function regenerateInvitationToken(
  supabase: SupabaseClient,
  memberId: string,
  expiresInDays = 7,
): Promise<WorkspaceMemberRow> {
  const expiresAt = new Date(
    Date.now() + expiresInDays * 24 * 60 * 60 * 1000,
  ).toISOString();
  const token = crypto.randomUUID();
  const { data, error } = await supabase
    .from("workspace_members")
    .update({
      invitation_token: token,
      invitation_expires_at: expiresAt,
    })
    .eq("id", memberId)
    .select(MEMBER_COLUMNS)
    .single<WorkspaceMemberRow>();
  if (error) throw error;
  return data;
}

export async function updateMemberRol(
  supabase: SupabaseClient,
  memberId: string,
  rol: WorkspaceMemberRol,
): Promise<WorkspaceMemberRow> {
  const { data, error } = await supabase
    .from("workspace_members")
    .update({ rol })
    .eq("id", memberId)
    .select(MEMBER_COLUMNS)
    .single<WorkspaceMemberRow>();
  if (error) throw error;
  return data;
}

export async function updateMemberActivo(
  supabase: SupabaseClient,
  memberId: string,
  activo: boolean,
): Promise<WorkspaceMemberRow> {
  const { data, error } = await supabase
    .from("workspace_members")
    .update({ activo })
    .eq("id", memberId)
    .select(MEMBER_COLUMNS)
    .single<WorkspaceMemberRow>();
  if (error) throw error;
  return data;
}

export async function deleteMember(
  supabase: SupabaseClient,
  memberId: string,
): Promise<void> {
  const { error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("id", memberId);
  if (error) throw error;
}

export async function setMemberBrands(
  supabase: SupabaseClient,
  memberId: string,
  brandIds: string[],
): Promise<void> {
  // Reemplaza el set completo: borra los actuales y inserta los nuevos.
  // Operación no atómica al cliente — si falla a mitad queda en un
  // estado parcial. Para PR-C es aceptable; futuro: RPC que haga el
  // cambio atómico server-side.
  const { error: delErr } = await supabase
    .from("workspace_member_brands")
    .delete()
    .eq("member_id", memberId);
  if (delErr) throw delErr;
  if (brandIds.length === 0) return;
  const rows = brandIds.map((brandId) => ({
    member_id: memberId,
    brand_id: brandId,
  }));
  const { error: insErr } = await supabase
    .from("workspace_member_brands")
    .insert(rows);
  if (insErr) throw insErr;
}

export type InvitationPreview = {
  workspace_id: string;
  email: string;
  rol: WorkspaceMemberRol;
  invited_at: string;
  invitation_expires_at: string | null;
};

export async function previewInvitation(
  supabase: SupabaseClient,
  token: string,
): Promise<InvitationPreview | null> {
  const { data, error } = await supabase.rpc("preview_workspace_invitation", {
    token,
  });
  if (error) throw error;
  if (!data || (Array.isArray(data) && data.length === 0)) return null;
  return Array.isArray(data) ? (data[0] as InvitationPreview) : data;
}

export async function acceptInvitation(
  supabase: SupabaseClient,
  token: string,
): Promise<string> {
  const { data, error } = await supabase.rpc("accept_workspace_invitation", {
    token,
  });
  if (error) throw error;
  return data as string;
}
