"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { ensureWorkspaceForUser } from "@/lib/workspace/bootstrap";
import {
  WorkspaceProvider,
  type WorkspaceContextValue,
} from "@/lib/workspace/context";
import { Sidebar } from "./sidebar";

type AppShellState =
  | { status: "loading" }
  | { status: "unauth" }
  | { status: "ready"; value: WorkspaceContextValue };

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AppShellState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    const supabase = getSupabaseBrowserClient();

    (async () => {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (cancelled) return;

      if (sessionError || !sessionData.session) {
        setState({ status: "unauth" });
        router.replace("/");
        return;
      }

      try {
        const { appUser, workspace } = await ensureWorkspaceForUser(
          supabase,
          sessionData.session.user,
        );
        if (cancelled) return;

        setState({
          status: "ready",
          value: {
            appUser: {
              id: appUser.id,
              nombre: appUser.nombre,
              apellido: appUser.apellido,
              email: appUser.email,
              rol: appUser.rol,
            },
            workspaceId: workspace.id,
          },
        });
      } catch (error) {
        if (cancelled) return;
        console.error("Falló preparación de workspace", error);
        setState({ status: "unauth" });
        router.replace("/?auth=workspace-error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (state.status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-400">
        Cargando sesión…
      </div>
    );
  }

  if (state.status === "unauth") {
    return null;
  }

  const { appUser } = state.value;
  const displayName =
    [appUser.nombre, appUser.apellido].filter(Boolean).join(" ").trim() ||
    appUser.email;

  return (
    <WorkspaceProvider value={state.value}>
      <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100 lg:flex-row">
        <Sidebar userName={displayName} email={appUser.email} />
        <main className="flex min-w-0 flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </WorkspaceProvider>
  );
}
