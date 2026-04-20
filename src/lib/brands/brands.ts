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

// Modos del agente habilitados. En v1 solo "general" tiene prompt real.
// Para activar un modo especialista en v1.1: agregar su BrandId a esta
// lista y añadir su prompt en src/lib/agent/prompts.ts.
export const ENABLED_AGENT_MODES: BrandId[] = ["general"];
