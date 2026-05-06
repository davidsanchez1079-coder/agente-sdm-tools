export type ModuleId =
  | "dashboard"
  | "usuario"
  | "customers"
  | "caso"
  | "tareas"
  | "agentes"
  | "accesos"
  | "brands";

export type ModuleMeta = {
  id: ModuleId;
  label: string;
  href: string;
  kicker: string;
};

export const MODULES: Record<ModuleId, ModuleMeta> = {
  dashboard: {
    id: "dashboard",
    label: "Dashboard",
    href: "/app",
    kicker: "Dashboard",
  },
  usuario: {
    id: "usuario",
    label: "Usuario",
    href: "/app/usuario",
    kicker: "Usuario",
  },
  customers: {
    id: "customers",
    label: "Cliente",
    href: "/app/customers",
    kicker: "Cliente",
  },
  caso: {
    id: "caso",
    label: "Caso/Oportunidad",
    href: "/app/caso",
    kicker: "Caso/Oportunidad",
  },
  tareas: {
    id: "tareas",
    label: "Tareas",
    href: "/app/tareas",
    kicker: "Tareas",
  },
  agentes: {
    id: "agentes",
    label: "Agentes",
    href: "/app/agentes",
    kicker: "Agentes",
  },
  accesos: {
    id: "accesos",
    label: "Accesos",
    href: "/app/accesos",
    kicker: "Accesos",
  },
  brands: {
    id: "brands",
    label: "Fabricante/Marca",
    href: "/app/brands",
    kicker: "Fabricante/Marca",
  },
};

export const MODULE_CHIP: Record<ModuleId, string> = {
  dashboard:
    "border-slate-300/70 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200",
  usuario:
    "border-violet-500/40 bg-violet-50 text-violet-700 dark:border-violet-400/40 dark:bg-violet-500/15 dark:text-violet-200",
  customers:
    "border-cyan-500/40 bg-cyan-50 text-cyan-700 dark:border-cyan-400/40 dark:bg-cyan-500/15 dark:text-cyan-200",
  caso: "border-emerald-500/40 bg-emerald-50 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-200",
  tareas:
    "border-sky-500/40 bg-sky-50 text-sky-800 dark:border-sky-400/40 dark:bg-sky-500/15 dark:text-sky-100",
  agentes:
    "border-teal-500/40 bg-teal-50 text-teal-700 dark:border-teal-400/40 dark:bg-teal-500/15 dark:text-teal-200",
  accesos:
    "border-indigo-500/40 bg-indigo-50 text-indigo-700 dark:border-indigo-400/40 dark:bg-indigo-500/15 dark:text-indigo-200",
  brands:
    "border-amber-500/40 bg-amber-50 text-amber-700 dark:border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-200",
};

export const MODULE_ICON_BG: Record<ModuleId, string> = {
  dashboard:
    "bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800/70 dark:text-slate-200 dark:ring-slate-700",
  usuario:
    "bg-violet-50 text-violet-600 ring-1 ring-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-400/30",
  customers:
    "bg-cyan-50 text-cyan-600 ring-1 ring-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-300 dark:ring-cyan-400/30",
  caso: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/30",
  tareas:
    "bg-sky-50 text-sky-600 ring-1 ring-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200 dark:ring-sky-400/30",
  agentes:
    "bg-teal-50 text-teal-600 ring-1 ring-teal-500/20 dark:bg-teal-500/10 dark:text-teal-300 dark:ring-teal-400/30",
  accesos:
    "bg-indigo-50 text-indigo-600 ring-1 ring-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-400/30",
  brands:
    "bg-amber-50 text-amber-700 ring-1 ring-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/30",
};

export const MODULE_BAR: Record<ModuleId, string> = {
  dashboard: "before:bg-slate-400 dark:before:bg-slate-500",
  usuario: "before:bg-violet-500 dark:before:bg-violet-400",
  customers: "before:bg-cyan-500 dark:before:bg-cyan-400",
  caso: "before:bg-emerald-500 dark:before:bg-emerald-400",
  tareas: "before:bg-sky-500 dark:before:bg-sky-400",
  agentes: "before:bg-teal-500 dark:before:bg-teal-400",
  accesos: "before:bg-indigo-500 dark:before:bg-indigo-400",
  brands: "before:bg-amber-500 dark:before:bg-amber-400",
};

