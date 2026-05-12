import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CaseConversionNivel,
  CaseEstado,
  CaseOperacionTipo,
  CasePrioridad,
  CaseResultadoCierre,
} from "@/lib/cases/cases";

type FolderRow = {
  id: string;
  workspace_id: string;
  parent_folder_id: string | null;
  nombre: string;
  created_at: string;
};

export type CaseRow = {
  id: string;
  folder_id: string;
  titulo: string;
  cliente: string | null;
  operacion_tipo: CaseOperacionTipo | null;
  operacion: string | null;
  material: string | null;
  maquina: string | null;
  marca_preferida: string | null;
  estado: CaseEstado;
  prioridad: CasePrioridad;
  conversion_nivel: CaseConversionNivel;
  siguiente_accion: string | null;
  resumen_ejecutivo: string | null;
  resultado_cierre: CaseResultadoCierre | null;
  requiere_rap: boolean;
  potencial_usd: number | null;
  created_by: string | null;
  secondary_agente_id: string | null;
  /** `users.id` de destinatarios activos de `case_shares` (merge en listados). */
  collaborator_user_ids?: string[];
  created_at: string;
};

export const CASE_COLUMNS =
  "id, folder_id, titulo, cliente, operacion_tipo, operacion, material, maquina, marca_preferida, estado, prioridad, conversion_nivel, siguiente_accion, resumen_ejecutivo, resultado_cierre, requiere_rap, potencial_usd, created_by, secondary_agente_id, created_at";

