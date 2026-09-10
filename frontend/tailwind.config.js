/** @type {import('tailwindcss').Config} */
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
    extend: {
      colors: {
        // Authoritative Semantic Tokens
        bg: {
          base: "var(--bg-base, #040914)",
          elevated: "var(--bg-elevated, #071226)",
        },
        surface: {
          base: "var(--surface-base, #0b1834)",
          elevated: "var(--surface-elevated, #0f2042)",
          hover: "var(--surface-hover, #142954)",
          subtle: "var(--surface-subtle, #081329)",
        },
        border: {
          base: "var(--border-base, #1b335e)",
          subtle: "var(--border-subtle, #122342)",
          strong: "var(--border-strong, #26457e)",
          accent: "var(--border-accent, rgba(0, 240, 208, 0.28))",
        },
        text: {
          primary: "var(--text-primary, #f8fafc)",
          secondary: "var(--text-secondary, #94a3b8)",
          muted: "var(--text-muted, #64748b)",
          disabled: "var(--text-disabled, #475569)",
        },
        accent: {
          base: "var(--accent-base, #00f0d0)",
          strong: "var(--accent-strong, #00b4d8)",
          soft: "var(--accent-soft, rgba(0, 240, 208, 0.12))",
        },
        // Semantic Alerts
        nominal: "#10b981",
        advisory: "#f59e0b",
        hazard: "#ef4444",
        operational: "#38bdf8",

        // Backward compatibility for existing orca namespace
        orca: {
          darkest: "#040914",
          dark: "#071226",
          panel: "#0b1834",
          card: "#0f2042",
          cardHover: "#142954",
          border: "#1b335e",
          borderLight: "#26457e",
          cyan: "#00f0d0",
          cyanMuted: "#00f0d026",
          teal: "#00b4d8",
          blue: "#0284c7",
          green: "#10b981",
          emerald: "#10b981",
          amber: "#f59e0b",
          red: "#ef4444",
          text: "#f8fafc",
          muted: "#94a3b8",
          dim: "#64748b",
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
      boxShadow: {
        hairline: "0 0 0 1px rgba(27, 51, 94, 0.8)",
        elevation1: "0 4px 16px -2px rgba(2, 6, 23, 0.5)",
        elevation2: "0 8px 30px -4px rgba(2, 6, 23, 0.7)",
      },
    },
  },
  plugins: [],
};
