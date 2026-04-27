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

async function resolveWorkspaceRol(
  supabase: SupabaseClient,
  appUserId: string,
  workspace: WorkspaceRow,
): Promise<WorkspaceRol> {
  if (workspace.user_id === appUserId) {
    console.log("[GOTIA-DEBUG] resolveWorkspaceRol: owner of workspace", { appUserId, workspace });
    return "gerente";
  }

  const { data, error } = await supabase
    .from("workspace_members")
    .select("rol")
    .eq("workspace_id", workspace.id)
    .eq("user_id", appUserId)
    .eq("activo", true)
    .maybeSingle<{ rol: WorkspaceRol }>();

  console.log("[GOTIA-DEBUG] resolveWorkspaceRol: lookup workspace_members", {
    appUserId,
    workspaceId: workspace.id,
    workspaceOwner: workspace.user_id,
    rowFound: data,
    rolResolved: data?.rol ?? "externo (fallback)",
    error: error ? { code: error.code, message: error.message } : null,
  });
  return data?.rol ?? "externo";
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

  // Prefer primary workspace via RPC: owned > membered. Esto cubre a
  // invitees (que NO tienen workspace propio pero sí membresía en el
  // del gerente que los invitó) y a workspace owners (que ven el suyo).
  const primaryRes = await supabase.rpc("get_primary_workspace_for_user", {
    user_id_input: appUser.id,
  });
  console.log("[GOTIA-DEBUG] bootstrap: get_primary_workspace_for_user RPC", {
    appUserId: appUser.id,
    appUserEmail: appUser.email,
    error: primaryRes.error ? { code: primaryRes.error.code, message: primaryRes.error.message } : null,
    rows: primaryRes.data,
  });
  if (!primaryRes.error && primaryRes.data) {
    const rows = primaryRes.data as unknown as WorkspaceRow[];
    if (rows.length > 0) {
      const workspace = rows[0];
      const workspaceRol = await resolveWorkspaceRol(supabase, appUser.id, workspace);
      console.log("[GOTIA-DEBUG] bootstrap: returning via RPC path", { workspace, workspaceRol });
      return { appUser, workspace, workspaceRol };
    }
  }

  // Fallback: comportamiento original. Si por alguna razón la RPC no
  // existe todavía (migración aún no aplicada) o falla, intentamos
  // resolver el workspace propio directamente. Y si no existe, lo
  // creamos.
  const { data: existingWorkspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id, user_id")
    .eq("user_id", appUser.id)
    .maybeSingle<WorkspaceRow>();

  if (workspaceError) throw workspaceError;

  if (existingWorkspace) {
    console.log("[GOTIA-DEBUG] bootstrap: returning via FALLBACK existing-workspace path (forced gerente)", { existingWorkspace, appUserId: appUser.id });
    return { appUser, workspace: existingWorkspace, workspaceRol: "gerente" as WorkspaceRol };
  }

  const { data: insertedWorkspace, error: insertWorkspaceError } = await supabase
    .from("workspaces")
    .insert({ user_id: appUser.id })
    .select("id, user_id")
    .single<WorkspaceRow>();

  if (insertWorkspaceError) throw insertWorkspaceError;

  console.log("[GOTIA-DEBUG] bootstrap: returning via FALLBACK new-workspace path (forced gerente)", { insertedWorkspace, appUserId: appUser.id });
  return { appUser, workspace: insertedWorkspace, workspaceRol: "gerente" as WorkspaceRol };
}
