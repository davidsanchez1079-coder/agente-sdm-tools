import type { SupabaseClient, User } from "@supabase/supabase-js";

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

  const { data: existingWorkspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id, user_id")
    .eq("user_id", appUser.id)
    .maybeSingle<WorkspaceRow>();

  if (workspaceError) throw workspaceError;

  if (existingWorkspace) {
    return { appUser, workspace: existingWorkspace };
  }

  const { data: insertedWorkspace, error: insertWorkspaceError } = await supabase
    .from("workspaces")
    .insert({ user_id: appUser.id })
    .select("id, user_id")
    .single<WorkspaceRow>();

  if (insertWorkspaceError) throw insertWorkspaceError;

  return { appUser, workspace: insertedWorkspace };
}
