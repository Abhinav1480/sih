import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Noto_Sans_Devanagari, Noto_Sans_Tamil, Noto_Sans_Telugu, Outfit } from "next/font/google";
import "./globals.css";

/**
 * Fonts are self-hosted at build time, not linked from Google.
 *
 * The design references fonts.googleapis.com. The app has to work in airplane
 * mode, and a remote stylesheet that fails to load drops every face to the
 * system default -- which breaks the one rule that matters most for perceived
 * credibility, numbers in a monospace face, on exactly the demo that matters.
 * next/font downloads each face once at build time and serves it from the
 * bundle, so the APK carries them. Same faces, same weights as the design.
 */
const outfit = Outfit({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-mono", display: "swap" });
const telugu = Noto_Sans_Telugu({ subsets: ["telugu"], weight: ["400", "600", "700"], variable: "--font-te", display: "swap" });
const tamil = Noto_Sans_Tamil({ subsets: ["tamil"], weight: ["400", "600", "700"], variable: "--font-ta", display: "swap" });
const devanagari = Noto_Sans_Devanagari({ subsets: ["devanagari"], weight: ["400", "600", "700"], variable: "--font-hi", display: "swap" });

export const metadata: Metadata = {
  title: "ORCA",
  description: "Sea safety advice for Indian coastal fishermen. SIH 2026 PS 26176.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0a4a59",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fontVars = [outfit.variable, mono.variable, telugu.variable, tamil.variable, devanagari.variable].join(" ");
  return (
    <html lang="en" className={fontVars}>
      <body className="orca-app antialiased">{children}</body>
    </html>
  );
}
