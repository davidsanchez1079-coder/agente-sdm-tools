// Formatea cualquier error a string con prefijo de codigo cuando exista.
// Reconoce PostgrestError de Supabase (code, message, details, hint) y
// Error estandar. Salida tipica:
//   Error [42501]: new row violates row-level security policy ...
//   Error [PGRST116]: JSON object requested, multiple (or no) rows returned
//   Error: <message libre si no hay code>
//   <fallback> si el error no expone ni code ni message.
export function formatError(error: unknown, fallback: string): string {
  if (error && typeof error === "object") {
    const e = error as { code?: unknown; message?: unknown };
    const code = typeof e.code === "string" && e.code.length > 0 ? e.code : null;
    const msg = typeof e.message === "string" && e.message.length > 0 ? e.message : null;
    if (code && msg) return `Error [${code}]: ${msg}`;
    if (code) return `Error [${code}]: ${fallback}`;
    if (msg) return `Error: ${msg}`;
  }
  return fallback;
}
