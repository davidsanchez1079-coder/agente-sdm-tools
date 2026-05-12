import type { SupabaseClient } from "@supabase/supabase-js";

export type WorkspaceTaskEstado =
  | "pendiente"
  | "en_curso"
  | "hecha"
  | "cancelada";

export type WorkspaceTaskPrioridad = "baja" | "normal" | "alta" | "urgente";

export type WorkspaceTaskRow = {
  id: string;
  workspace_id: string;
  customer_id: string | null;
  titulo: string;
  descripcion: string | null;
  estado: WorkspaceTaskEstado;
  prioridad: WorkspaceTaskPrioridad;
  assigned_to_user_id: string | null;
  created_by_user_id: string;
  vence_el: string | null;
  proximo_seguimiento: string | null;
  proximo_seguimiento_at: string | null;
  deleted_at?: string | null;
  deleted_by_user_id?: string | null;
  created_at: string;
  updated_at: string;
};

const WORKSPACE_TASK_COLUMNS =
  "id, workspace_id, customer_id, titulo, descripcion, estado, prioridad, assigned_to_user_id, created_by_user_id, vence_el, proximo_seguimiento, proximo_seguimiento_at, deleted_at, deleted_by_user_id, created_at, updated_at";

export async function listWorkspaceTasks(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<WorkspaceTaskRow[]> {
  const { data, error } = await supabase
    .from("workspace_tasks")
    .select(WORKSPACE_TASK_COLUMNS)
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .returns<WorkspaceTaskRow[]>();
  if (error) throw error;
  return data ?? [];
}

export async function listTrashedWorkspaceTasks(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<WorkspaceTaskRow[]> {
  const { data, error } = await supabase
    .from("workspace_tasks")
    .select(WORKSPACE_TASK_COLUMNS)
    .eq("workspace_id", workspaceId)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false })
    .returns<WorkspaceTaskRow[]>();
  if (error) throw error;
  return data ?? [];
}

export async function getWorkspaceTaskById(
  supabase: SupabaseClient,
  workspaceId: string,
  taskId: string,
): Promise<WorkspaceTaskRow | null> {
  const { data, error } = await supabase
    .from("workspace_tasks")
    .select(WORKSPACE_TASK_COLUMNS)
    .eq("workspace_id", workspaceId)
    .eq("id", taskId)
    .maybeSingle<WorkspaceTaskRow>();
  if (error) throw error;
  return data;
}

export type CreateWorkspaceTaskInput = {
  titulo: string;
  descripcion?: string | null;
  estado?: WorkspaceTaskEstado;
  prioridad?: WorkspaceTaskPrioridad;
  assigned_to_user_id?: string | null;
  proximo_seguimiento?: string | null;
  proximo_seguimiento_at?: string | null;
  vence_el?: string | null;
  customer_id?: string | null;
};

export async function createWorkspaceTask(
  supabase: SupabaseClient,
  workspaceId: string,
  input: CreateWorkspaceTaskInput,
): Promise<WorkspaceTaskRow> {
  const { data, error } = await supabase
    .from("workspace_tasks")
    .insert({
      workspace_id: workspaceId,
      customer_id: input.customer_id ?? null,
      titulo: input.titulo.trim(),
      descripcion: input.descripcion?.trim() || null,
      estado: input.estado ?? "pendiente",
      prioridad: input.prioridad ?? "normal",
      assigned_to_user_id: input.assigned_to_user_id ?? null,
      vence_el: input.vence_el ?? null,
      proximo_seguimiento: input.proximo_seguimiento?.trim() || null,
      proximo_seguimiento_at: input.proximo_seguimiento_at ?? null,
    })
    .select(WORKSPACE_TASK_COLUMNS)
    .single<WorkspaceTaskRow>();
  if (error) throw error;
  return data;
}

export type UpdateWorkspaceTaskPatch = Partial<{
  customer_id: string | null;
  titulo: string;
  descripcion: string | null;
  estado: WorkspaceTaskEstado;
  prioridad: WorkspaceTaskPrioridad;
  assigned_to_user_id: string | null;
  vence_el: string | null;
  proximo_seguimiento: string | null;
  proximo_seguimiento_at: string | null;
}>;

export async function updateWorkspaceTask(
  supabase: SupabaseClient,
  workspaceId: string,
  taskId: string,
  patch: UpdateWorkspaceTaskPatch,
): Promise<WorkspaceTaskRow> {
  const { data, error } = await supabase
    .from("workspace_tasks")
    .update(patch)
    .eq("workspace_id", workspaceId)
    .eq("id", taskId)
    .select(WORKSPACE_TASK_COLUMNS);
  if (error) throw error;
  const rows = data ?? [];
  if (rows.length === 0) {
    throw new Error(
      "No se pudo guardar la tarea: sin permiso o no se aplicó ningún cambio.",
    );
  }
  if (rows.length > 1) {
    throw new Error("Respuesta inesperada al actualizar la tarea.");
  }
  return rows[0] as WorkspaceTaskRow;
}

/** Sin `.select()`: evita RETURNING; útil si tras el cambio el actor ya no pasa la policy SELECT de la fila. */
export async function updateWorkspaceTaskSilently(
  supabase: SupabaseClient,
  workspaceId: string,
  taskId: string,
  patch: UpdateWorkspaceTaskPatch,
): Promise<void> {
  const { error } = await supabase
    .from("workspace_tasks")
    .update(patch)
    .eq("workspace_id", workspaceId)
    .eq("id", taskId);
  if (error) throw error;
}

export async function deleteWorkspaceTask(
  supabase: SupabaseClient,
  workspaceId: string,
  taskId: string,
): Promise<void> {
  // Soft-delete: manda a papelera (15 días).
  const { error } = await supabase.rpc("soft_delete_workspace_task", {
    workspace_id_input: workspaceId,
    task_id_input: taskId,
  });
  if (error) throw error;
}

export async function restoreWorkspaceTask(
  supabase: SupabaseClient,
  workspaceId: string,
  taskId: string,
): Promise<void> {
  const { error } = await supabase.rpc("restore_workspace_task", {
    workspace_id_input: workspaceId,
    task_id_input: taskId,
  });
  if (error) throw error;
}

export async function hardDeleteWorkspaceTask(
  supabase: SupabaseClient,
  workspaceId: string,
  taskId: string,
): Promise<void> {
  const { error } = await supabase
    .from("workspace_tasks")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("id", taskId);
  if (error) throw error;
}
