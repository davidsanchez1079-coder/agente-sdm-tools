"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/app", label: "Dashboard" },
  { href: "/app/usuario", label: "Usuario" },
  { href: "/app/cliente", label: "Cliente" },
  { href: "/app/caso", label: "Caso" },
  { href: "/app/marca", label: "Marca" },
] as const;

type SidebarProps = {
  userName: string;
  email: string;
};

function isActive(pathname: string, href: string) {
  if (href === "/app") return pathname === "/app";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ userName, email }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/");
  }

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-6 border-r border-slate-800 bg-slate-950/80 p-5 lg:flex">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-cyan-300">
            Agente SDM
          </p>
          <h1 className="mt-1 text-lg font-semibold text-white">Tools</h1>
        </div>

        <nav className="flex flex-col gap-1">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-xl border px-3 py-2 text-sm transition ${
                  active
                    ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
                    : "border-transparent text-slate-300 hover:border-slate-700 hover:bg-slate-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto grid gap-2">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">
              Sesión
            </p>
            <p className="mt-1 truncate text-sm text-white">{userName}</p>
            <p className="mt-0.5 truncate text-xs text-slate-400">{email}</p>
          </div>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:border-rose-400 hover:text-rose-300"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-800 bg-slate-950/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-cyan-300">
            Agente SDM
          </p>
          <p className="truncate text-sm text-white">{userName}</p>
        </div>
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="shrink-0 rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-200"
        >
          Salir
        </button>
      </header>

      <nav className="sticky top-[3.25rem] z-10 flex gap-1 overflow-x-auto border-b border-slate-800 bg-slate-950/80 px-3 py-2 lg:hidden">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 rounded-xl border px-3 py-2 text-xs transition ${
                active
                  ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
                  : "border-transparent text-slate-300 hover:border-slate-700"
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
