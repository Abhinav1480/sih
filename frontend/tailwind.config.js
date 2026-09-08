/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        orca: {
          darkest: "#040814",
          dark: "#081225",
          card: "#0f1d3a",
          border: "#1e3258",
          cyan: "#00f5d4",
          teal: "#00bbf9",
          blue: "#3a86ff",
          green: "#2ec4b6",
          amber: "#f77f00",
          red: "#e63946",
          text: "#f1f5f9",
          muted: "#94a3b8",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Outfit", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 20px -5px rgba(0, 245, 212, 0.3)",
        glowAmber: "0 0 20px -5px rgba(247, 127, 0, 0.3)",
        glowRed: "0 0 20px -5px rgba(230, 57, 70, 0.3)",
      },
    },
  },
  plugins: [],
};
