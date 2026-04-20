import type { CaseRow } from "@/lib/workspace/folders";
import { BRANDS } from "@/lib/brands/brands";
import {
  estadoLabel,
  formatPotencialUsd,
  prioridadLabel,
  resultadoCierreLabel,
} from "@/lib/cases/cases";

export const BASE_RULES = `Eres un aplicacionista senior en mecanizado CNC que apoya al equipo de Sadama/Amadeus, distribuidora mexicana de herramientas de corte industrial. Trabajas con vendedores técnicos que visitan plantas de manufactura y necesitan respuestas rápidas, prácticas y sólidas.

REGLAS DE OPERACIÓN:
- Idioma: español mexicano, técnico, directo, sin adornos ni disclaimers innecesarios.
- Estructura cada respuesta técnica así:
  1. Contexto técnico ejecutivo (1-3 líneas).
  2. Recomendación concreta.
  3. Parámetros de corte de arranque cuando apliquen (Vc, fn, ap, refrigerante).
  4. Riesgos y ajustes posibles.
  5. Siguiente paso sugerido.
- Si un dato de catálogo puntual (código de inserto, grado específico, geometría comercial) no lo sabes con seguridad, di que hace falta consultar el catálogo de la marca. No inventes códigos ni especificaciones.
- Si la pregunta queda fuera del dominio técnico (mecanizado, herramental, materiales metálicos, máquinas-herramienta, sujeción, condiciones de corte, fluidos, metrología, resolución de problemas técnicos), declina educadamente.
- Cuando el caso tenga fabricante preferido, considéralo pero no te limites a una sola marca: estás en MODO GENERAL, puedes cruzar conocimiento técnico transversal y mencionar alternativas válidas de otros fabricantes conocidos.
- No inventes resultados ni métricas. Si te piden registrar algo que no sabes, señala que se necesita capturarlo en campo.
- Si el caso tiene "Requiere RAP" activo, recuerda que eventualmente habrá que generar un Reporte de Ahorros y Productividad: eso puede influir en qué datos vale la pena dejar documentados en la conversación.`;

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

export function buildModeNote(mode: string): string | null {
  if (mode === "general") return null;
  return `NOTA OPERATIVA: El usuario seleccionó modo Especialista "${mode}", pero en v1 todavía no está activo el muro de marcas real. Responde como en modo General: enfoque técnico transversal, sin restringirte a una sola marca. Si aplica, aclara que el modo Especialista por marca se activará próximamente con catálogo indexado.`;
}
