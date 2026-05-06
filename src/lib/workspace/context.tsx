"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { WorkspaceRol } from "@/lib/workspace/bootstrap";

export type AppUser = {
  id: string;
  /** Mismo valor que `auth.users.id` / `session.user.id` cuando la fila está bien enlazada. */
  authUserId: string;
  nombre: string;
  apellido: string | null;
  email: string;
  rol: "admin" | "user";
};

export type WorkspaceContextValue = {
  appUser: AppUser;
  workspaceId: string;
  workspaceRol: WorkspaceRol;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({
  value,
  children,
}: {
  value: WorkspaceContextValue;
  children: ReactNode;
}) {
  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace debe usarse dentro de WorkspaceProvider");
  }
  return ctx;
}

export function useIsExterno() {
  const { workspaceRol } = useWorkspace();
  return workspaceRol === "externo";
}

export function useCanManage() {
  const { workspaceRol } = useWorkspace();
  return workspaceRol === "gerente";
}
