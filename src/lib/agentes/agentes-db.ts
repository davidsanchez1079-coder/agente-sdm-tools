import type { SupabaseClient } from "@supabase/supabase-js";

export type AgenteRow = {
  id: string;
  workspace_id: string;
  nombre: string;
  apellido: string | null;
  rol_label: string | null;
  email: string | null;
  activo: boolean;
  created_at: string;
};

const AGENTE_COLUMNS =
  "id, workspace_id, nombre, apellido, rol_label, email, activo, created_at";

export function agenteFullName(
  agente: Pick<AgenteRow, "nombre" | "apellido">,
): string {
  const apellido = agente.apellido?.trim();
  return apellido ? `${agente.nombre} ${apellido}` : agente.nombre;
}

export async function listAgentes(
  supabase: SupabaseClient,
  workspaceId: string,
  opts: { onlyActive?: boolean } = {},
): Promise<AgenteRow[]> {
  let query = supabase
    .from("agentes")
    .select(AGENTE_COLUMNS)
    .eq("workspace_id", workspaceId)
    .order("nombre", { ascending: true });
  if (opts.onlyActive) {
    query = query.eq("activo", true);
  }
  const { data, error } = await query.returns<AgenteRow[]>();
  if (error) throw error;
  return data ?? [];
}

export async function getAgenteById(
  supabase: SupabaseClient,
  id: string,
): Promise<AgenteRow | null> {
  const { data, error } = await supabase
    .from("agentes")
    .select(AGENTE_COLUMNS)
    .eq("id", id)
    .maybeSingle<AgenteRow>();
  if (error) throw error;
  return data;
}

export type CreateAgenteInput = {
  nombre: string;
  apellido?: string | null;
  rolLabel?: string | null;
  email?: string | null;
  activo?: boolean;
};

export async function createAgente(
  supabase: SupabaseClient,
  workspaceId: string,
  input: CreateAgenteInput,
): Promise<AgenteRow> {
  const { data, error } = await supabase
    .from("agentes")
    .insert({
      workspace_id: workspaceId,
      nombre: input.nombre.trim(),
      apellido: input.apellido?.trim() || null,
      rol_label: input.rolLabel?.trim() || null,
      email: input.email?.trim() || null,
      activo: input.activo ?? true,
    })
    .select(AGENTE_COLUMNS)
    .single<AgenteRow>();
  if (error) throw error;
  return data;
}

export type UpdateAgentePatch = Partial<{
  nombre: string;
  apellido: string | null;
  rol_label: string | null;
  email: string | null;
  activo: boolean;
}>;

export async function updateAgente(
  supabase: SupabaseClient,
  id: string,
  patch: UpdateAgentePatch,
): Promise<AgenteRow> {
  const { data, error } = await supabase
    .from("agentes")
    .update(patch)
    .eq("id", id)
    .select(AGENTE_COLUMNS)
    .single<AgenteRow>();
  if (error) throw error;
  return data;
}

export async function deleteAgente(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase.from("agentes").delete().eq("id", id);
  if (error) throw error;
}

// Cuenta cuántos clientes y casos tienen a este agente como secundario.
// Se usa para mostrar info en el detalle del agente. NO bloquea borrado:
// la FK `on delete set null` limpia las referencias automáticamente
// cuando se borra el agente.
export async function countAgenteUsage(
  supabase: SupabaseClient,
  agenteId: string,
): Promise<{ customers: number; cases: number }> {
  const [customersRes, casesRes] = await Promise.all([
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("secondary_agente_id", agenteId),
    supabase
      .from("cases")
      .select("id", { count: "exact", head: true })
      .eq("secondary_agente_id", agenteId),
  ]);
  if (customersRes.error) throw customersRes.error;
  if (casesRes.error) throw casesRes.error;
  return {
    customers: customersRes.count ?? 0,
    cases: casesRes.count ?? 0,
  };
}
