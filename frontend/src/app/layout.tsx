import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ORCA — Marine Operations Console",
  description:
    "Marine EcOsystem Reasoning with Collaborative Agents. Decision support for Indian coastal waters — SIH 2026 PS 26176 (MoES / INCOIS / IMD).",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#04141d",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-base text-text antialiased h-screen overflow-hidden selection:bg-accent selection:text-base">
        {children}
      </body>
    </html>
  );
}
