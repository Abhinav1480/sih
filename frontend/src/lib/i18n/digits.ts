/**
 * Numerals in the reader's script.
 *
 * Switching language must change the digits, not only the words around them:
 * a Telugu reader gets "౨.౩" for a wave height, not "2.3". The design's own
 * strings do this ("గత ౩౦ రోజులు") and `DIG` in lib/i18n/app.ts carries the
 * maps, straight from the design file.
 *
 * Only the DIGITS are transliterated. The decimal point, the minus sign and
 * the unit are left alone, and a value that is null, undefined or not a finite
 * number renders as the localised "Not measured" -- never as zero, never as a
 * dash that could be read as a value.
 *
 * Tamil, Malayalam, Kannada, Odia and Bengali have their own numerals but the
 * design does not supply maps for them and everyday usage in those scripts
 * mixes Western digits freely; they render Western digits until the design
 * says otherwise.
 */

import { DIG, NOT_MEASURED, type LangCode } from "./app";

const MAPS: Partial<Record<LangCode, string>> = DIG;

/** Transliterate the ASCII digits in `text` into the script for `lang`. */
export function localiseDigits(text: string, lang: LangCode): string {
  const map = MAPS[lang];
  if (!map) return text;
  return text.replace(/[0-9]/g, (d) => map[Number(d)] ?? d);
}

/**
 * Format a number for display in `lang`.
 *
 * `digits` is the fixed number of decimals. A non-finite value returns the
 * localised "Not measured" so a caller cannot accidentally print "0" for a
 * reading that was never taken.
 */
export function formatNumber(
  value: number | null | undefined,
  lang: LangCode,
  digits = 1
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return notMeasured(lang);
  }
  return localiseDigits(value.toFixed(digits), lang);
}

/** Integers, same contract as formatNumber. */
export function formatInt(value: number | null | undefined, lang: LangCode): string {
  return formatNumber(value, lang, 0);
}

/** The localised "Not measured", falling back to English only for the label itself. */
export function notMeasured(lang: LangCode): string {
  const table = NOT_MEASURED as Record<string, string>;
  return table[lang] ?? table.en;
}

/** A coordinate to four decimals with its hemisphere letter, digits localised. */
export function formatCoordinate(
  value: number | null | undefined,
  axis: "lat" | "lon",
  lang: LangCode
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return notMeasured(lang);
  }
  const hemi = axis === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";
  return `${localiseDigits(Math.abs(value).toFixed(4), lang)}° ${hemi}`;
}

/** A clock time (HH:MM) with localised digits. */
export function formatClock(date: Date, lang: LangCode): string {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return localiseDigits(`${hh}:${mm}`, lang);
}
