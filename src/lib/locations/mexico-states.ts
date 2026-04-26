// Catálogo cerrado de los 32 estados de México. El label es la fuente
// de verdad — se guarda tal cual en `customers.estado` y el CHECK
// constraint de la BD valida contra esta misma lista.
//
// Mantener sincronizado con el CHECK en
// supabase/migrations/20260426150000_customers_table.sql si se agrega
// o cambia algún valor.

export const MEXICO_STATES = [
  "Aguascalientes",
  "Baja California",
  "Baja California Sur",
  "Campeche",
  "Chiapas",
  "Chihuahua",
  "Ciudad de México",
  "Coahuila",
  "Colima",
  "Durango",
  "Guanajuato",
  "Guerrero",
  "Hidalgo",
  "Jalisco",
  "México",
  "Michoacán",
  "Morelos",
  "Nayarit",
  "Nuevo León",
  "Oaxaca",
  "Puebla",
  "Querétaro",
  "Quintana Roo",
  "San Luis Potosí",
  "Sinaloa",
  "Sonora",
  "Tabasco",
  "Tamaulipas",
  "Tlaxcala",
  "Veracruz",
  "Yucatán",
  "Zacatecas",
] as const;

export type MexicoState = (typeof MEXICO_STATES)[number];

const VALID_STATE_SET = new Set<string>(MEXICO_STATES);

export function isValidMexicoState(value: string | null | undefined): value is MexicoState {
  return value != null && VALID_STATE_SET.has(value);
}
