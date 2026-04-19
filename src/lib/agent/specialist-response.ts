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
  allowedScope: string;
  forbidden: string;
  nextStep: string;
};

const BRAND_RULES: Record<Exclude<SpecialistMode, "general">, BrandRule> = {
  sandvik: {
    label: "Sandvik Coromant",
    focus: "torneado, fresado y barrenado de alto desempeño con criterio de aplicación estable",
    allowedScope: "puedo recomendar familias, enfoque de geometría, grado y criterio de aplicación compatibles con Sandvik, sin fingir clave exacta no confirmada",
    forbidden: "no debo mezclar recomendaciones de Korloy, Vargus, Dormer o Boehlerit como si fueran equivalentes directos dentro de la misma respuesta especialista",
    nextStep: "cerrar familia de solución, objetivo de corte y rango inicial de parámetros dentro del marco Sandvik",
  },
  vargus: {
    label: "Vargus",
    focus: "roscado, ranurado y herramientas especializadas donde la geometría de aplicación manda",
    allowedScope: "puedo orientar sobre línea de solución, tipo de rosca, perfil y estrategia de aplicación compatibles con Vargus",
    forbidden: "no debo inventar insertos exactos ni brincar a marcas de torneado general si la consulta sigue en carril Vargus",
    nextStep: "definir estándar de rosca, perfil, paso, diámetro y si la aplicación es interna, externa o especial",
  },
  korloy: {
    label: "Korloy",
    focus: "torneado y fresado productivo con énfasis comercial/técnico en relación costo-rendimiento",
    allowedScope: "puedo sugerir criterio de geometría, estabilidad y dirección de solución dentro del marco Korloy",
    forbidden: "no debo presentar referencias de Sandvik o Dormer como respuesta principal si el modo activo es Korloy",
    nextStep: "definir si la prioridad es costo por pieza, disponibilidad, agresividad de corte o vida de herramienta",
  },
  dormer: {
    label: "Dormer Pramet",
    focus: "barrenado, fresado, torneado y herramientas de corte estándar con enfoque práctico de aplicación",
    allowedScope: "puedo recomendar familias de solución y criterio de uso compatible con Dormer Pramet",
    forbidden: "no debo salir del carril Dormer hacia propuestas mixtas sin que el usuario cambie de modo",
    nextStep: "cerrar tipo de herramienta, diámetro, profundidad útil y condición de máquina para aterrizar recomendación",
  },
  boehlerit: {
    label: "Boehlerit",
    focus: "mecanizado robusto con atención a estabilidad, materiales demandantes y consistencia de proceso",
    allowedScope: "puedo orientar geometría, grado y criterio de aplicación compatibles con Boehlerit sin fingir SKU exacto",
    forbidden: "no debo mezclar respuesta multimarca ni asumir catálogo no confirmado",
    nextStep: "confirmar material, operación, estabilidad de montaje y meta de productividad para aterrizar solución",
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
    `Modo especialista activo: ${rule.label}. Caso \"${caseTitle}\"${client ? ` con ${client}` : ""}.`,
    `Marco técnico actual: ${operacion || "operación por confirmar"} sobre ${material || "material por confirmar"}${maquina ? ` en máquina ${maquina}` : ""}.`,
    marcaPreferida ? `Preferencia comercial registrada: ${marcaPreferida}.` : null,
    `Enfoque de marca: ${rule.focus}.`,
    `Alcance permitido: ${rule.allowedScope}.`,
    `Límite del muro de marcas: ${rule.forbidden}.`,
    `Lectura inicial de su mensaje (\"${message}\"): responderé dentro del carril de ${rule.label}, sin brincar a una recomendación multimarca disfrazada.`,
    `Siguiente paso técnico: ${rule.nextStep}.`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
