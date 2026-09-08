import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ORCA — Marine Ecosystem Reasoning with Collaborative Agents",
  description: "Advanced Marine Intelligence & Multidisciplinary Collaborative Agent Platform for SIH 2026 PS 26176 (MoES / INCOIS / IMD).",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-orca-darkest text-orca-text antialiased min-h-screen flex flex-col selection:bg-orca-cyan selection:text-orca-darkest">
        {children}
      </body>
    </html>
  );
}