export async function listFolders(supabase: SupabaseClient, workspaceId: string) {
  const { data, error } = await supabase
    .from("folders")
    .select("id, workspace_id, parent_folder_id, nombre, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true })
    .returns<FolderRow[]>();

  if (error) throw error;
  return data;
}

export async function createFolder(
  supabase: SupabaseClient,
  workspaceId: string,
  nombre: string,
  parentFolderId?: string | null,
) {
  const { data, error } = await supabase
    .from("folders")
    .insert({
      workspace_id: workspaceId,
      parent_folder_id: parentFolderId ?? null,
      nombre,
    })
    .select("id, workspace_id, parent_folder_id, nombre, created_at")
    .single<FolderRow>();

  if (error) throw error;
  return data;
}

export async function deleteFolder(supabase: SupabaseClient, folderId: string) {
  const { error } = await supabase.from("folders").delete().eq("id", folderId);
  if (error) throw error;
}

// Folder interno asociado a un cliente. La UX no muestra folders, pero
// la BD los mantiene como organización técnica (cases.folder_id NOT NULL).
// Este helper garantiza que cada cliente tenga su folder único, nombrado
// igual que el cliente.
export async function ensureFolderForCustomer(
  supabase: SupabaseClient,
  workspaceId: string,
  customerLabel: string,
): Promise<string> {
  const trimmed = customerLabel.trim();
  if (!trimmed) {
    throw new Error("customerLabel requerido para resolver folder.");
  }

  const { data: existing, error: selectError } = await supabase
    .from("folders")
    .select("id")
    .eq("workspace_id", workspaceId)
    .ilike("nombre", trimmed)
    .maybeSingle<{ id: string }>();

  if (selectError) throw selectError;
  if (existing?.id) return existing.id;

  const { data: created, error: insertError } = await supabase
    .from("folders")
    .insert({ workspace_id: workspaceId, nombre: trimmed })
    .select("id")
    .single<{ id: string }>();

  if (insertError) throw insertError;
  return created.id;
}

async function mergeCaseShareCollaboratorUserIds(
  supabase: SupabaseClient,
  rows: CaseRow[] | null,
): Promise<CaseRow[]> {
  if (!rows?.length) return rows ?? [];
  const ids = rows.map((r) => r.id);
  const { data: shareRows, error } = await supabase
    .from("case_shares")
    .select("case_id, shared_with_member_id")
    .in("case_id", ids)
    .is("revoked_at", null);
  if (error) throw error;
  const memberIds = [
    ...new Set(
      (shareRows ?? [])
        .map((r) => r.shared_with_member_id)
        .filter((id): id is string => id != null && id !== ""),
    ),
  ];
  const userByMember = new Map<string, string>();
  if (memberIds.length) {
    const { data: members, error: mErr } = await supabase
      .from("workspace_members")
      .select("id, user_id")
      .in("id", memberIds)
      .not("user_id", "is", null);
    if (mErr) throw mErr;
    for (const m of members ?? []) {
      if (m.user_id) userByMember.set(m.id, m.user_id as string);
    }
  }
  const byCase = new Map<string, string[]>();
  for (const row of shareRows ?? []) {
    if (!row.shared_with_member_id) continue;
    const uid = userByMember.get(row.shared_with_member_id);
    if (!uid) continue;
    const list = byCase.get(row.case_id) ?? [];
    list.push(uid);
    byCase.set(row.case_id, list);
  }
  return rows.map((r) => ({
    ...r,
    collaborator_user_ids: [...new Set(byCase.get(r.id) ?? [])],
  }));
}

// Lista cases visibles al usuario (RLS filtra al workspace) con filtro
// opcional por cliente. Si customerLabel = null devuelve todos.
// Si customerLabel = "" matchea casos con cliente IS NULL (pseudo
// "Sin cliente").
export async function listCasesByCustomer(
  supabase: SupabaseClient,
  customerLabel: string | null,
) {
  let query = supabase
    .from("cases")
    .select(CASE_COLUMNS)
    .order("created_at", { ascending: false });

  if (customerLabel === "") {
    query = query.is("cliente", null);
  } else if (customerLabel !== null) {
    query = query.ilike("cliente", customerLabel);
  }

  const { data, error } = await query.returns<CaseRow[]>();
  if (error) throw error;
  return mergeCaseShareCollaboratorUserIds(supabase, data ?? []);
}

// Legacy: lista por folder. Ya casi no se usa desde la UX customer-first
// pero queda disponible para casos edge (admin, debugging, migración).
export async function listCases(supabase: SupabaseClient, folderId: string) {
  const { data, error } = await supabase
    .from("cases")
    .select(CASE_COLUMNS)
    .eq("folder_id", folderId)
    .order("created_at", { ascending: false })
    .returns<CaseRow[]>();

  if (error) throw error;
  return mergeCaseShareCollaboratorUserIds(supabase, data ?? []);
}

export type CreateCaseInput = {
  titulo: string;
  cliente: string;
  marcaPreferida: string;
  operacionTipo?: CaseOperacionTipo;
  operacion?: string;
  material?: string;
  maquina?: string;
  prioridad?: CasePrioridad;
  conversionNivel?: CaseConversionNivel;
};

// Crea un caso asociado a un cliente. La UX customer-first invoca este
// helper desde dentro del detalle de un cliente, así que cliente es
// requerido. El folder_id se deriva internamente del cliente
// (1 folder por cliente, auto-creado si no existe).
export async function createCase(
  supabase: SupabaseClient,
  workspaceId: string,
  input: CreateCaseInput,
) {
  const cliente = input.cliente.trim();
  if (!cliente) {
    throw new Error(
      "Falta el cliente. Crea el caso desde el detalle de un cliente.",
    );
  }

  const marca = input.marcaPreferida.trim();
  if (!marca) {
    throw new Error(
      "Falta el fabricante. Cada caso debe tener una marca asignada.",
    );
  }

  const folderId = await ensureFolderForCustomer(
    supabase,
    workspaceId,
    cliente,
  );

  const { data, error } = await supabase
    .from("cases")
    .insert({
      folder_id: folderId,
      titulo: input.titulo,
      cliente,
      operacion_tipo: input.operacionTipo ?? null,
      operacion: input.operacion || null,
      material: input.material || null,
      maquina: input.maquina || null,
      marca_preferida: marca,
      estado: "abierto",
      prioridad: input.prioridad ?? "media",
      conversion_nivel: input.conversionNivel ?? "media",
      secondary_agente_id: null,
    })
    .select(CASE_COLUMNS)
    .single<CaseRow>();

  if (error) throw error;
  return data;
}

export type UpdateCasePatch = Partial<{
  estado: CaseEstado;
  prioridad: CasePrioridad;
  conversion_nivel: CaseConversionNivel;
  operacion_tipo: CaseOperacionTipo | null;
  operacion: string | null;
  marca_preferida: string;
  siguiente_accion: string | null;
  resumen_ejecutivo: string | null;
  resultado_cierre: CaseResultadoCierre | null;
  requiere_rap: boolean;
  potencial_usd: number | null;
  secondary_agente_id: string | null;
}>;

export async function updateCase(
  supabase: SupabaseClient,
  caseId: string,
  patch: UpdateCasePatch,
) {
  const { data, error } = await supabase
    .from("cases")
    .update(patch)
    .eq("id", caseId)
    .select(CASE_COLUMNS)
    .single<CaseRow>();

  if (error) throw error;
  return data;
}

export async function deleteCase(supabase: SupabaseClient, caseId: string) {
  const { error } = await supabase.from("cases").delete().eq("id", caseId);
  if (error) throw error;
}
