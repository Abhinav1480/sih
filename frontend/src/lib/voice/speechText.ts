/**
 * Spoken text is NOT screen text. Builds the TTS string from the envelope:
 * verdict first, then at most two numbers, then one instruction — three
 * sentences maximum. Never provenance, timestamps, tiers or the narrative.
 * Every string comes from src/lib/i18n/voice.ts.
 */
import { t } from "@/lib/i18n";
import type { OrcaAnalysisResponse } from "@/lib/types";
import { numberToWords } from "./numberWords";

/** Languages with real spoken templates; the rest fall back to `en`. */
export const SPOKEN_LANGS = ["en", "te", "hi", "ta"] as const;

export interface SpokenText {
  text: string;
  /** Language the templates (and the TTS voice) should use. */
  lang: string;
  /** True when the requested language had no templates and `en` was used. */
  fellBack: boolean;
}

const leadingNumber = (v?: string | number | null): number | undefined => {
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  const m = /-?\d+(\.\d+)?/.exec(String(v ?? ""));
  return m ? Number(m[0]) : undefined;
};

/** Leading number of the risk factor whose name starts with `prefix` ("2.5 m" -> 2.5). */
function factorNumber(a: OrcaAnalysisResponse, prefix: string): number | undefined {
  const factors = a.risk?.factors ?? a.risk_assessment?.contributing_factors ?? [];
  const f = factors.find((x) => (x.name || "").startsWith(prefix));
  return f ? leadingNumber(f.raw_value ?? f.value) : undefined;
}

export function buildSpokenText(analysis: OrcaAnalysisResponse, lang: string): SpokenText {
  const code = (SPOKEN_LANGS as readonly string[]).includes(lang) ? lang : "en";
  const out: string[] = [];

  // 1. Verdict (band when the verdict does not apply; never from prose).
  const verdict = analysis.answer?.verdict;
  const band = analysis.risk?.band ?? analysis.risk_assessment?.category;
  if (verdict && verdict !== "NOT_APPLICABLE") out.push(t(`voice.spoken.${verdict}`, code));
  else if (band) out.push(t(`voice.spoken.band.${band}`, code));
  else out.push(t("voice.spoken.NOT_APPLICABLE", code));

  // 2. At most two numbers: SWH and wind, from risk.factors (legacy fields as fallback).
  const wave = factorNumber(analysis, "Significant Wave Height") ?? analysis.ocean_conditions?.significant_wave_height_m;
  const wind = factorNumber(analysis, "Wind Speed") ?? analysis.weather_conditions?.wind_speed_knots;
  const w = wave !== undefined ? numberToWords(wave, code) : "";
  const k = wind !== undefined ? numberToWords(Math.round(wind), code) : "";
  if (w && k) out.push(t("voice.spoken.wavesWind", code, { w, k }));
  else if (w) out.push(t("voice.spoken.waves", code, { w }));
  else if (k) out.push(t("voice.spoken.wind", code, { k }));

  // 3. One instruction: return before the end of the temporal window.
  const end = analysis.meta?.temporal?.end_time ?? analysis.temporal?.end_time;
  const d = end ? new Date(end) : null;
  // ponytail: backend stamps IST wall-clock as Z (label "05:00 - 11:00" <-> end_time 11:00Z),
  // so the UTC hour is the one the label means. Switch to getHours() once it emits real offsets.
  if (d && !isNaN(d.getTime())) out.push(t("voice.spoken.returnBy", code, { h: numberToWords(d.getUTCHours(), code) }));

  return { text: out.join(" "), lang: code, fellBack: code !== lang };
}

/** Runtime self-check against a real envelope shape. Throws on the first mismatch. */
export function selfCheckSpokenText(): void {
  const sample = {
    answer: { verdict: "CAUTION" },
    risk: {
      band: "MODERATE",
      factors: [
        { name: "Significant Wave Height (SWH)", value: "2.5 m" },
        { name: "Wind Speed", value: "21.9 kt (40.6 km/h)" },
        { name: "Swell Height", value: "2.1 m (Period: 11.0s)" },
      ],
    },
    meta: { temporal: { end_time: "2026-09-11T11:00:00Z" } },
  } as unknown as OrcaAnalysisResponse;
  const en = buildSpokenText(sample, "en");
  const want = "Go with caution. Waves two point five metres, wind twenty-two knots. Return before eleven.";
  if (en.text !== want) throw new Error(`en: "${en.text}"`);
  if (en.text.split(/(?<=\.)\s/).length !== 3) throw new Error("en: not three sentences");
  const ml = buildSpokenText(sample, "ml");
  if (!ml.fellBack || ml.lang !== "en") throw new Error("ml should fall back to en");
  const te = buildSpokenText(sample, "te");
  if (te.fellBack || !te.text.startsWith("జాగ్రత్తగా వెళ్ళండి.")) throw new Error(`te: "${te.text}"`);
  const bare = buildSpokenText({} as OrcaAnalysisResponse, "hi");
  if (bare.text !== "इस सवाल के लिए जाने या न जाने का निर्णय नहीं है।") throw new Error(`hi empty: "${bare.text}"`);
  console.log("[voice] speechText self-check ok");
}