export const MODULE_HOVER_RING: Record<ModuleId, string> = {
  dashboard: "hover:ring-slate-400/40 dark:hover:ring-slate-500/40",
  usuario: "hover:ring-violet-500/40 dark:hover:ring-violet-400/40",
  customers: "hover:ring-cyan-500/40 dark:hover:ring-cyan-400/40",
  caso: "hover:ring-emerald-500/40 dark:hover:ring-emerald-400/40",
  tareas: "hover:ring-sky-500/40 dark:hover:ring-sky-400/40",
  agentes: "hover:ring-teal-500/40 dark:hover:ring-teal-400/40",
  accesos: "hover:ring-indigo-500/40 dark:hover:ring-indigo-400/40",
  brands: "hover:ring-amber-500/40 dark:hover:ring-amber-400/40",
};

export const MODULE_ARROW: Record<ModuleId, string> = {
  dashboard:
    "text-slate-500 group-hover:text-slate-700 dark:text-slate-400 dark:group-hover:text-slate-200",
  usuario:
    "text-violet-600 group-hover:text-violet-700 dark:text-violet-300 dark:group-hover:text-violet-200",
  customers:
    "text-cyan-600 group-hover:text-cyan-700 dark:text-cyan-300 dark:group-hover:text-cyan-200",
  caso: "text-emerald-600 group-hover:text-emerald-700 dark:text-emerald-300 dark:group-hover:text-emerald-200",
  tareas:
    "text-sky-600 group-hover:text-sky-700 dark:text-sky-300 dark:group-hover:text-sky-200",
  agentes:
    "text-teal-600 group-hover:text-teal-700 dark:text-teal-300 dark:group-hover:text-teal-200",
  accesos:
    "text-indigo-600 group-hover:text-indigo-700 dark:text-indigo-300 dark:group-hover:text-indigo-200",
  brands:
    "text-amber-700 group-hover:text-amber-800 dark:text-amber-300 dark:group-hover:text-amber-200",
};

export const MODULE_ACTIVE_NAV: Record<ModuleId, string> = {
  dashboard:
    "border-slate-300/70 bg-slate-100 text-slate-900 shadow-[inset_3px_0_0_0_rgb(148_163_184)] dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-100 dark:shadow-[inset_3px_0_0_0_rgb(148_163_184)]",
  usuario:
    "border-violet-500/30 bg-violet-50 text-violet-800 shadow-[inset_3px_0_0_0_rgb(139_92_246)] dark:border-violet-400/30 dark:bg-violet-500/10 dark:text-violet-100 dark:shadow-[inset_3px_0_0_0_rgb(167_139_250)]",
  customers:
    "border-cyan-500/30 bg-cyan-50 text-cyan-800 shadow-[inset_3px_0_0_0_rgb(6_182_212)] dark:border-cyan-400/30 dark:bg-cyan-500/10 dark:text-cyan-100 dark:shadow-[inset_3px_0_0_0_rgb(34_211_238)]",
  caso: "border-emerald-500/30 bg-emerald-50 text-emerald-800 shadow-[inset_3px_0_0_0_rgb(16_185_129)] dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-100 dark:shadow-[inset_3px_0_0_0_rgb(52_211_153)]",
  tareas:
    "border-sky-500/30 bg-sky-50 text-sky-900 shadow-[inset_3px_0_0_0_rgb(14_165_233)] dark:border-sky-400/30 dark:bg-sky-500/10 dark:text-sky-100 dark:shadow-[inset_3px_0_0_0_rgb(56_189_248)]",
  agentes:
    "border-teal-500/30 bg-teal-50 text-teal-800 shadow-[inset_3px_0_0_0_rgb(20_184_166)] dark:border-teal-400/30 dark:bg-teal-500/10 dark:text-teal-100 dark:shadow-[inset_3px_0_0_0_rgb(45_212_191)]",
  accesos:
    "border-indigo-500/30 bg-indigo-50 text-indigo-800 shadow-[inset_3px_0_0_0_rgb(99_102_241)] dark:border-indigo-400/30 dark:bg-indigo-500/10 dark:text-indigo-100 dark:shadow-[inset_3px_0_0_0_rgb(129_140_248)]",
  brands:
    "border-amber-500/30 bg-amber-50 text-amber-800 shadow-[inset_3px_0_0_0_rgb(245_158_11)] dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-100 dark:shadow-[inset_3px_0_0_0_rgb(251_191_36)]",
};

export function moduleIdFromPath(pathname: string): ModuleId {
  if (pathname === "/app") return "dashboard";
  if (pathname.startsWith("/app/usuario")) return "usuario";
  if (pathname.startsWith("/app/customers")) return "customers";
  if (pathname.startsWith("/app/caso")) return "caso";
  if (pathname.startsWith("/app/tareas")) return "tareas";
  if (pathname.startsWith("/app/agentes")) return "agentes";
  if (pathname.startsWith("/app/accesos")) return "accesos";
  if (pathname.startsWith("/app/brands")) return "brands";
  return "dashboard";
}
