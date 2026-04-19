export type BrandId =
  | "general"
  | "sandvik"
  | "vargus"
  | "korloy"
  | "dormer"
  | "boehlerit";

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
    id: "boehlerit",
    label: "Boehlerit",
    status: "coming_soon",
    description: "Especialista Boehlerit. Entra en V1.3.",
  },
] as const;

export function getBrand(id: BrandId) {
  return BRANDS.find((brand) => brand.id === id) ?? BRANDS[0];
}
