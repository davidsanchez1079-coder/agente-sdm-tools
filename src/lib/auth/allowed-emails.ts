import type { SupabaseClient } from "@supabase/supabase-js";

const allowedEmails = [
  "david.sanchez@stamadeus.com",
  "david.sanchez@sadama.com.mx",
] as const;

// Whitelist hardcoded — backup defensivo para los gerentes originales.
// El check real de "puede entrar" es isEmailAllowedForSignIn (async)
// que adicionalmente consulta workspace_members.
export function isAllowedEmail(email: string) {
  return allowedEmails.includes(
    email.trim().toLowerCase() as (typeof allowedEmails)[number],
  );
}

export function getAllowedEmails() {
  return [...allowedEmails];
}

// Async: pasa si el email está en la whitelist hardcoded O si tiene
// una membership aceptada (joined_at not null) en cualquier workspace.
// Usa la función SQL email_has_workspace_membership con security
// definer porque la página de login es anónima y no tiene RLS para
// leer workspace_members.
export async function isEmailAllowedForSignIn(
  supabase: SupabaseClient,
  email: string,
): Promise<boolean> {
  const trimmed = email.trim().toLowerCase();
  if (isAllowedEmail(trimmed)) return true;

  const { data, error } = await supabase.rpc(
    "email_has_workspace_membership",
    { email_input: trimmed },
  );
  if (error) {
    // Si la RPC falla (BD caída, función ausente), ser conservador
    // y no bloquear el intento — Supabase auth.signInWithPassword
    // rechazará igual si no existe la cuenta. Mejor pasar al intento
    // que dar una pantalla rota.
    return true;
  }
  return Boolean(data);
}
