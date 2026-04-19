"use client";

import { createContext, useContext, type ReactNode } from "react";

export type AppUser = {
  id: string;
  nombre: string;
  apellido: string | null;
  email: string;
  rol: "admin" | "user";
};

export type WorkspaceContextValue = {
  appUser: AppUser;
  workspaceId: string;
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
