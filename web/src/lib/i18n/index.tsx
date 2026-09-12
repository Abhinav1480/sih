"use client";

/**
 * Locale runtime. Four languages, each shown in its own script. Switching
 * re-renders every string and every numeral immediately: components read
 * strings through `useT()` and numbers through `useFmt()`, both of which
 * subscribe to the language context.
 *
 * Telugu and Hindi numerals come from Intl's native numbering systems (telu,
 * deva). Tamil keeps Western digits, following the app design: everyday Tamil
 * usage mixes them freely. Raw strings the API sends (a value like
 * "24.0 kt (Gusts: 32.4 kt)") are transliterated digit by digit with the same
 * maps, and only the digits change.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { en, type StringKey } from "./en";
import { te } from "./te";
import { ta } from "./ta";
import { hi } from "./hi";
import { LANGS, LOCALE_TAG, isLang, type Lang } from "./shared";

export type { StringKey, Lang };
export { LANGS, LOCALE_TAG, isLang };

const TABLES: Record<Lang, Record<StringKey, string>> = { en, te, ta, hi };

/** Numbering system per language; Tamil deliberately stays Latin. */
const NUMBERING: Partial<Record<Lang, string>> = { te: "telu", hi: "deva" };
const DIGITS: Partial<Record<Lang, string>> = { te: "౦౧౨౩౪౫౬౭౮౯", hi: "०१२३४५६७८९" };

export function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

export function translate(lang: Lang, key: StringKey, vars?: Record<string, string | number>): string {
  const table = TABLES[lang] ?? TABLES.en;
  const s = table[key] ?? TABLES.en[key] ?? key;
  return interpolate(s, vars);
}

/** Transliterate ASCII digits inside an arbitrary string. Nothing else changes. */
export function localiseDigits(text: string, lang: Lang): string {
  const map = DIGITS[lang];
  if (!map) return text;
  return text.replace(/[0-9]/g, (d) => map[Number(d)]);
}

export interface Fmt {
  /** A number to `digits` decimals in the reader's numerals; null or NaN renders the localised "Not measured". */
  num(value: number | null | undefined, digits?: number): string;
  /** Integer, same contract. */
  int(value: number | null | undefined): string;
  /** Digits in an API string transliterated; the string is otherwise untouched. */
  raw(text: string | null | undefined): string;
  /** A date-time in the reader's locale and numerals; invalid input renders "Unavailable". */
  dateTime(iso: string | null | undefined, opts?: Intl.DateTimeFormatOptions): string;
  /** Time only. */
  time(iso: string | null | undefined): string;
  /** Relative to now ("5 minutes ago"). */
  relative(iso: string | null | undefined): string;
  /** A coordinate to four decimals with its hemisphere letter. */
  coord(value: number | null | undefined, axis: "lat" | "lon"): string;
}

export function makeFmt(lang: Lang): Fmt {
  const tag = LOCALE_TAG[lang];
  const nu = NUMBERING[lang];
  const numberLocale = nu ? `${tag}-u-nu-${nu}` : tag;
  const notMeasured = translate(lang, "common.notMeasured");
  const unavailable = translate(lang, "common.unavailable");
  const numCache = new Map<number, Intl.NumberFormat>();
  const nf = (digits: number) => {
    let f = numCache.get(digits);
    if (!f) {
      f = new Intl.NumberFormat(numberLocale, { minimumFractionDigits: digits, maximumFractionDigits: digits, useGrouping: false });
      numCache.set(digits, f);
    }
    return f;
  };
  const dtf = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(numberLocale, opts);
  const rtf = new Intl.RelativeTimeFormat(numberLocale, { numeric: "auto" });
  const parse = (iso: string | null | undefined): Date | null => {
    if (!iso) return null;
    const d = new Date(iso);
    return Number.isFinite(d.getTime()) ? d : null;
  };
  return {
    num(value, digits = 1) {
      if (value === null || value === undefined || !Number.isFinite(value)) return notMeasured;
      return nf(digits).format(value);
    },
    int(value) {
      return this.num(value, 0);
    },
    raw(text) {
      if (text === null || text === undefined || text === "") return unavailable;
      return localiseDigits(text, lang);
    },
    dateTime(iso, opts) {
      const d = parse(iso);
      if (!d) return unavailable;
      return dtf(opts ?? { dateStyle: "medium", timeStyle: "short" }).format(d);
    },
    time(iso) {
      const d = parse(iso);
      if (!d) return unavailable;
      return dtf({ hour: "2-digit", minute: "2-digit" }).format(d);
    },
    relative(iso) {
      const d = parse(iso);
      if (!d) return unavailable;
      const diffMin = Math.round((d.getTime() - Date.now()) / 60000);
      if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
      const diffH = Math.round(diffMin / 60);
      if (Math.abs(diffH) < 48) return rtf.format(diffH, "hour");
      return rtf.format(Math.round(diffH / 24), "day");
    },
    coord(value, axis) {
      if (value === null || value === undefined || !Number.isFinite(value)) return notMeasured;
      const hemi = axis === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";
      return `${nf(4).format(Math.abs(value))}° ${hemi}`;
    },
  };
}

// --- context -------------------------------------------------------------------

const STORAGE_KEY = "orca.lang";

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
}

const Ctx = createContext<LangCtx>({ lang: "en", setLang: () => {} });

export function readStoredLang(): Lang | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return isLang(v) ? v : null;
  } catch {
    return null;
  }
}

export function LangProvider({ initial, children }: { initial: Lang; children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initial);
  useEffect(() => {
    document.documentElement.lang = LOCALE_TAG[lang];
  }, [lang]);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
      document.cookie = `orca.lang=${l}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      /* storage may be unavailable; the choice still applies for this page */
    }
  }, []);
  const value = useMemo(() => ({ lang, setLang }), [lang, setLang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang(): LangCtx {
  return useContext(Ctx);
}

export type T = (key: StringKey, vars?: Record<string, string | number>) => string;

export function useT(): T {
  const { lang } = useContext(Ctx);
  return useCallback((key: StringKey, vars?: Record<string, string | number>) => translate(lang, key, vars), [lang]);
}

export function useFmt(): Fmt {
  const { lang } = useContext(Ctx);
  return useMemo(() => makeFmt(lang), [lang]);
}
