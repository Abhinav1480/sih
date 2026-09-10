"use client";

/**
 * The active language: one value, persisted, shared by every screen.
 *
 * `t(key)` reads the design's string table for the active language, falling
 * back to English for a key that language lacks. It never returns an empty
 * string or a placeholder, and it never silently invents a translation -- a
 * missing key surfaces the English so the gap is visible on screen.
 *
 * Persisted with @capacitor/preferences on the phone and localStorage on the
 * web through lib/offline/store, so the choice survives a restart and, in the
 * shape §11 asks for, switching re-renders every string, unit and numeral in
 * one pass because everything reads the same hook.
 */

import { useCallback, useEffect, useState } from "react";
import { LANGS, S, type LangCode } from "./app";
import { EXTRA } from "./appExtra";
import { t as legacy } from "./index";
import { getJSON, setJSON } from "@/lib/offline/store";

const KEY = "orca.lang";
const DEFAULT: LangCode = "en";

type Table = Record<string, string>;
const TABLES = S as unknown as Record<string, Table>;
const EXTRAS = EXTRA as unknown as Record<string, Table>;

let current: LangCode = DEFAULT;
const listeners = new Set<(l: LangCode) => void>();
let loaded = false;

export function isLangCode(value: unknown): value is LangCode {
  return typeof value === "string" && LANGS.some((l) => l.code === value);
}

async function load(): Promise<LangCode> {
  if (loaded) return current;
  const saved = await getJSON<string>(KEY);
  if (isLangCode(saved)) current = saved;
  loaded = true;
  return current;
}

export async function setLang(next: LangCode): Promise<void> {
  current = next;
  listeners.forEach((fn) => fn(next));
  await setJSON(KEY, next);
}

export const getLang = (): LangCode => current;

/**
 * Look a key up: the design's table, then the app's extra table (states the
 * design is silent on), then the older dotted dictionaries (offline.*,
 * voice.*, geofence.*). Each falls back to English before moving on. A key
 * nobody has comes back as itself, so a gap is visible on screen.
 */
export function translate(key: string, lang: LangCode = current): string {
  for (const tables of [TABLES, EXTRAS]) {
    const hit = tables[lang]?.[key] ?? tables.en?.[key];
    if (typeof hit === "string" && hit.length > 0) return hit;
  }
  return legacy(key, lang);
}

/** Whether the design says this language has a device voice. */
export function langHasVoice(lang: LangCode): boolean {
  return LANGS.find((l) => l.code === lang)?.voice ?? false;
}

/** The language's own name, in its own script. */
export function langNative(lang: LangCode): string {
  return LANGS.find((l) => l.code === lang)?.native ?? lang;
}

export function useLang() {
  const [lang, setState] = useState<LangCode>(current);
  const [ready, setReady] = useState(loaded);

  useEffect(() => {
    listeners.add(setState);
    load().then((l) => {
      setState(l);
      setReady(true);
    });
    return () => {
      listeners.delete(setState);
    };
  }, []);

  const t = useCallback((key: string) => translate(key, lang), [lang]);

  return { lang, setLang, t, ready, hasVoice: langHasVoice(lang), native: langNative(lang) };
}
