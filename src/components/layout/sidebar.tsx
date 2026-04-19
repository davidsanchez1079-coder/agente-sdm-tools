"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/app", label: "Dashboard", short: "DB" },
  { href: "/app/usuario", label: "Usuario", short: "Us" },
  { href: "/app/customers", label: "Cliente", short: "Cl" },
  { href: "/app/caso", label: "Caso", short: "Cs" },
  { href: "/app/brands", label: "Fabricante/Marca", short: "Fa" },
] as const;

type SidebarProps = {
  userName: string;
  email: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
};

function isActive(pathname: string, href: string) {
  if (href === "/app") return pathname === "/app";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({
  userName,
  email,
  collapsed,
  onToggleCollapsed,
  theme,
  onToggleTheme,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/");
  }

  const asideWidth = collapsed ? "w-16" : "w-60";
  const isDark = theme === "dark";

  return (
    <>
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col gap-5 border-r border-slate-200 bg-white/90 p-4 transition-[width] duration-200 lg:flex dark:border-slate-800 dark:bg-slate-950/80 ${asideWidth}`}
      >
        <div
          className={`flex items-center gap-2 ${collapsed ? "justify-center" : "justify-between"}`}
        >
          {!collapsed ? (
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.3em] text-cyan-600 dark:text-cyan-300">
                Agente SDM
              </p>
              <h1 className="mt-0.5 text-base font-semibold text-slate-900 dark:text-white">
                Tools
              </h1>
            </div>
          ) : null}
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expandir menú" : "Minimizar menú"}
            title={collapsed ? "Expandir menú" : "Minimizar menú"}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-sm text-slate-600 transition hover:border-emerald-500 hover:text-emerald-600 dark:border-slate-800 dark:text-slate-300 dark:hover:border-emerald-400 dark:hover:text-emerald-300"
          >
            {collapsed ? "»" : "«"}
          </button>
        </div>

        <nav className="flex flex-col gap-1">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            const baseClass =
              "rounded-xl border text-sm transition flex items-center";
            const stateClass = active
              ? "border-emerald-500/40 bg-emerald-50 text-emerald-800 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-200"
              : "border-transparent text-slate-700 hover:border-slate-300 hover:bg-slate-100 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-900";
            const sizeClass = collapsed
              ? "justify-center h-10 w-full px-0"
              : "px-3 py-2";
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`${baseClass} ${stateClass} ${sizeClass}`}
              >
                {collapsed ? (
                  <span className="text-xs font-semibold tracking-wider">
                    {item.short}
                  </span>
                ) : (
                  item.label
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto grid gap-2">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={
              isDark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"
            }
            title={isDark ? "Tema claro" : "Tema oscuro"}
            className={`flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:border-emerald-500 hover:text-emerald-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:border-emerald-400 dark:hover:text-emerald-300 ${collapsed ? "justify-center" : ""}`}
          >
            <span aria-hidden>{isDark ? "☀" : "☾"}</span>
            {!collapsed ? (
              <span>{isDark ? "Tema claro" : "Tema oscuro"}</span>
            ) : null}
          </button>

          {!collapsed ? (
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900/70">
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Sesión
              </p>
              <p className="mt-1 truncate text-sm text-slate-900 dark:text-white">
                {userName}
              </p>
              <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                {email}
              </p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => void handleLogout()}
            title="Cerrar sesión"
            className={`rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:border-rose-500 hover:text-rose-600 dark:border-slate-800 dark:text-slate-200 dark:hover:border-rose-400 dark:hover:text-rose-300 ${collapsed ? "flex items-center justify-center" : ""}`}
          >
            {collapsed ? <span aria-hidden>⎋</span> : "Cerrar sesión"}
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-950/90">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-cyan-600 dark:text-cyan-300">
            Agente SDM
          </p>
          <p className="truncate text-sm text-slate-900 dark:text-white">
            {userName}
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label="Cambiar tema"
          className="shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700 dark:border-slate-800 dark:text-slate-200"
        >
          {isDark ? "☀" : "☾"}
        </button>
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700 dark:border-slate-800 dark:text-slate-200"
        >
          Salir
        </button>
      </header>

      <nav className="sticky top-[3.25rem] z-10 flex gap-1 overflow-x-auto border-b border-slate-200 bg-white/80 px-3 py-2 lg:hidden dark:border-slate-800 dark:bg-slate-950/80">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 rounded-xl border px-3 py-2 text-xs transition ${
                active
                  ? "border-emerald-500/40 bg-emerald-50 text-emerald-800 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-200"
                  : "border-transparent text-slate-700 hover:border-slate-300 dark:text-slate-300 dark:hover:border-slate-700"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
