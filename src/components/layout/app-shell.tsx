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

type Theme = "light" | "dark";

const THEME_KEY = "sdm-theme";
const COLLAPSED_KEY = "sdm-sidebar-collapsed";

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AppShellState>({ status: "loading" });
  const [theme, setTheme] = useState<Theme>("dark");
  const [collapsed, setCollapsed] = useState(false);

  // Sesión + workspace
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
        const { appUser, workspace, workspaceRol } = await ensureWorkspaceForUser(
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
            workspaceRol,
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

  // Hidrata preferencias del usuario (tema + sidebar).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const storedTheme = localStorage.getItem(THEME_KEY);
        const storedCollapsed = localStorage.getItem(COLLAPSED_KEY);
        if (cancelled) return;
        if (storedTheme === "light" || storedTheme === "dark") {
          setTheme(storedTheme);
        }
        if (storedCollapsed === "1") {
          setCollapsed(true);
        }
      } catch {
        // localStorage bloqueado: nos quedamos con defaults.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Aplica tema al <html> y persiste.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const html = document.documentElement;
    if (theme === "dark") html.classList.add("dark");
    else html.classList.remove("dark");
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // noop
    }
  }, [theme]);

  // Persiste minimización del sidebar.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
    } catch {
      // noop
    }
  }, [collapsed]);

  if (state.status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-slate-500 dark:text-slate-400">
        Cargando sesión…
      </div>
    );
  }

  if (state.status === "unauth") {
    return null;
  }

  const { appUser, workspaceRol, workspaceId } = state.value;
  const displayName =
    [appUser.nombre, appUser.apellido].filter(Boolean).join(" ").trim() ||
    appUser.email;

  const debugBadgeColor =
    workspaceRol === "externo"
      ? "bg-amber-500"
      : workspaceRol === "interno"
        ? "bg-cyan-500"
        : "bg-rose-500";

  return (
    <WorkspaceProvider value={state.value}>
      <div className="flex min-h-screen flex-col bg-background text-foreground lg:flex-row">
        <Sidebar
          userName={displayName}
          email={appUser.email}
          workspaceRol={workspaceRol}
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((value) => !value)}
          theme={theme}
          onToggleTheme={() =>
            setTheme((value) => (value === "dark" ? "light" : "dark"))
          }
        />
        <main className="flex min-w-0 flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">
          {children}
        </main>
        <div
          className={`fixed bottom-3 right-3 z-50 rounded-lg px-3 py-2 font-mono text-[10px] font-semibold text-white shadow-lg ${debugBadgeColor}`}
          style={{ pointerEvents: "none" }}
        >
          rol={workspaceRol} · ws={workspaceId.slice(0, 8)} · me={appUser.id.slice(0, 8)}
        </div>
      </div>
    </WorkspaceProvider>
  );
}
