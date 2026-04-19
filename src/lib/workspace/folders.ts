import type { SupabaseClient } from "@supabase/supabase-js";

type FolderRow = {
  id: string;
  workspace_id: string;
  parent_folder_id: string | null;
  nombre: string;
  created_at: string;
};

type CaseRow = {
  id: string;
  folder_id: string;
  titulo: string;
  cliente: string | null;
  operacion: string | null;
  material: string | null;
  maquina: string | null;
  marca_preferida: string | null;
  estado: string;
  created_at: string;
};

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
    .select(
      "id, folder_id, titulo, cliente, operacion, material, maquina, marca_preferida, estado, created_at",
    )
    .eq("folder_id", folderId)
    .order("created_at", { ascending: false })
    .returns<CaseRow[]>();

  if (error) throw error;
  return data;
}

export async function createCase(
  supabase: SupabaseClient,
  folderId: string,
  titulo: string,
  cliente?: string,
  operacion?: string,
  material?: string,
  maquina?: string,
  marcaPreferida?: string,
) {
  const { data, error } = await supabase
    .from("cases")
    .insert({
      folder_id: folderId,
      titulo,
      cliente: cliente || null,
      operacion: operacion || null,
      material: material || null,
      maquina: maquina || null,
      marca_preferida: marcaPreferida || null,
      estado: "abierto",
    })
    .select(
      "id, folder_id, titulo, cliente, operacion, material, maquina, marca_preferida, estado, created_at",
    )
    .single<CaseRow>();

  if (error) throw error;
  return data;
}

export async function deleteCase(supabase: SupabaseClient, caseId: string) {
  const { error } = await supabase.from("cases").delete().eq("id", caseId);
  if (error) throw error;
}
