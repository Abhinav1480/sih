import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Manrope, JetBrains_Mono, Noto_Sans_Telugu, Noto_Sans_Tamil, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";
import { isLang, type Lang } from "@/lib/i18n/shared";
import { Providers } from "@/components/shell/Providers";
import { Ocean } from "@/components/shell/Ocean";

const sans = Manrope({ variable: "--font-sans", subsets: ["latin", "latin-ext"], display: "swap" });
const mono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"], display: "swap" });
const telugu = Noto_Sans_Telugu({ variable: "--font-te", subsets: ["telugu"], weight: ["400", "600", "700"], display: "swap" });
const tamil = Noto_Sans_Tamil({ variable: "--font-ta", subsets: ["tamil"], weight: ["400", "600", "700"], display: "swap" });
const devanagari = Noto_Sans_Devanagari({ variable: "--font-hi", subsets: ["devanagari"], weight: ["400", "600", "700"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "ORCA", template: "%s · ORCA" },
  description: "Marine intelligence for Indian waters.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#061421" },
    { media: "(prefers-color-scheme: light)", color: "#f6f1e8" },
  ],
};

/** Applies the persisted theme before first paint so neither theme flashes. */
const THEME_INIT = `(function(){try{var t=localStorage.getItem("orca.theme");if(t!=="dark"&&t!=="light"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="dark"}})();`;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const jar = await cookies();
  const cookieLang = jar.get("orca.lang")?.value;
  const lang: Lang = isLang(cookieLang) ? cookieLang : "en";
  return (
    <html
      lang={lang}
      suppressHydrationWarning
      className={`${sans.variable} ${mono.variable} ${telugu.variable} ${tamil.variable} ${devanagari.variable} h-full`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <Ocean />
        <Providers lang={lang}>{children}</Providers>
      </body>
    </html>
  );
}
