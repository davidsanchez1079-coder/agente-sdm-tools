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
  if (lower.includes("rebaba")) return "control de rebaba";
  if (lower.includes("vibr")) return "estabilidad y reducción de vibración";
  if (lower.includes("acabado")) return "acabado superficial";
  if (lower.includes("desgaste")) return "control de desgaste";
  if (lower.includes("prueba")) return "definir parámetros de arranque para prueba";
  if (lower.includes("inserto")) return "definir inserto y geometría de arranque";
  return "diagnóstico técnico inicial";
}

function summarizeKnownContext(history: MessageContext[]) {
  const text = history
    .filter((entry) => entry.author === "user")
    .map((entry) => entry.content)
    .join(" ");

  return {
    operacion: detectOperacion(text),
    material: detectMaterial(text),
    need: detectNeed(text),
  };
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
  const known = summarizeKnownContext(history);
  const detectedOperacion = operacion || known.operacion || detectOperacion(message);
  const detectedMaterial = material || known.material || detectMaterial(message);
  const detectedNeed = detectNeed(message);

  const shortHeader = history.length
    ? `Tomando en cuenta lo ya conversado en \"${caseTitle}\"${client ? ` con ${client}` : ""}.`
    : `Lectura inicial del caso \"${caseTitle}\"${client ? ` con ${client}` : ""}.`;

  const recommendation =
    detectedNeed === "control de rebaba"
      ? `Para ${detectedOperacion} sobre ${detectedMaterial}, yo arrancaría revisando filo efectivo, avance y estabilidad de salida de la pieza para bajar rebaba sin castigar de más el inserto.`
      : `Para ${detectedOperacion} sobre ${detectedMaterial}, conviene arrancar con una prueba controlada, estable y midiendo un cambio a la vez.`;

  const parameters =
    detectedNeed === "control de rebaba"
      ? "Prueba sugerida: mantenga profundidad ligera, revise si el avance está dejando material sin cortar limpio y valide estado del filo antes de subir velocidad por reflejo."
      : `Parámetro de arranque: use velocidad media, avance moderado y profundidad ligera en la primera corrida.`;

  const nextQuestion =
    detectedMaterial === "material por confirmar"
      ? "Dato faltante para afinar: material exacto de la pieza."
      : detectedNeed === "control de rebaba"
        ? "Dato puntual que me falta: si la rebaba aparece en salida, en arista o en toda la pasada, y qué TNMG está usando exactamente."
        : "Dato puntual que me falta: herramienta exacta, geometría y objetivo principal de la prueba.";

  return [
    shortHeader,
    recommendation,
    parameters,
    maquina ? `Máquina considerada: ${maquina}.` : null,
    marcaPreferida ? `Marca considerada: ${marcaPreferida}.` : null,
    nextQuestion,
  ]
    .filter(Boolean)
    .join("\n\n");
}
