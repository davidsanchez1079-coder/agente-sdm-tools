import type { SupabaseClient, User } from "@supabase/supabase-js";

export type WorkspaceRol = "gerente" | "interno" | "externo";

type AppUserRow = {
  id: string;
  auth_user_id: string;
  nombre: string;
  apellido: string | null;
  email: string;
  telefono: string | null;
  rol: "admin" | "user";
  activo: boolean;
};

type WorkspaceRow = {
  id: string;
  user_id: string;
};

const ROL_RANK: Record<WorkspaceRol, number> = {
  gerente: 1,
  interno: 2,
  externo: 3,
};

function pickBetterRol(a: WorkspaceRol, b: WorkspaceRol): WorkspaceRol {
  return ROL_RANK[a] <= ROL_RANK[b] ? a : b;
}

/**
 * Elige workspace activo desde membresía real (misma base que RLS:
 * workspace_members activo + user_id no nulo). Prioriza workspaces donde el
 * usuario NO es dueño (equivalente a “invitado” en el RPC), y luego el rol más
 * alto (gerente > interno > externo).
 */
async function pickPrimaryWorkspaceFromMembers(
  supabase: SupabaseClient,
  appUserId: string,
): Promise<{ workspace: WorkspaceRow; workspaceRol: WorkspaceRol } | null> {
  const { data: members, error: memError } = await supabase
    .from("workspace_members")
    .select("workspace_id, rol")
    .eq("user_id", appUserId)
    .eq("activo", true)
    .not("user_id", "is", null)
    .returns<{ workspace_id: string; rol: WorkspaceRol }[]>();

  if (memError) throw memError;
  if (!members?.length) return null;

  const bestRolByWs = new Map<string, WorkspaceRol>();
  for (const m of members) {
    const prev = bestRolByWs.get(m.workspace_id);
    bestRolByWs.set(
      m.workspace_id,
      prev ? pickBetterRol(prev, m.rol) : m.rol,
    );
  }

  const workspaceIds = [...bestRolByWs.keys()];
  const { data: workspaces, error: wsError } = await supabase
    .from("workspaces")
    .select("id, user_id")
    .in("id", workspaceIds)
    .returns<WorkspaceRow[]>();

  if (wsError) throw wsError;

  const wsById = new Map((workspaces ?? []).map((w) => [w.id, w]));

  type Cand = { workspace: WorkspaceRow; workspaceRol: WorkspaceRol };
  const candidates: Cand[] = [];
  for (const [wsId, rol] of bestRolByWs) {
    const w = wsById.get(wsId);
    if (!w) continue;
    const workspaceRol =
      w.user_id === appUserId ? ("gerente" as const) : rol;
    candidates.push({ workspace: w, workspaceRol });
  }
  if (!candidates.length) return null;

  const invited = candidates.filter((c) => c.workspace.user_id !== appUserId);
  const pool = invited.length ? invited : candidates;

  let best: Cand | null = null;
  for (const c of pool) {
    if (!best) {
      best = c;
      continue;
    }
    const rdiff = ROL_RANK[c.workspaceRol] - ROL_RANK[best.workspaceRol];
    if (rdiff < 0) best = c;
    else if (rdiff === 0 && c.workspace.id < best.workspace.id) best = c;
  }

  return best;
}

async function resolveWorkspaceRol(
  supabase: SupabaseClient,
  appUserId: string,
  workspace: WorkspaceRow,
): Promise<WorkspaceRol> {
  if (workspace.user_id === appUserId) return "gerente";

  // Puede haber más de una fila por (workspace_id, user_id) si históricamente
  // se crearon invitaciones con emails distintos: maybeSingle() fallaría y
  // terminaríamos en "externo" por defecto. Tomamos el mayor privilegio.
  const { data, error } = await supabase
    .from("workspace_members")
    .select("rol")
    .eq("workspace_id", workspace.id)
    .eq("user_id", appUserId)
    .eq("activo", true)
    .returns<{ rol: WorkspaceRol }[]>();

  if (error) throw error;

  let best: WorkspaceRol | null = null;
  for (const row of data ?? []) {
    const rol = row.rol;
    if (!best || ROL_RANK[rol] < ROL_RANK[best]) best = rol;
  }

  return best ?? "externo";
}

function deriveNameParts(email: string) {
  const local = email.split("@")[0] ?? "usuario";
  const parts = local
    .split(/[._-]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const nombre = parts[0] ?? "Usuario";
  const apellido = parts.slice(1).join(" ") || null;
  return { nombre, apellido };
}

export async function ensureWorkspaceForUser(supabase: SupabaseClient, authUser: User) {
  const { data: existingUser, error: userError } = await supabase
    .from("users")
    .select("id, auth_user_id, nombre, apellido, email, telefono, rol, activo")
    .eq("auth_user_id", authUser.id)
    .maybeSingle<AppUserRow>();

  if (userError) throw userError;

  let appUser = existingUser;

  if (!appUser) {
    const { nombre, apellido } = deriveNameParts(authUser.email ?? "usuario@empresa.com");

    const { data: insertedUser, error: insertUserError } = await supabase
      .from("users")
      .insert({
        auth_user_id: authUser.id,
        nombre,
        apellido,
        email: authUser.email ?? `${authUser.id}@placeholder.local`,
        rol: "user",
        activo: true,
      })
      .select("id, auth_user_id, nombre, apellido, email, telefono, rol, activo")
      .single<AppUserRow>();

    if (insertUserError) throw insertUserError;
    appUser = insertedUser;
  }

  // 1) Membresía real primero: alinea con RLS (user_has_workspace_role) y evita
  //    quedar en el workspace “vacío” propio cuando ya hay fila en
  //    workspace_members (p. ej. RPC exige joined_at y RLS no).
  const fromMembers = await pickPrimaryWorkspaceFromMembers(supabase, appUser.id);
  if (fromMembers) {
    return { appUser, workspace: fromMembers.workspace, workspaceRol: fromMembers.workspaceRol };
  }

  // 2) RPC histórica: dueño sin fila en members, o entornos sin membresías.
  const primaryRes = await supabase.rpc("get_primary_workspace_for_user", {
    user_id_input: appUser.id,
  });
  if (!primaryRes.error && primaryRes.data) {
    const rows = primaryRes.data as unknown as WorkspaceRow[];
    if (rows.length > 0) {
      const workspace = rows[0];
      const workspaceRol = await resolveWorkspaceRol(supabase, appUser.id, workspace);
      return { appUser, workspace, workspaceRol };
    }
  }

  // 3) Fallback: workspace propio por ownership. Si no existe, lo creamos.
  const { data: existingWorkspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id, user_id")
    .eq("user_id", appUser.id)
    .maybeSingle<WorkspaceRow>();

  if (workspaceError) throw workspaceError;

  if (existingWorkspace) {
    return { appUser, workspace: existingWorkspace, workspaceRol: "gerente" as WorkspaceRol };
  }

  const { data: insertedWorkspace, error: insertWorkspaceError } = await supabase
    .from("workspaces")
    .insert({ user_id: appUser.id })
    .select("id, user_id")
    .single<WorkspaceRow>();

  if (insertWorkspaceError) throw insertWorkspaceError;

  return { appUser, workspace: insertedWorkspace, workspaceRol: "gerente" as WorkspaceRol };
}
