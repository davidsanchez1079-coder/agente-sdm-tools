export type TaskEstado =
  | "pendiente"
  | "en_proceso"
  | "completada"
  | "cerrada";

export type TaskPrioridad = "baja" | "media" | "alta" | "urgente";

export type TaskUserSnippet = {
  id: string;
  nombre: string;
  apellido: string | null;
  email: string;
};

export type WorkspaceTaskRow = {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  estado: TaskEstado;
  prioridad: TaskPrioridad;
  assigned_to_user_id: string;
  created_by_user_id: string;
  customer_id: string | null;
  case_id: string | null;
  promoted_at: string | null;
  vence_el: string | null;
  proximo_seguimiento_at: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type WorkspaceTaskWithRelations = WorkspaceTaskRow & {
  assignee?: TaskUserSnippet | null;
  creator?: TaskUserSnippet | null;
  customer?: { id: string; label: string } | null;
};

export type TaskCommentRow = {
  id: string;
  task_id: string;
  author_user_id: string;
  body: string;
  created_at: string;
};

export type TaskCommentWithAuthor = TaskCommentRow & {
  author?: TaskUserSnippet | null;
};

export type TaskSharePermission = "view" | "edit";

export type TaskShareRow = {
  id: string;
  task_id: string;
  shared_with_email: string;
  shared_with_member_id: string | null;
  shared_by: string | null;
  shared_at: string;
  revoked_at: string | null;
  permission: TaskSharePermission;
  link_token?: string | null;
};

export type TaskAttachmentKind = "image" | "pdf" | "other";

export type TaskAttachmentRow = {
  id: string;
  task_id: string;
  storage_path: string;
  filename: string;
  kind: TaskAttachmentKind;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_by_user_id: string;
  created_at: string;
};
