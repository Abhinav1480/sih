/**
 * ORCA Design System — Authoritative Design Tokens
 * SIH 2026 PS 26176 Marine Intelligence Platform
 *
 * Theme Archetype: Maritime Operations Console + Mission Control + Marine GIS
 * Design Qualities: Clean, Technical, Calm, Premium, High Information-Density
 */

export const colors = {
  // Backgrounds
  bg: {
    base: "#040914",      // Deepest abyssal navy
    elevated: "#071226",  // Elevated console backdrop
  },

  // Surfaces & Containment
  surface: {
    base: "#0b1834",      // Standard operational panel surface
    elevated: "#0f2042",  // Interactive or raised panel surface
    hover: "#142954",     // Surface hover state
    subtle: "#081329",    // Recessed or inset container
  },

  // Hairline Borders & Dividers
  border: {
    base: "#1b335e",      // Standard hairline structural divider
    subtle: "#122342",    // Whisper-subtle section separator
    strong: "#26457e",    // Active or emphasized border
    accent: "rgba(0, 240, 208, 0.28)", // Maritime cyan accent border
  },

  // Hierarchy Typography Colors
  text: {
    primary: "#f8fafc",   // Pure legible contrast
    secondary: "#94a3b8", // Descriptive telemetry & metadata
    muted: "#64748b",     // Inactive hints & subtle labels
    disabled: "#475569",  // Disabled state text
  },

  // ORCA Maritime Brand Accents
  accent: {
    base: "#00f0d0",      // Marine bioluminescent cyan
    strong: "#00b4d8",    // Ocean deep teal
    soft: "rgba(0, 240, 208, 0.12)", // Translucent cyan tint
  },

  // Standard Semantic Feedback
  semantic: {
    success: "#10b981",   // Nominal green
    warning: "#f59e0b",   // Advisory amber
    danger: "#ef4444",    // Hazard red
    info: "#38bdf8",      // Operational sky blue
  },

  // Deterministic Marine Risk Ramp (Paired with labels/icons, never color alone)
  risk: {
    low: {
      color: "#10b981",
      bg: "rgba(16, 185, 129, 0.12)",
      border: "rgba(16, 185, 129, 0.30)",
      label: "LOW",
    },
    moderate: {
      color: "#f59e0b",
      bg: "rgba(245, 158, 11, 0.12)",
      border: "rgba(245, 158, 11, 0.30)",
      label: "MODERATE",
    },
    high: {
      color: "#f97316",
      bg: "rgba(249, 115, 22, 0.12)",
      border: "rgba(249, 115, 22, 0.30)",
      label: "HIGH",
    },
    severe: {
      color: "#ef4444",
      bg: "rgba(239, 68, 68, 0.12)",
      border: "rgba(239, 68, 68, 0.30)",
      label: "SEVERE",
    },
  },

  // Authoritative Data Freshness States
  dataState: {
    live: {
      color: "#10b981",
      bg: "rgba(16, 185, 129, 0.14)",
      border: "rgba(16, 185, 129, 0.32)",
      label: "LIVE",
    },
    forecast: {
      color: "#00b4d8",
      bg: "rgba(0, 180, 216, 0.14)",
      border: "rgba(0, 180, 216, 0.32)",
      label: "FORECAST",
    },
    cached: {
      color: "#a855f7",
      bg: "rgba(168, 85, 247, 0.14)",
      border: "rgba(168, 85, 247, 0.32)",
      label: "CACHED",
    },
    historical: {
      color: "#64748b",
      bg: "rgba(100, 116, 139, 0.14)",
      border: "rgba(100, 116, 139, 0.32)",
      label: "HISTORICAL",
    },
    demo: {
      color: "#eab308",
      bg: "rgba(234, 179, 8, 0.14)",
      border: "rgba(234, 179, 8, 0.32)",
      label: "DEMO",
    },
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
    display: {
      fontSize: "1.75rem",    // 28px
      lineHeight: "2.125rem", // 34px
      fontWeight: "700",
      letterSpacing: "-0.02em",
    },
    heading: {
      fontSize: "1.25rem",    // 20px
      lineHeight: "1.625rem", // 26px
      fontWeight: "600",
      letterSpacing: "-0.01em",
    },
    subheading: {
      fontSize: "1rem",       // 16px
      lineHeight: "1.375rem", // 22px
      fontWeight: "600",
      letterSpacing: "normal",
    },
    body: {
      fontSize: "0.875rem",   // 14px
      lineHeight: "1.25rem",  // 20px
      fontWeight: "400",
      letterSpacing: "normal",
    },
    small: {
      fontSize: "0.75rem",    // 12px
      lineHeight: "1rem",     // 16px
      fontWeight: "400",
      letterSpacing: "0.01em",
    },
    caption: {
      fontSize: "0.6875rem",  // 11px
      lineHeight: "0.875rem", // 14px
      fontWeight: "500",
      letterSpacing: "0.02em",
    },
    monoValue: {
      fontSize: "0.8125rem",  // 13px
      lineHeight: "1.125rem", // 18px
      fontWeight: "500",
      fontFamily: "JetBrains Mono, ui-monospace, monospace",
      letterSpacing: "normal",
    },
    monoMeta: {
      fontSize: "0.6875rem",  // 11px
      lineHeight: "0.875rem", // 14px
      fontWeight: "400",
      fontFamily: "JetBrains Mono, ui-monospace, monospace",
      letterSpacing: "0.02em",
    },
  },
} as const;

export const motion = {
  duration: {
    fast: "120ms",
    normal: "200ms",
    slow: "350ms",
  },
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
  sm: "390px",   // Mobile coastal handheld
  md: "768px",   // Console split view
  lg: "1024px",  // Tablet landscape / compact terminal
  xl: "1280px",  // Standard marine workstation
  "2xl": "1440px", // Full mission control console
} as const;

export const elevation = {
  level0: "bg-[#040914]",
  level1: "bg-[#0b1834] border border-[#1b335e]",
  level2: "bg-[#0f2042] border border-[#1b335e]",
  level3: "bg-[#0f2042] border border-[#26457e]",
} as const;
