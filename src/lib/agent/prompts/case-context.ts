import type { CaseRow } from "@/lib/workspace/folders";
import { BRANDS } from "@/lib/brands/brands";
import {
  estadoLabel,
  formatPotencialUsd,
  prioridadLabel,
  resultadoCierreLabel,
} from "@/lib/cases/cases";

function describeFabricante(marcaPreferida: string | null): string {
  if (!marcaPreferida) return "sin asignar";
  const normalized = marcaPreferida.trim().toLowerCase();
  const match = BRANDS.find(
    (brand) =>
      brand.id === normalized || brand.label.toLowerCase() === normalized,
  );
  return match?.label ?? marcaPreferida;
}

export function buildCaseContext(caseRow: CaseRow): string {
  const lines = [
    "CONTEXTO DEL CASO",
    `Título: ${caseRow.titulo}`,
    `Cliente: ${caseRow.cliente ?? "sin asignar"}`,
    `Fabricante preferido: ${describeFabricante(caseRow.marca_preferida)}`,
    `Operación: ${caseRow.operacion ?? "sin asignar"}`,
    `Material: ${caseRow.material ?? "sin asignar"}`,
    `Máquina: ${caseRow.maquina ?? "sin asignar"}`,
    `Estado: ${estadoLabel(caseRow.estado)}`,
    `Prioridad: ${prioridadLabel(caseRow.prioridad)}`,
  ];
  if (caseRow.siguiente_accion) {
    lines.push(`Siguiente acción planteada: ${caseRow.siguiente_accion}`);
  }
  if (caseRow.resumen_ejecutivo) {
    lines.push(`Resumen ejecutivo previo: ${caseRow.resumen_ejecutivo}`);
  }
  if (caseRow.resultado_cierre) {
    lines.push(
      `Resultado de cierre registrado: ${resultadoCierreLabel(caseRow.resultado_cierre)}`,
    );
  }
  lines.push(`Requiere RAP: ${caseRow.requiere_rap ? "Sí" : "No"}`);
  lines.push(`Potencial económico: ${formatPotencialUsd(caseRow.potencial_usd)}`);
  lines.push("");
  lines.push(
    "Toma este contexto como base. Si detectas inconsistencias o datos faltantes críticos para dar una recomendación sólida, menciónalos como parte de tu respuesta.",
  );
  return lines.join("\n");
}
