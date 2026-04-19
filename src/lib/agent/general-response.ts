type MessageContext = {
  author: "user" | "agent";
  content: string;
};

type GeneralAgentInput = {
  caseTitle: string;
  client?: string | null;
  message: string;
  operacion?: string | null;
  material?: string | null;
  maquina?: string | null;
  marcaPreferida?: string | null;
  history?: MessageContext[];
};

function joinHistory(history: MessageContext[]) {
  return history
    .slice(-6)
    .map((entry) => `${entry.author === "user" ? "Usuario" : "Agente"}: ${entry.content}`)
    .join(" \n ");
}

function detectOperacion(text: string) {
  const lower = text.toLowerCase();
  if (lower.includes("tornead")) return "torneado";
  if (lower.includes("fresad")) return "fresado";
  if (lower.includes("taladr")) return "taladrado";
  if (lower.includes("rosc")) return "roscado";
  return "mecanizado general";
}

function detectMaterial(text: string) {
  const lower = text.toLowerCase();
  if (lower.includes("1040")) return "acero 1040";
  if (lower.includes("4140")) return "acero 4140";
  if (lower.includes("inoxid")) return "acero inoxidable";
  if (lower.includes("alumin")) return "aluminio";
  if (lower.includes("fundic")) return "fundición";
  return "material por confirmar";
}

function detectNeed(text: string) {
  const lower = text.toLowerCase();
  if (lower.includes("vibr")) return "estabilidad y reducción de vibración";
  if (lower.includes("acabado")) return "acabado superficial";
  if (lower.includes("desgaste")) return "control de desgaste";
  if (lower.includes("prueba")) return "definir parámetros de arranque para prueba";
  if (lower.includes("inserto")) return "definir inserto y geometría de arranque";
  return "diagnóstico técnico inicial";
}

export function buildGeneralAgentResponse({
  caseTitle,
  client,
  message,
  operacion,
  material,
  maquina,
  marcaPreferida,
  history = [],
}: GeneralAgentInput) {
  const historyText = joinHistory(history);
  const combinedText = `${historyText} ${message}`.trim();
  const detectedOperacion = operacion || detectOperacion(combinedText);
  const detectedMaterial = material || detectMaterial(combinedText);
  const need = detectNeed(combinedText);

  const contexto = [
    `Contexto técnico: para el caso \"${caseTitle}\"${client ? ` con ${client}` : ""}, ya tengo una consulta de ${detectedOperacion} sobre ${detectedMaterial}.`,
    maquina ? `Máquina reportada: ${maquina}.` : null,
    marcaPreferida ? `Marca preferida declarada: ${marcaPreferida}.` : null,
    `La necesidad principal parece ser ${need}.`,
  ]
    .filter(Boolean)
    .join(" ");

  const followUp =
    detectedMaterial === "material por confirmar"
      ? "Todavía me falta confirmar el material exacto para afinar mejor la recomendación."
      : "Como ya tengo material y operación, el siguiente paso sería aterrizar geometría, grado y parámetros sobre la herramienta exacta.";

  return [
    contexto,
    "Recomendación inicial: arranque con una prueba conservadora, priorizando estabilidad de corte, control de viruta y revisión de rigidez de sujeción antes de subir parámetros.",
    `Parámetros de arranque sugeridos: para ${detectedOperacion}, use velocidad media, avance moderado y profundidad ligera en la primera corrida. Si observa estabilidad, suba un parámetro a la vez y documente el cambio.`,
    followUp,
  ].join("\n\n");
}
