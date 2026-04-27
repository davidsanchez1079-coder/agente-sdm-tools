export type BrandId =
  | "general"
  | "sandvik"
  | "vargus"
  | "korloy"
  | "dormer"
  | "amec"
  | "otro";

export type BrandStatus = "always" | "indexed" | "coming_soon";

export type Brand = {
  id: BrandId;
  label: string;
  status: BrandStatus;
  description: string;
};

export const BRANDS: readonly Brand[] = [
  {
    id: "general",
    label: "General",
    status: "always",
    description:
      "Agente sin muro de marcas. Cruza información técnica transversal de todas las marcas indexadas.",
  },
  {
    id: "sandvik",
    label: "Sandvik Coromant",
    status: "indexed",
    description:
      "Especialista Sandvik. Solo recomienda productos, grados, geometrías y parámetros Sandvik.",
  },
  {
    id: "vargus",
    label: "Vargus",
    status: "coming_soon",
    description:
      "Especialista Vargus. Enfocado a las familias de roscado y ranurado. Entra en V1.",
  },
  {
    id: "korloy",
    label: "Korloy",
    status: "coming_soon",
    description: "Especialista Korloy. Entra en V1.1.",
  },
  {
    id: "dormer",
    label: "Dormer Pramet",
    status: "coming_soon",
    description: "Especialista Dormer Pramet. Entra en V1.2.",
  },
  {
    id: "amec",
    label: "Amec",
    status: "coming_soon",
    description:
      "Especialista Amec. Enfocado a taladrado modular y entero.",
  },
  {
    id: "otro",
    label: "Otro / no clasificado",
    status: "always",
    description:
      "Caso sin fabricante identificado todavía o con marca fuera del catálogo. No es asignable como marca de externo: los externos no ven cases marcados como otro a menos que exista una regla explícita posterior.",
  },
] as const;

export function getBrand(id: BrandId) {
  return BRANDS.find((brand) => brand.id === id) ?? BRANDS[0];
}

export function brandBadgeLabel(brandId: string | null | undefined): string {
  if (!brandId) return "Sin marca";
  const id = brandId.trim().toLowerCase();
  if (id === "otro") return "OTRO";
  const match = BRANDS.find((b) => b.id === id || b.label.toLowerCase() === id);
  return match?.label ?? brandId.toUpperCase();
}

export function brandBadgeClass(brandId: string | null | undefined): string {
  const id = brandId?.trim().toLowerCase();
  if (!id) {
    return "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200";
  }
  if (id === "otro") {
    return "border-amber-500/40 bg-amber-100 text-amber-800 dark:border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-200";
  }
  return "border-fuchsia-500/40 bg-fuchsia-100 text-fuchsia-800 dark:border-fuchsia-400/40 dark:bg-fuchsia-500/15 dark:text-fuchsia-200";
}

// Modos del agente habilitados. Cada modo tiene su propio prompt en
// src/lib/agent/prompts/. Para activar un nuevo modo:
//   1. crear src/lib/agent/prompts/<mode>.ts con su BRAND_PROFILE
//   2. registrarlo en BRAND_PROFILES de prompts/index.ts
//   3. agregar su BrandId a esta lista
export const ENABLED_AGENT_MODES: BrandId[] = [
  "general",
  "sandvik",
  "vargus",
  "korloy",
  "dormer",
  "amec",
];
