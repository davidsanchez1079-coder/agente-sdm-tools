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

function labelForMode(mode: SpecialistMode) {
  switch (mode) {
    case "sandvik":
      return "Sandvik Coromant";
    case "vargus":
      return "Vargus";
    case "korloy":
      return "Korloy";
    case "dormer":
      return "Dormer Pramet";
    case "boehlerit":
      return "Boehlerit";
    default:
      return "General";
  }
}

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
  const brand = labelForMode(mode);

  return [
    `Modo especialista activo: ${brand}. Caso \"${caseTitle}\"${client ? ` con ${client}` : ""}.`,
    `Marco técnico actual: ${operacion || "operación por confirmar"} sobre ${material || "material por confirmar"}${maquina ? ` en máquina ${maquina}` : ""}.`,
    marcaPreferida ? `Preferencia comercial registrada: ${marcaPreferida}.` : null,
    `Respuesta especialista inicial: voy a priorizar criterios compatibles con ${brand}, pero sin inventar todavía una clave exacta de inserto o herramienta si no está soportada por catálogo o reglas de marca.`,
    `Siguiente enfoque sobre su mensaje (\"${message}\"): bajar la recomendación a geometría, familia de herramienta y criterio de aplicación dentro del marco de ${brand}.`,
    "Dato faltante para cerrar recomendación: herramienta exacta, sujeción, profundidad de corte, avance objetivo, vida esperada y si la prioridad es desbaste, acabado, estabilidad, rebaba o control de desgaste.",
  ]
    .filter(Boolean)
    .join("\n\n");
}
