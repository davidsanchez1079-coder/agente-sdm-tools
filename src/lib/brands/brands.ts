export type BrandId =
  | "general"
  | "sandvik"
  | "vargus"
  | "korloy"
  | "dormer"
  | "amec";

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
] as const;

export function getBrand(id: BrandId) {
  return BRANDS.find((brand) => brand.id === id) ?? BRANDS[0];
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
