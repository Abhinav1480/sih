/**
 * Locale constants safe to import from server components: no React, no
 * "use client". The runtime (context, hooks, formatting) lives in index.tsx.
 */
export type Lang = "en" | "te" | "ta" | "hi";
export const LANGS: readonly Lang[] = ["en", "te", "ta", "hi"];

/** BCP-47 tags for Intl, speech recognition and speech synthesis. */
export const LOCALE_TAG: Record<Lang, string> = {
  en: "en-IN", te: "te-IN", ta: "ta-IN", hi: "hi-IN",
};

export function isLang(x: unknown): x is Lang {
  return typeof x === "string" && (LANGS as readonly string[]).includes(x);
}
