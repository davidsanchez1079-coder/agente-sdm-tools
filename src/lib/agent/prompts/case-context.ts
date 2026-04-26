import type { CaseRow } from "@/lib/workspace/folders";
import { BRANDS } from "@/lib/brands/brands";
import {
  estadoLabel,
  formatPotencialUsd,
  operacionTipoLabel,
  prioridadLabel,
  resultadoCierreLabel,
  type CaseOperacionTipo,
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

function buildOperacionLine(
  operacionTipo: CaseOperacionTipo | null,
  operacion: string | null,
): string {
  const tipoLabel = operacionTipo ? operacionTipoLabel(operacionTipo) : null;
  const detalle = operacion?.trim() || null;
  if (tipoLabel && detalle) {
    return `Operación (anclaje principal): ${tipoLabel} — ${detalle}. Usa el tipo como línea principal de tu análisis; el detalle libre matiza el caso. Todo lo demás se interpreta a su luz.`;
  }
  if (tipoLabel) {
    return `Operación (anclaje principal): ${tipoLabel}. Usa esta operación como línea principal de tu análisis; todo lo demás del caso se interpreta a su luz.`;
  }
  if (detalle) {
    return `Operación (anclaje principal): ${detalle} (tipo sin clasificar). Usa esta operación como línea principal de tu análisis; conviene que el vendedor clasifique el tipo para mayor precisión.`;
  }
  return "Operación (anclaje principal): SIN DEFINIR. Antes de cerrar una recomendación específica, señala puntualmente al usuario que hace falta precisar la operación y pídele que la aclare. Puedes ofrecer un análisis preliminar general, pero no inventes una operación por defecto.";
}

export function buildCaseContext(caseRow: CaseRow): string {
  const lines = [
    "CONTEXTO DEL CASO",
    buildOperacionLine(caseRow.operacion_tipo, caseRow.operacion),
    `Título: ${caseRow.titulo}`,
    `Cliente: ${caseRow.cliente ?? "sin asignar"}`,
    `Fabricante preferido: ${describeFabricante(caseRow.marca_preferida)}`,
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
  lines.push(
    `Potencial mensual de la oportunidad: ${formatPotencialUsd(caseRow.potencial_usd)}${caseRow.potencial_usd != null ? " / mes" : ""}`,
  );
  lines.push("");
  lines.push(
    "Convención: TODA cifra USD del sistema es mensual salvo que se diga lo contrario. El potencial de un caso es el USD/mes que se espera de esa oportunidad específica; el cliente tiene además su potencial total mensual agregado, separado de los casos individuales.",
  );
  lines.push("");
  lines.push(
    "Toma este contexto como base. Si detectas inconsistencias o datos faltantes críticos para dar una recomendación sólida, menciónalos como parte de tu respuesta.",
  );
  return lines.join("\n");
}
