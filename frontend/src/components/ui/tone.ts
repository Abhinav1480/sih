/**
 * Instrumentation palette (Track C). Colours are ALWAYS paired with a word or
 * icon at the call site; never rely on colour alone.
 */
export const PALETTE = {
  base: "#04141d",
  panel: "#0a2432",
  raised: "#12384a",
  accent: "#38e8d0",
  calm: "#7dd3a0",
  caution: "#ffb443",
  hazard: "#ff7043",
  severe: "#ff5d5d",
  text: "#e8f4f8",
  muted: "#7a94a3",
} as const;

export type Tone = { hex: string; word: string };

export const BAND_TONE: Record<string, Tone> = {
  LOW: { hex: PALETTE.calm, word: "LOW" },
  MODERATE: { hex: PALETTE.caution, word: "MODERATE" },
  HIGH: { hex: PALETTE.hazard, word: "HIGH" },
  SEVERE: { hex: PALETTE.severe, word: "SEVERE" },
};

export const VERDICT_TONE: Record<string, Tone> = {
  GO: { hex: PALETTE.calm, word: "GO" },
  CAUTION: { hex: PALETTE.caution, word: "CAUTION" },
  NO_GO: { hex: PALETTE.severe, word: "NO-GO" },
  "NO-GO": { hex: PALETTE.severe, word: "NO-GO" },
  NOT_APPLICABLE: { hex: PALETTE.muted, word: "N/A" },
};

export const UNKNOWN_TONE: Tone = { hex: PALETTE.muted, word: "UNKNOWN" };

export const bandTone = (band?: string | null): Tone =>
  BAND_TONE[(band || "").toUpperCase()] || UNKNOWN_TONE;

export const verdictTone = (verdict?: string | null): Tone =>
  VERDICT_TONE[(verdict || "").toUpperCase()] || UNKNOWN_TONE;

/** Tabular monospace for every number / coordinate / timestamp. */
export const NUM = "font-mono tabular-nums";
