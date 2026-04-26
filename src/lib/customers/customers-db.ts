import type { SupabaseClient } from "@supabase/supabase-js";
import type { MexicoState } from "@/lib/locations/mexico-states";

export type CustomerEstatus = "activo" | "prospecto" | "inactivo" | "pausado";

export type CustomerRow = {
  id: string;
  workspace_id: string;
  label: string;
  estado: MexicoState | null;
  ciudad: string | null;
  segmento: string | null;
  estatus: CustomerEstatus;
  notas: string | null;
  potencial_mensual_usd: number | null;
  created_by: string | null;
  secondary_agente_id: string | null;
  created_at: string;
};

const CUSTOMER_COLUMNS =
  "id, workspace_id, label, estado, ciudad, segmento, estatus, notas, potencial_mensual_usd, created_by, secondary_agente_id, created_at";

export async function listCustomers(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<CustomerRow[]> {
  const { data, error } = await supabase
    .from("customers")
    .select(CUSTOMER_COLUMNS)
    .eq("workspace_id", workspaceId)
    .order("label", { ascending: true })
    .returns<CustomerRow[]>();
  if (error) throw error;
  return data ?? [];
}

export async function getCustomerById(
  supabase: SupabaseClient,
  id: string,
): Promise<CustomerRow | null> {
  const { data, error } = await supabase
    .from("customers")
    .select(CUSTOMER_COLUMNS)
    .eq("id", id)
    .maybeSingle<CustomerRow>();
  if (error) throw error;
  return data;
}

export type CreateCustomerInput = {
  label: string;
  estado?: MexicoState | null;
  ciudad?: string | null;
  segmento?: string | null;
  estatus?: CustomerEstatus;
  notas?: string | null;
  potencialMensualUsd?: number | null;
  secondaryAgenteId?: string | null;
};

export async function createCustomer(
  supabase: SupabaseClient,
  workspaceId: string,
  input: CreateCustomerInput,
): Promise<CustomerRow> {
  const { data, error } = await supabase
    .from("customers")
    .insert({
      workspace_id: workspaceId,
      label: input.label.trim(),
      estado: input.estado ?? null,
      ciudad: input.ciudad?.trim() || null,
      segmento: input.segmento?.trim() || null,
      estatus: input.estatus ?? "activo",
      notas: input.notas?.trim() || null,
      potencial_mensual_usd: input.potencialMensualUsd ?? null,
      secondary_agente_id: input.secondaryAgenteId ?? null,
    })
    .select(CUSTOMER_COLUMNS)
    .single<CustomerRow>();
  if (error) throw error;
  return data;
}

// Auto-add idempotente para cuando un flujo válido (createCase, etc.)
// menciona un cliente nuevo. Si ya existe un cliente con ese label
// case-insensitive en el workspace, no hace nada y devuelve la fila
// existente. Si no existe, lo crea con campos mínimos.
export async function ensureCustomer(
  supabase: SupabaseClient,
  workspaceId: string,
  label: string,
): Promise<CustomerRow | null> {
  const trimmed = label.trim();
  if (!trimmed) return null;

  // Intento de INSERT. Si choca el unique index (workspace_id,
  // lower(label)), Supabase devuelve error 23505; capturamos y
  // resolvemos con SELECT. ON CONFLICT DO NOTHING vía PostgREST
  // requiere upsert, pero queremos devolver la fila siempre, así que
  // hacemos try-insert / fallback-select.
  const insertRes = await supabase
    .from("customers")
    .insert({
      workspace_id: workspaceId,
      label: trimmed,
      estatus: "activo",
    })
    .select(CUSTOMER_COLUMNS)
    .single<CustomerRow>();

  if (!insertRes.error) return insertRes.data;

  // 23505 = unique violation. Cualquier otro error lo propagamos.
  if (insertRes.error.code !== "23505") throw insertRes.error;

  const { data, error } = await supabase
    .from("customers")
    .select(CUSTOMER_COLUMNS)
    .eq("workspace_id", workspaceId)
    .ilike("label", trimmed)
    .maybeSingle<CustomerRow>();
  if (error) throw error;
  return data;
}

export type UpdateCustomerPatch = Partial<{
  label: string;
  estado: MexicoState | null;
  ciudad: string | null;
  segmento: string | null;
  estatus: CustomerEstatus;
  notas: string | null;
  potencial_mensual_usd: number | null;
  secondary_agente_id: string | null;
}>;

export async function updateCustomer(
  supabase: SupabaseClient,
  id: string,
  patch: UpdateCustomerPatch,
): Promise<CustomerRow> {
  const { data, error } = await supabase
    .from("customers")
    .update(patch)
    .eq("id", id)
    .select(CUSTOMER_COLUMNS)
    .single<CustomerRow>();
  if (error) throw error;
  return data;
}

export async function deleteCustomer(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) throw error;
}

// Cuenta casos del workspace que apuntan a este label (cases.cliente).
// Se usa para BLOQUEAR el delete si > 0.
export async function countCasesForCustomerLabel(
  supabase: SupabaseClient,
  workspaceId: string,
  label: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("cases")
    .select("id, folder:folders!inner(workspace_id)", {
      count: "exact",
      head: true,
    })
    .eq("cliente", label)
    .eq("folder.workspace_id", workspaceId);
  if (error) throw error;
  return count ?? 0;
}
