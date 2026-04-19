type MessageContext = {
  author: "user" | "agent";
  content: string;
};

type SpecialistMode = "general" | "sandvik" | "vargus" | "korloy" | "dormer" | "boehlerit";

type SpecialistAgentInput = {
  caseTitle: string;
  client?: string | null;
  message: string;
  operacion?: string | null;
  material?: string | null;
  maquina?: string | null;
  marcaPreferida?: string | null;
  history?: MessageContext[];
  mode: SpecialistMode;
};

type BrandRule = {
  label: string;
  focus: string;
  recommendation: string;
  caution: string;
  nextStep: string;
};

const BRAND_RULES: Record<Exclude<SpecialistMode, "general">, BrandRule> = {
  sandvik: {
    label: "Sandvik Coromant",
    focus: "aplicación estable en torneado, fresado y barrenado de alto desempeño",
    recommendation:
      "para una prueba inicial conviene priorizar una geometría estable, control de filo y consistencia de acabado antes de subir agresividad",
    caution:
      "si todavía no están cerrados el grado, la geometría exacta o la condición de máquina, conviene validar con una corrida conservadora y documentar resultado",
    nextStep:
      "definir familia de solución, objetivo de corte y rango inicial de parámetros dentro del enfoque Sandvik",
  },
  vargus: {
    label: "Vargus",
    focus: "roscado, ranurado y herramientas especializadas donde manda la geometría de aplicación",
    recommendation:
      "lo primero es amarrar estándar, perfil y condición de entrada para no recomendar una solución equivocada por detalle de rosca o forma",
    caution:
      "si falta paso, perfil, diámetro o si la aplicación es interna o externa, cualquier recomendación cerrada sería prematura",
    nextStep:
      "confirmar estándar de rosca, perfil, paso, diámetro y tipo de aplicación para aterrizar la recomendación",
  },
  korloy: {
    label: "Korloy",
    focus: "productividad con buena relación costo-rendimiento en torneado y fresado",
    recommendation:
      "conviene buscar una solución estable y competitiva en costo por pieza, sin arrancar demasiado agresivo hasta validar comportamiento real",
    caution:
      "si la prioridad es vida de herramienta, costo por pieza o disponibilidad inmediata, hay que decirlo explícitamente porque cambia la recomendación",
    nextStep:
      "definir si la prioridad es costo, vida, agresividad de corte o disponibilidad para aterrizar mejor la solución",
  },
  dormer: {
    label: "Dormer Pramet",
    focus: "aplicación práctica de herramientas estándar en barrenado, fresado y torneado",
    recommendation:
      "para avanzar bien aquí conviene aterrizar primero herramienta, diámetro útil y condición de máquina antes de cerrar una propuesta de trabajo",
    caution:
      "si falta profundidad, longitud útil o rigidez de montaje, el riesgo es recomendar algo correcto en papel pero flojo en campo",
    nextStep:
      "confirmar herramienta, diámetro, profundidad útil y condición de máquina para bajar la recomendación",
  },
  boehlerit: {
    label: "Boehlerit",
    focus: "mecanizado robusto con atención a estabilidad, materiales demandantes y consistencia de proceso",
    recommendation:
      "la mejor salida inicial suele ser una propuesta conservadora y muy estable antes de perseguir productividad máxima",
    caution:
      "si el montaje, la rigidez o el material no están bien confirmados, se puede castigar la prueba aunque el grado sea correcto",
    nextStep:
      "confirmar material, estabilidad de montaje y meta de productividad para aterrizar la solución",
  },
};

export function buildSpecialistAgentResponse({
  caseTitle,
  client,
  message,
  operacion,
  material,
  maquina,
  marcaPreferida,
  mode,
}: SpecialistAgentInput) {
  if (mode === "general") {
    return "Modo general activo. Este generador no debería usarse para general.";
  }

  const rule = BRAND_RULES[mode];

  return [
    `Lectura del caso: para \"${caseTitle}\"${client ? ` con ${client}` : ""}, estamos viendo ${operacion || "una operación por confirmar"} sobre ${material || "material por confirmar"}${maquina ? ` en ${maquina}` : ""}.`,
    marcaPreferida ? `Marca objetivo registrada: ${marcaPreferida}.` : null,
    `En enfoque ${rule.label}, aquí priorizaría ${rule.focus}.`,
    `Recomendación inicial: ${rule.recommendation}.`,
    `Con su mensaje (\"${message}\"), mi lectura es que primero conviene validar una prueba controlada y medir resultado antes de mover el set-up a un rango más agresivo.`,
    `Punto de cuidado: ${rule.caution}.`,
    `Siguiente dato para afinar: ${rule.nextStep}.`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
