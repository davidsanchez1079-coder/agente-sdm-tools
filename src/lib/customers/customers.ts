export type CustomerId =
  | "pcnc"
  | "magna"
  | "john_deere"
  | "parker_stratoflex_hannifin"
  | "collado"
  | "neapco"
  | "turbomaquinas";

export type CustomerStatus = "activo" | "prospecto" | "inactivo" | "pausado";

export type Customer = {
  id: CustomerId;
  label: string;
  segmento: string;
  estatus: CustomerStatus;
  notas: string;
};

export const CUSTOMERS: readonly Customer[] = [
  {
    id: "pcnc",
    label: "PCNC",
    segmento: "Industrial",
    estatus: "activo",
    notas: "Cliente industrial relevante para seguimiento técnico y comercial.",
  },
  {
    id: "magna",
    label: "Magna",
    segmento: "Automotriz",
    estatus: "activo",
    notas: "Cliente automotriz. Seguimiento técnico y comercial regular.",
  },
  {
    id: "john_deere",
    label: "John Deere",
    segmento: "Maquinaria / manufactura",
    estatus: "activo",
    notas:
      "Cliente de maquinaria y manufactura. Seguimiento técnico y comercial.",
  },
  {
    id: "parker_stratoflex_hannifin",
    label: "Parker Stratoflex Hannifin",
    segmento: "Industrial",
    estatus: "activo",
    notas:
      "Cliente industrial. Seguimiento técnico y comercial estándar.",
  },
  {
    id: "collado",
    label: "Collado",
    segmento: "Industrial",
    estatus: "activo",
    notas: "Cliente industrial. Seguimiento comercial regular.",
  },
  {
    id: "neapco",
    label: "Neapco",
    segmento: "Automotriz / industrial",
    estatus: "activo",
    notas:
      "Cliente automotriz e industrial. Seguimiento técnico y comercial.",
  },
  {
    id: "turbomaquinas",
    label: "Turbomáquinas",
    segmento: "Energía / industrial",
    estatus: "activo",
    notas:
      "Cliente del sector energía e industrial. Aplicaciones con atención técnica.",
  },
] as const;

export function findCustomerByLabel(label: string) {
  const normalized = label.trim().toLowerCase();
  return CUSTOMERS.find(
    (customer) => customer.label.toLowerCase() === normalized,
  );
}

export function getCustomerById(id: string) {
  return CUSTOMERS.find((customer) => customer.id === id);
}
