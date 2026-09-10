/**
 * ORCA Design Tokens — marine operations console (ship-bridge instrumentation).
 *
 * Exactly ten colours. Elevation is expressed with translucency and 1px
 * hairline borders, never drop shadows. Numbers, coordinates and timestamps
 * use the `.num` utility (monospace, tabular-nums); interface text stays sans.
 * Motion is reserved for data arrival.
 */

export const palette = {
  base: "#04141d",
  panel: "#0a2432",
  raised: "#12384a",
  accent: "#38e8d0",
  calm: "#7dd3a0", // GO / LOW
  caution: "#ffb443", // CAUTION / MODERATE
  hazard: "#ff7043", // HIGH
  severe: "#ff5d5d", // NO_GO / SEVERE
  text: "#e8f4f8",
  muted: "#7a94a3",
} as const;

const alpha = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

export const colors = {
  bg: { base: palette.base, elevated: palette.panel },
  surface: {
    base: palette.panel,
    elevated: palette.raised,
    hover: palette.raised,
    subtle: palette.base,
  },
  border: {
    base: alpha(palette.text, 0.1),
    subtle: alpha(palette.text, 0.06),
    strong: alpha(palette.text, 0.18),
    accent: alpha(palette.accent, 0.35),
  },
  text: {
    primary: palette.text,
    secondary: palette.muted,
    muted: palette.muted,
    disabled: alpha(palette.muted, 0.6),
  },
  accent: {
    base: palette.accent,
    strong: palette.accent,
    soft: alpha(palette.accent, 0.12),
  },
  semantic: {
    success: palette.calm,
    warning: palette.caution,
    danger: palette.severe,
    info: palette.accent,
  },
  // Deterministic risk ramp — always paired with a label, never colour alone.
  risk: {
    low: { color: palette.calm, bg: alpha(palette.calm, 0.12), border: alpha(palette.calm, 0.3), label: "LOW" },
    moderate: { color: palette.caution, bg: alpha(palette.caution, 0.12), border: alpha(palette.caution, 0.3), label: "MODERATE" },
    high: { color: palette.hazard, bg: alpha(palette.hazard, 0.12), border: alpha(palette.hazard, 0.3), label: "HIGH" },
    severe: { color: palette.severe, bg: alpha(palette.severe, 0.12), border: alpha(palette.severe, 0.3), label: "SEVERE" },
  },
  verdict: {
    GO: palette.calm,
    CAUTION: palette.caution,
    NO_GO: palette.severe,
    NOT_APPLICABLE: palette.muted,
  },
  dataState: {
    live: { color: palette.calm, bg: alpha(palette.calm, 0.14), border: alpha(palette.calm, 0.32), label: "LIVE" },
    forecast: { color: palette.accent, bg: alpha(palette.accent, 0.14), border: alpha(palette.accent, 0.32), label: "FORECAST" },
    cached: { color: palette.muted, bg: alpha(palette.muted, 0.14), border: alpha(palette.muted, 0.32), label: "CACHED" },
    historical: { color: palette.muted, bg: alpha(palette.muted, 0.14), border: alpha(palette.muted, 0.32), label: "HISTORICAL" },
    demo: { color: palette.caution, bg: alpha(palette.caution, 0.14), border: alpha(palette.caution, 0.32), label: "DEMO" },
  },
} as const;

export const spacing = {
  "3xs": "4px",
  "2xs": "8px",
  xs: "12px",
  sm: "16px",
  md: "20px",
  lg: "24px",
  xl: "32px",
  "2xl": "40px",
  "3xl": "48px",
  "4xl": "64px",
} as const;

export const radius = {
  none: "0px",
  sm: "4px",
  md: "8px",
  lg: "12px",
  full: "9999px",
} as const;

export const typography = {
  fontFamily: {
    sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
    display: ["Outfit", "Inter", "system-ui", "sans-serif"],
    mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
  },
  styles: {
    display: { fontSize: "1.75rem", lineHeight: "2.125rem", fontWeight: "700", letterSpacing: "-0.02em" },
    heading: { fontSize: "1.25rem", lineHeight: "1.625rem", fontWeight: "600", letterSpacing: "-0.01em" },
    subheading: { fontSize: "1rem", lineHeight: "1.375rem", fontWeight: "600", letterSpacing: "normal" },
    body: { fontSize: "0.875rem", lineHeight: "1.25rem", fontWeight: "400", letterSpacing: "normal" },
    small: { fontSize: "0.75rem", lineHeight: "1rem", fontWeight: "400", letterSpacing: "0.01em" },
    caption: { fontSize: "0.6875rem", lineHeight: "0.875rem", fontWeight: "500", letterSpacing: "0.02em" },
    monoValue: {
      fontSize: "0.8125rem",
      lineHeight: "1.125rem",
      fontWeight: "500",
      fontFamily: "JetBrains Mono, ui-monospace, monospace",
      letterSpacing: "normal",
    },
    monoMeta: {
      fontSize: "0.6875rem",
      lineHeight: "0.875rem",
      fontWeight: "400",
      fontFamily: "JetBrains Mono, ui-monospace, monospace",
      letterSpacing: "0.02em",
    },
  },
} as const;

export const motion = {
  duration: { fast: "120ms", normal: "200ms", slow: "350ms" },
  easing: {
    standard: "cubic-bezier(0.2, 0, 0, 1)",
    in: "cubic-bezier(0.3, 0, 1, 1)",
    out: "cubic-bezier(0, 0, 0.2, 1)",
    inOut: "cubic-bezier(0.4, 0, 0.2, 1)",
  },
} as const;

export const zIndex = {
  base: 0,
  raised: 10,
  dropdown: 20,
  sticky: 30,
  overlay: 40,
  modal: 50,
  popover: 60,
  toast: 70,
} as const;

export const breakpoints = {
  sm: "390px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1440px",
} as const;

// Elevation = translucency + hairline. No shadows.
export const elevation = {
  level0: "bg-base",
  level1: "bg-panel/70 border border-border-base",
  level2: "bg-raised/60 border border-border-base",
  level3: "bg-raised/80 border border-border-strong",
} as const;
