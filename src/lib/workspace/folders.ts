import type { SupabaseClient } from "@supabase/supabase-js";
import type { CaseEstado, CasePrioridad } from "@/lib/cases/cases";

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
  operacion: string | null;
  material: string | null;
  maquina: string | null;
  marca_preferida: string | null;
  estado: CaseEstado;
  prioridad: CasePrioridad;
  siguiente_accion: string | null;
  resumen_ejecutivo: string | null;
  created_at: string;
};

const CASE_COLUMNS =
  "id, folder_id, titulo, cliente, operacion, material, maquina, marca_preferida, estado, prioridad, siguiente_accion, resumen_ejecutivo, created_at";

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

export async function listCases(supabase: SupabaseClient, folderId: string) {
  const { data, error } = await supabase
    .from("cases")
    .select(CASE_COLUMNS)
    .eq("folder_id", folderId)
    .order("created_at", { ascending: false })
    .returns<CaseRow[]>();

  if (error) throw error;
  return data;
}

export type CreateCaseInput = {
  titulo: string;
  cliente?: string;
  operacion?: string;
  material?: string;
  maquina?: string;
  marcaPreferida?: string;
  prioridad?: CasePrioridad;
};

export async function createCase(
  supabase: SupabaseClient,
  folderId: string,
  input: CreateCaseInput,
) {
  const { data, error } = await supabase
    .from("cases")
    .insert({
      folder_id: folderId,
      titulo: input.titulo,
      cliente: input.cliente || null,
      operacion: input.operacion || null,
      material: input.material || null,
      maquina: input.maquina || null,
      marca_preferida: input.marcaPreferida || null,
      estado: "abierto",
      prioridad: input.prioridad ?? "media",
    })
    .select(CASE_COLUMNS)
    .single<CaseRow>();

  if (error) throw error;
  return data;
}

export type UpdateCasePatch = Partial<{
  estado: CaseEstado;
  prioridad: CasePrioridad;
  siguiente_accion: string | null;
  resumen_ejecutivo: string | null;
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
