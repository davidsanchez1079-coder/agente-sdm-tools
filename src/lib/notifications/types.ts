export type NotificationKind =
  | "task_assigned"
  | "task_reassigned"
  | "task_note_added"
  | "task_completed";

export type NotificationEntityType = "task";

export type NotificationRow = {
  id: string;
  workspace_id: string;
  recipient_user_id: string;
  actor_user_id: string | null;
  kind: NotificationKind;
  entity_type: NotificationEntityType;
  entity_id: string;
  title: string;
  body: string | null;
  href: string;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

