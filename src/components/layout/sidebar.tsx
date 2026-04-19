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

  const asideWidth = collapsed ? "w-16" : "w-64";
  const isDark = theme === "dark";

  return (
    <>
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col gap-5 border-r bg-white/90 p-4 shadow-sm transition-[width] duration-200 lg:flex dark:border-slate-800/80 dark:bg-slate-900/60 dark:shadow-none dark:backdrop-blur ${asideWidth}`}
      >
        <div
          className={`flex items-center gap-2 ${collapsed ? "justify-center" : "justify-between"}`}
        >
          {!collapsed ? (
            <div className="min-w-0">
              <span className="inline-flex items-center rounded-full border border-cyan-500/30 bg-cyan-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-cyan-700 dark:border-cyan-400/30 dark:bg-cyan-400/10 dark:text-cyan-200">
                Agente SDM
              </span>
              <h1 className="mt-1.5 text-base font-semibold tracking-tight text-slate-900 dark:text-white">
                Tools
              </h1>
            </div>
          ) : null}
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expandir menú" : "Minimizar menú"}
            title={collapsed ? "Expandir menú" : "Minimizar menú"}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-sm text-slate-600 transition hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-800 dark:text-slate-300 dark:hover:border-emerald-400/60 dark:hover:bg-emerald-400/10 dark:hover:text-emerald-200"
          >
            {collapsed ? "»" : "«"}
          </button>
        </div>

        <nav className="flex flex-col gap-1">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            const base =
              "rounded-xl text-sm transition flex items-center border";
            const state = active
              ? "border-emerald-500/30 bg-emerald-50 text-emerald-800 shadow-[inset_3px_0_0_0_rgb(5_150_105)] dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-100 dark:shadow-[inset_3px_0_0_0_rgb(52_211_153)]"
              : "border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-100 dark:text-slate-300 dark:hover:border-slate-800 dark:hover:bg-slate-900/80";
            const size = collapsed
              ? "h-10 w-full justify-center px-0"
              : "px-3 py-2 pl-4";
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`${base} ${state} ${size}`}
              >
                {collapsed ? (
                  <span className="text-xs font-semibold tracking-wider">
                    {item.short}
                  </span>
                ) : (
                  <span className="font-medium">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto grid gap-2 border-t border-slate-200 pt-4 dark:border-slate-800/70">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={
              isDark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"
            }
            title={isDark ? "Tema claro" : "Tema oscuro"}
            className={`flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:border-emerald-400/60 dark:hover:bg-emerald-400/10 dark:hover:text-emerald-200 ${collapsed ? "justify-center" : ""}`}
          >
            <span aria-hidden className="text-base">
              {isDark ? "☀" : "☾"}
            </span>
            {!collapsed ? (
              <span className="font-medium">
                {isDark ? "Tema claro" : "Tema oscuro"}
              </span>
            ) : null}
          </button>

          {!collapsed ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800/80 dark:bg-slate-950/60">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                Sesión
              </p>
              <p className="mt-1 truncate text-sm font-medium text-slate-900 dark:text-white">
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
            className={`rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:border-rose-500 hover:bg-rose-50 hover:text-rose-700 dark:border-slate-800 dark:text-slate-300 dark:hover:border-rose-400/60 dark:hover:bg-rose-500/10 dark:hover:text-rose-200 ${collapsed ? "flex items-center justify-center" : ""}`}
          >
            {collapsed ? <span aria-hidden>⎋</span> : "Cerrar sesión"}
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden dark:border-slate-800/80 dark:bg-slate-900/70">
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center rounded-full border border-cyan-500/30 bg-cyan-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.25em] text-cyan-700 dark:border-cyan-400/30 dark:bg-cyan-400/10 dark:text-cyan-200">
            Agente SDM
          </span>
          <p className="mt-0.5 truncate text-sm font-medium text-slate-900 dark:text-white">
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

      <nav className="sticky top-[3.25rem] z-10 flex gap-1 overflow-x-auto border-b border-slate-200 bg-white/80 px-3 py-2 lg:hidden dark:border-slate-800/80 dark:bg-slate-900/60">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-medium transition ${
                active
                  ? "border-emerald-500/40 bg-emerald-50 text-emerald-800 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-200"
                  : "border-transparent text-slate-700 hover:border-slate-200 dark:text-slate-300 dark:hover:border-slate-800"
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
