export type DuePreset = {
  id: string;
  label: string;
  addMs: number;
};

/** Presets de vencimiento en UI: +1h, +3h, +8h, +1d, +3d, +7d */
export const DUE_DATE_PRESETS: DuePreset[] = [
  { id: "1h", label: "+1 h", addMs: 60 * 60 * 1000 },
  { id: "3h", label: "+3 h", addMs: 3 * 60 * 60 * 1000 },
  { id: "8h", label: "+8 h", addMs: 8 * 60 * 60 * 1000 },
  { id: "1d", label: "+1 día", addMs: 24 * 60 * 60 * 1000 },
  { id: "3d", label: "+3 días", addMs: 3 * 24 * 60 * 60 * 1000 },
  { id: "7d", label: "+7 días", addMs: 7 * 24 * 60 * 60 * 1000 },
];

export function dueAtFromPreset(presetId: string, from: Date = new Date()): Date {
  const preset = DUE_DATE_PRESETS.find((p) => p.id === presetId);
  if (!preset) return new Date(from.getTime() + DUE_DATE_PRESETS[0].addMs);
  return new Date(from.getTime() + preset.addMs);
}
