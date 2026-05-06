import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  TaskEstado,
  TaskPrioridad,
  WorkspaceTaskRow,
  WorkspaceTaskWithRelations,
} from "@/lib/tasks/types";
import { TASK_ATTACHMENT_BUCKET } from "@/lib/tasks/task-attachments-db";

const TASK_COLUMNS = `
  id,
  workspace_id,
  title,
  description,
  estado,
  prioridad,
  assigned_to_user_id,
  created_by_user_id,
  customer_id,
  case_id,
  promoted_at,
  vence_el,
  proximo_seguimiento_at,
  metadata,
  created_at,
  updated_at
`;

const TASK_WITH_RELATIONS = `
  ${TASK_COLUMNS.trim()},
  assignee:users!workspace_tasks_assigned_to_user_id_fkey(id, nombre, apellido, email),
  creator:users!workspace_tasks_created_by_user_id_fkey(id, nombre, apellido, email),
  customer:customers(id, label),
  case:cases(id, marca_preferida)
`;

export async function listWorkspaceTasks(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<WorkspaceTaskWithRelations[]> {
  const { data, error } = await supabase
    .from("workspace_tasks")
    .select(TASK_WITH_RELATIONS)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .returns<WorkspaceTaskWithRelations[]>();
  if (error) throw error;
  return data ?? [];
}

export async function getWorkspaceTask(
  supabase: SupabaseClient,
  taskId: string,
): Promise<WorkspaceTaskWithRelations | null> {
  const { data, error } = await supabase
    .from("workspace_tasks")
    .select(TASK_WITH_RELATIONS)
    .eq("id", taskId)
    .maybeSingle<WorkspaceTaskWithRelations>();
  if (error) throw error;
  return data;
}

export type CreateTaskInput = {
  workspaceId: string;
  title: string;
  description?: string | null;
  estado?: TaskEstado;
  prioridad?: TaskPrioridad;
  assignedToUserId: string;
  createdByUserId: string;
  customerId?: string | null;
  caseId?: string | null;
  venceEl?: string | null;
  proximoSeguimientoAt: string;
};

export async function createWorkspaceTask(
  supabase: SupabaseClient,
  input: CreateTaskInput,
): Promise<WorkspaceTaskRow> {
  const { data, error } = await supabase
    .from("workspace_tasks")
    .insert({
      workspace_id: input.workspaceId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      estado: input.estado ?? "pendiente",
      prioridad: input.prioridad ?? "media",
      assigned_to_user_id: input.assignedToUserId,
      created_by_user_id: input.createdByUserId,
      customer_id: input.customerId ?? null,
      case_id: input.caseId ?? null,
      vence_el: input.venceEl ?? null,
      proximo_seguimiento_at: input.proximoSeguimientoAt,
    })
    .select(TASK_COLUMNS)
    .single<WorkspaceTaskRow>();
  if (error) throw error;
  return data;
}

export type UpdateTaskInput = {
  title?: string;
  description?: string | null;
  estado?: TaskEstado;
  prioridad?: TaskPrioridad;
  assignedToUserId?: string;
  customerId?: string | null;
  caseId?: string | null;
  venceEl?: string | null;
  proximoSeguimientoAt?: string;
};

export async function updateWorkspaceTask(
  supabase: SupabaseClient,
  taskId: string,
  patch: UpdateTaskInput,
): Promise<WorkspaceTaskRow> {
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row.title = patch.title.trim();
  if (patch.description !== undefined)
    row.description = patch.description?.trim() || null;
  if (patch.estado !== undefined) row.estado = patch.estado;
  if (patch.prioridad !== undefined) row.prioridad = patch.prioridad;
  if (patch.assignedToUserId !== undefined)
    row.assigned_to_user_id = patch.assignedToUserId;
  if (patch.customerId !== undefined) row.customer_id = patch.customerId;
  if (patch.caseId !== undefined) row.case_id = patch.caseId;
  if (patch.venceEl !== undefined) row.vence_el = patch.venceEl;
  if (patch.proximoSeguimientoAt !== undefined)
    row.proximo_seguimiento_at = patch.proximoSeguimientoAt;

  const { data, error } = await supabase
    .from("workspace_tasks")
    .update(row)
    .eq("id", taskId)
    .select(TASK_COLUMNS)
    .single<WorkspaceTaskRow>();
  if (error) throw error;
  return data;
}

export async function deleteWorkspaceTask(
  supabase: SupabaseClient,
  taskId: string,
): Promise<void> {
  const { data: paths, error: listErr } = await supabase
    .from("task_attachments")
    .select("storage_path")
    .eq("task_id", taskId)
    .returns<{ storage_path: string }[]>();
  if (listErr) throw listErr;
  const toRemove = (paths ?? []).map((p) => p.storage_path).filter(Boolean);
  if (toRemove.length > 0) {
    const { error: rmErr } = await supabase.storage
      .from(TASK_ATTACHMENT_BUCKET)
      .remove(toRemove);
    if (rmErr) throw rmErr;
  }
  const { error } = await supabase.from("workspace_tasks").delete().eq("id", taskId);
  if (error) throw error;
}
