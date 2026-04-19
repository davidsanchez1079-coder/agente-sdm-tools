export type CustomerId =
  | "pcnc"
  | "magna"
  | "john_deere"
  | "parker_stratoflex_hannifin"
  | "collado"
  | "neapco"
  | "turbomaquinas";

export type Customer = {
  id: CustomerId;
  label: string;
};

export const CUSTOMERS: readonly Customer[] = [
  { id: "pcnc", label: "PCNC" },
  { id: "magna", label: "Magna" },
  { id: "john_deere", label: "John Deere" },
  { id: "parker_stratoflex_hannifin", label: "Parker Stratoflex Hannifin" },
  { id: "collado", label: "Collado" },
  { id: "neapco", label: "Neapco" },
  { id: "turbomaquinas", label: "Turbomáquinas" },
] as const;

export function findCustomerByLabel(label: string) {
  const normalized = label.trim().toLowerCase();
  return CUSTOMERS.find(
    (customer) => customer.label.toLowerCase() === normalized,
  );
}
