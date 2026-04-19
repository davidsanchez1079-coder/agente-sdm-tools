type GeneralAgentInput = {
  caseTitle: string;
  client?: string | null;
  message: string;
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
  if (lower.includes("vibr")) return "estabilidad y reducción de vibración";
  if (lower.includes("acabado")) return "acabado superficial";
  if (lower.includes("desgaste")) return "control de desgaste";
  if (lower.includes("prueba")) return "definir parámetros de arranque para prueba";
  return "diagnóstico técnico inicial";
}

export function buildGeneralAgentResponse({ caseTitle, client, message }: GeneralAgentInput) {
  const operacion = detectOperacion(message);
  const material = detectMaterial(message);
  const need = detectNeed(message);

  return [
    `Contexto técnico: para el caso \"${caseTitle}\"${client ? ` con ${client}` : ""}, detecto una consulta de ${operacion} sobre ${material}. La necesidad principal parece ser ${need}.`,
    "Recomendación inicial: arranque con una prueba conservadora, priorizando estabilidad de corte, control de viruta y revisión de rigidez de sujeción antes de subir parámetros.",
    "Parámetros de arranque sugeridos: use velocidad media, avance moderado y profundidad ligera en la primera corrida. Si la prueba es de torneado en acero 1040, empiece estable y suba solo si la máquina, la sujeción y el filo responden bien.",
    "Siguiente dato que necesito para afinar: operación exacta, diámetro o herramienta, tipo de inserto/herramental, máquina y objetivo (desbaste, acabado, vida, tiempo ciclo o problema puntual).",
  ].join("\n\n");
}
