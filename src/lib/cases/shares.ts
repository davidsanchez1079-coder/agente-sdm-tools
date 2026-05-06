import type { SupabaseClient } from "@supabase/supabase-js";
import {
  listMembers,
  memberStatus,
  type WorkspaceMemberRow,
} from "@/lib/permisos/permisos-db";

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
  /** Ausente hasta aplicar migración `case_share_link_token`. */
  link_token?: string | null;
};

export type ShareableMember = {
  member_id: string;
  /** null hasta que acepten la invitación y se vincule cuenta */
  user_id: string | null;
  email: string;
  display_name: string;
  rol: "gerente" | "interno" | "externo";
  /** null = invitación pendiente (como en Accesos) */
  joined_at: string | null;
};

// Alias retrocompatible. Quitar cuando todos los consumidores migren.
export type ShareableInterno = ShareableMember;

/**
 * Quién puede compartir / revocar / cambiar permisos: admin de app, dueño del
 * workspace, gerente o interno con membresía activa en el workspace del caso
 * (alineado con case_shares INSERT tras migración interno_can_share_cases).
 */
export async function canManageSharesInWorkspace(
  supabase: SupabaseClient,
  appUserId: string,
  workspaceId: string,
  isAppAdmin: boolean,
): Promise<boolean> {
  if (isAppAdmin) return true;
  const { data: ws, error: wsErr } = await supabase
    .from("workspaces")
    .select("user_id")
    .eq("id", workspaceId)
    .maybeSingle<{ user_id: string }>();
  if (wsErr) throw wsErr;
  if (ws?.user_id === appUserId) return true;
  const { data: rows, error: memErr } = await supabase
    .from("workspace_members")
    .select("rol")
    .eq("workspace_id", workspaceId)
    .eq("user_id", appUserId)
    .eq("activo", true);
  if (memErr) throw memErr;
  return (rows ?? []).some(
    (r) => r.rol === "gerente" || r.rol === "interno",
  );
}

function workspaceMemberRowToShareable(m: WorkspaceMemberRow): ShareableMember {
  return {
    member_id: m.id,
    user_id: m.user_id,
    email: m.email,
    rol: m.rol,
    display_name: m.email,
    joined_at: m.joined_at,
  };
}

function sortShareable(mapped: ShareableMember[]): ShareableMember[] {
  mapped.sort((a, b) =>
    a.display_name.localeCompare(b.display_name, "es", { sensitivity: "base" }),
  );
  return mapped;
}

const SHARE_COLUMNS =
  "id, case_id, shared_with_email, shared_with_member_id, shared_by, shared_at, revoked_at, permission, link_token";

/** Token opaco para /compartir?t=... (32 bytes hex). */
export function randomShareLinkToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** URL pública amigable (misma ventana); requiere origin en cliente. */
export function getPublicShareLandingUrl(token: string): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/compartir?t=${encodeURIComponent(token)}`;
}

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
  type RpcRow = {
    member_id: string;
    user_id: string | null;
    email: string;
    rol: string;
    nombre: string | null;
    apellido: string | null;
    joined_at: string | null;
  };

  function mapRpcRows(rows: RpcRow[]): ShareableMember[] {
    return rows.map((r) => {
      const fullName = [r.nombre, r.apellido].filter(Boolean).join(" ").trim();
      return {
        member_id: r.member_id,
        user_id: r.user_id,
        email: r.email,
        rol: r.rol as ShareableMember["rol"],
        display_name: fullName || r.email,
        joined_at: r.joined_at,
      };
    });
  }

  async function fromJoinQuery(): Promise<ShareableMember[]> {
    const { data, error } = await supabase
      .from("workspace_members")
      .select("id, user_id, email, rol, joined_at, users(id, nombre, apellido, email)")
      .eq("workspace_id", workspaceId)
      .eq("activo", true);
    if (error) throw error;
    type Row = {
      id: string;
      user_id: string | null;
      email: string;
      rol: "gerente" | "interno" | "externo";
      joined_at: string | null;
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
        joined_at: r.joined_at,
      };
    });
  }

  async function fromAccesosList(): Promise<ShareableMember[]> {
    const members = await listMembers(supabase, workspaceId);
    return members
      .filter((m) => memberStatus(m) !== "inactivo")
      .map(workspaceMemberRowToShareable);
  }

  const rpc = await supabase.rpc("list_workspace_members_for_share", {
    p_workspace_id: workspaceId,
  });

  if (!rpc.error && Array.isArray(rpc.data) && rpc.data.length > 0) {
    return sortShareable(mapRpcRows(rpc.data as RpcRow[]));
  }

  try {
    const joined = await fromJoinQuery();
    if (joined.length > 0) return sortShareable(joined);
  } catch {
    // sigue al mismo catálogo que Accesos
  }

  return sortShareable(await fromAccesosList());
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
        link_token: randomShareLinkToken(),
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
      link_token: randomShareLinkToken(),
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
    .update({ revoked_at: new Date().toISOString(), link_token: null })
    .eq("id", shareId);
  if (error) throw error;
}

/** Si el share activo no tiene token (filas antiguas), lo crea y devuelve. */
export async function ensureShareLinkToken(
  supabase: SupabaseClient,
  shareId: string,
): Promise<string> {
  const { data: row, error: readError } = await supabase
    .from("case_shares")
    .select("link_token")
    .eq("id", shareId)
    .is("revoked_at", null)
    .maybeSingle<{ link_token: string | null }>();
  if (readError) throw readError;
  if (row?.link_token) return row.link_token;

  const token = randomShareLinkToken();
  const { error } = await supabase
    .from("case_shares")
    .update({ link_token: token })
    .eq("id", shareId)
    .is("revoked_at", null);
  if (error) throw error;
  return token;
}
