/** @type {import('tailwindcss').Config} */
// ORCA console palette — the only ten colours. Elevation is translucency +
// 1px hairline borders; boxShadow is emptied so no shadow-* utility renders.
const palette = {
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
};

module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    screens: {
      sm: "390px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1440px",
    },
    boxShadow: { none: "none" },
    extend: {
      colors: {
        ...palette,
        bg: { base: palette.base, elevated: palette.panel },
        surface: {
          base: palette.panel,
          elevated: palette.raised,
          hover: palette.raised,
          subtle: palette.base,
        },
        border: {
          base: "rgba(232, 244, 248, 0.10)",
          subtle: "rgba(232, 244, 248, 0.06)",
          strong: "rgba(232, 244, 248, 0.18)",
          accent: "rgba(56, 232, 208, 0.35)",
        },
        text: {
          DEFAULT: palette.text,
          primary: palette.text,
          secondary: palette.muted,
          muted: palette.muted,
          disabled: "rgba(122, 148, 163, 0.6)",
        },
        accent: {
          DEFAULT: palette.accent,
          base: palette.accent,
          strong: palette.accent,
          soft: "rgba(56, 232, 208, 0.12)",
        },
        // Semantic aliases used by older components
        nominal: palette.calm,
        advisory: palette.caution,
        operational: palette.accent,

        // Backward compatibility for the orca namespace
        orca: {
          darkest: palette.base,
          dark: palette.panel,
          panel: palette.panel,
          card: palette.raised,
          cardHover: palette.raised,
          border: "rgba(232, 244, 248, 0.10)",
          borderLight: "rgba(232, 244, 248, 0.18)",
          cyan: palette.accent,
          cyanMuted: "rgba(56, 232, 208, 0.15)",
          teal: palette.accent,
          blue: palette.accent,
          green: palette.calm,
          emerald: palette.calm,
          amber: palette.caution,
          orange: palette.hazard,
          red: palette.severe,
          text: palette.text,
          muted: palette.muted,
          dim: palette.muted,
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        display: ["Outfit", "Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      spacing: {
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
      },
      borderRadius: {
        none: "0px",
        sm: "4px",
        md: "8px",
        lg: "12px",
        full: "9999px",
      },
      transitionDuration: {
        fast: "120ms",
        normal: "200ms",
        slow: "350ms",
      },
      transitionTimingFunction: {
        standard: "cubic-bezier(0.2, 0, 0, 1)",
      },
    },
  },
  plugins: [],
};
