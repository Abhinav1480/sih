import type { CSSProperties } from "react";

// Instrument palette for the map chrome (control panel, legend, header).
export const P = {
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

export const HAIRLINE = "rgba(232,244,248,0.12)";

// Translucent panel: no drop shadow, 1px hairline border.
export const PANEL: CSSProperties = {
  background: "rgba(10,36,50,0.85)",
  border: `1px solid ${HAIRLINE}`,
  color: P.text,
  backdropFilter: "blur(6px)",
};

export const NUM = "num font-mono tabular-nums";

export const layerIdOf = (l: any): string => l?.id || l?.layer_id || "";
export const layerKindOf = (l: any): string => String(l?.kind || l?.layer_type || "").toLowerCase();
