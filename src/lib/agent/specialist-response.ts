type MessageContext = {
  author: "user" | "agent";
  content: string;
};

type SpecialistMode = "general" | "sandvik" | "vargus" | "korloy" | "dormer" | "amec";

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
  recommendation: string;
  caution: string;
  nextStep: string;
};

const BRAND_RULES: Record<Exclude<SpecialistMode, "general">, BrandRule> = {
  sandvik: {
    label: "Sandvik Coromant",
    recommendation:
      "yo priorizaría una prueba estable con geometría y grado orientados a control real del corte antes de perseguir agresividad",
    caution:
      "si grado, geometría o condición de máquina no están bien amarrados, conviene validar con una corrida conservadora",
    nextStep:
      "definir familia de solución y rango inicial de parámetros dentro del enfoque Sandvik",
  },
  vargus: {
    label: "Vargus",
    recommendation:
      "primero cerraría estándar, perfil y condición de aplicación para no recomendar una solución equivocada por detalle de rosca o forma",
    caution:
      "si falta paso, perfil, diámetro o si la aplicación es interna o externa, todavía no conviene cerrar la propuesta",
    nextStep:
      "confirmar estándar, perfil, paso, diámetro y tipo de aplicación",
  },
  korloy: {
    label: "Korloy",
    recommendation:
      "buscaría una salida estable y rentable en costo por pieza, sin arrancar demasiado agresivo hasta validar comportamiento real",
    caution:
      "si la prioridad es vida, costo o disponibilidad inmediata, hay que definirlo porque cambia la salida",
    nextStep:
      "definir si la prioridad es costo, vida, agresividad o disponibilidad",
  },
  dormer: {
    label: "Dormer Pramet",
    recommendation:
      "aterrizaría primero herramienta, diámetro útil y condición de máquina antes de cerrar una propuesta más fina",
    caution:
      "si falta profundidad útil o rigidez de montaje, se corre el riesgo de recomendar algo correcto en papel pero flojo en campo",
    nextStep:
      "confirmar herramienta, diámetro, profundidad útil y condición de máquina",
  },
  amec: {
    label: "Amec",
    recommendation:
      "aterrizaría primero diámetro, profundidad útil y material antes de decidir entre cabeza modular o broca entera, para que la solución Amec entre bien de arranque",
    caution:
      "si no están confirmados diámetro, profundidad útil, material o condición de fluido, se puede recomendar una cabeza modular que no aplica o un entero donde ya pedía modular",
    nextStep:
      "confirmar diámetro, profundidad útil, material y condición de fluido para decidir modular vs entero",
  },
};

function detectNeed(text: string) {
  const lower = text.toLowerCase();
  if (lower.includes("rebaba")) return "control de rebaba";
  if (lower.includes("acabado")) return "acabado superficial";
  if (lower.includes("desgaste")) return "control de desgaste";
  if (lower.includes("inserto")) return "definición de inserto";
  return "ajuste técnico de aplicación";
}

export function buildSpecialistAgentResponse({
  caseTitle,
  client,
  message,
  operacion,
  material,
  maquina,
  marcaPreferida,
  history = [],
  mode,
}: SpecialistAgentInput) {
  if (mode === "general") {
    return "Modo general activo. Este generador no debería usarse para general.";
  }

  const rule = BRAND_RULES[mode];
  const need = detectNeed(message);
  const intro = history.length
    ? `Tomando el contexto ya confirmado en \"${caseTitle}\"${client ? ` con ${client}` : ""}.`
    : `Lectura inicial del caso \"${caseTitle}\"${client ? ` con ${client}` : ""}.`;

  const focusedAnswer =
    need === "control de rebaba"
      ? `Si la prioridad es rebaba en ${operacion || "la operación"}, dentro del enfoque ${rule.label} yo revisaría primero geometría efectiva, filo y avance real antes de mover velocidad sin control.`
      : `Para ${operacion || "esta operación"} sobre ${material || "este material"}, dentro del enfoque ${rule.label}, ${rule.recommendation}.`;

  return [
    intro,
    focusedAnswer,
    maquina ? `Máquina considerada: ${maquina}.` : null,
    marcaPreferida ? `Marca objetivo: ${marcaPreferida}.` : null,
    `Punto de cuidado: ${rule.caution}.`,
    `Siguiente dato puntual para afinar: ${rule.nextStep}.`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
