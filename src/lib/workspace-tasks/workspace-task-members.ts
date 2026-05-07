import type { WorkspaceMemberRow } from "@/lib/permisos/permisos-db";

/** Miembros con cuenta vinculada y alta completada (no invitaciones pendientes). */
export function workspaceMembersAssignable(
  members: WorkspaceMemberRow[],
): WorkspaceMemberRow[] {
  return members.filter(
    (m) => m.activo && m.joined_at != null && m.user_id != null,
  );
}
