/**
 * The one place a verdict or a risk band becomes something a person reads.
 *
 * **Keyed lookup only.** Nothing here compares a number. The API decides the
 * verdict (`answer.verdict`) and the band (`risk.band`); this maps those exact
 * strings to wording and to a colour. It never inspects `risk.score`, never
 * asks whether a wave height is large, and never decides safe versus unsafe.
 * That is `calculate_marine_risk`'s job and it has already been done by the
 * time a response reaches this file.
 *
 * **A verdict with no wording shows the raw verdict.** Not the nearest milder
 * sentence -- that is the failure that matters. Rendering a `NO_GO` with
 * CAUTION wording, because CAUTION happens to be the closest string available,
 * would tell someone the sea is survivable when the engine said it is not.
 * `NO_GO` on screen in red is ugly and unmistakable; "CAUTION" in its place is
 * neat and potentially fatal. The design supplies wording for GO and CAUTION
 * in four languages and for nothing else, so everything else falls through
 * here, deliberately and visibly.
 */

import { S, TIER_WORD, type LangCode } from "@/lib/i18n/app";

/** Verdicts the contract can send. See docs/API_CONTRACT.md. */
export type Verdict = "GO" | "CAUTION" | "NO_GO" | "NOT_APPLICABLE";

/** Bands the contract can send. */
export type Band = "LOW" | "MODERATE" | "HIGH" | "SEVERE";

/**
 * The design's four-stop severity ramp, keyed on the band the API sent.
 *
 * `word` is the English fallback shown only when the active language has no
 * translation; `hex` is the design's own colour. Colour is never used alone --
 * every call site pairs it with this word and an icon, because several judges
 * and some fishermen are colour blind.
 */
export const BAND_RAMP: Record<Band, { hex: string; word: string; icon: BandIcon }> = {
  LOW: { hex: "#1f7a4c", word: "SAFE", icon: "check" },
  MODERATE: { hex: "#d9931b", word: "CAUTION", icon: "alert" },
  HIGH: { hex: "#d4541f", word: "ROUGH", icon: "alert" },
  SEVERE: { hex: "#c62828", word: "DO NOT GO", icon: "stop" },
};

export type BandIcon = "check" | "alert" | "stop" | "unknown";

/** Neutral treatment for a band the design has no ramp stop for. */
const UNKNOWN_BAND = { hex: "#5a7480", word: "", icon: "unknown" as BandIcon };

/**
 * Localised verdict wording, from the design file.
 *
 * The design carries `go` and `caution` in four languages and no others, so
 * this map is deliberately sparse. Filling the gaps by translating them here
 * would be inventing safety wording, which is exactly what this codebase spent
 * two phases removing.
 */
function designVerdictWord(lang: LangCode, verdict: Verdict): string | null {
  const table = (S as Record<string, Record<string, string>>)[lang];
  if (!table) return null;
  if (verdict === "GO" && table.go) return table.go;
  if (verdict === "CAUTION" && table.caution) return table.caution;
  return null;
}

export interface VerdictPresentation {
  /** What to print. Either localised wording, or the API's raw verdict. */
  word: string;
  /** True when `word` is the raw API value because no wording exists. */
  isRaw: boolean;
  /** Colour and icon, from the band the API sent. */
  hex: string;
  icon: BandIcon;
  /** The band's own word, for pairing with colour when the verdict is raw. */
  bandWord: string;
}

/**
 * How to render a verdict, given the verdict and band the API actually sent.
 *
 * Pass them through untouched. `verdict` may be absent (a clarification
 * carries none) and `band` may be absent (`risk` is null on a clarification),
 * and both cases render as unavailable rather than as anything reassuring.
 */
export function verdictPresentation(
  verdict: string | null | undefined,
  band: string | null | undefined,
  lang: LangCode
): VerdictPresentation | null {
  if (!verdict) return null;

  const ramp = band && band in BAND_RAMP ? BAND_RAMP[band as Band] : UNKNOWN_BAND;
  const localised = designVerdictWord(lang, verdict as Verdict);

  return {
    word: localised ?? verdict,
    isRaw: localised === null,
    hex: ramp.hex,
    icon: ramp.icon,
    bandWord: ramp.word,
  };
}

/**
 * The plain-language rendering of a provenance tier.
 *
 * Keyed on `evidence[].provider_tier` exactly as the API sent it. An unknown
 * or absent tier is never upgraded and never quietly defaulted: it returns
 * null, and the call site shows "source unavailable".
 */
export function tierWord(tier: string | null | undefined, lang: LangCode): string | null {
  if (!tier) return null;
  const key = { ISRO: "A", NATIONAL: "B", FALLBACK: "C" }[tier];
  if (!key) return null;
  const table = (TIER_WORD as Record<string, Record<string, string>>)[lang]
    ?? (TIER_WORD as Record<string, Record<string, string>>).en;
  return table?.[key] ?? null;
}

/** Visual weight for a tier badge. ISRO is distinct; nothing is upgraded. */
export const TIER_STYLE: Record<string, { hex: string; bg: string; border: string }> = {
  ISRO: { hex: "#0a4a59", bg: "#dfeef3", border: "#a8ccd6" },
  NATIONAL: { hex: "#4d6b76", bg: "#eef4f5", border: "#cfdde2" },
  FALLBACK: { hex: "#8a5600", bg: "#fdf3e2", border: "#ecd3a3" },
};
