"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isNative } from "@/lib/native";
import { toBcp47 } from "./useSpeechInput";
import type { SpeakResult, UseTextToSpeech } from "./types";

const VOICES_WAIT_MS = 3000;

// The plugin touches `window` at import time, which breaks the Next static
// export prerender; load it lazily on first use (client only).
const plugin = () => import("@capacitor-community/text-to-speech").then((m) => m.TextToSpeech);

// ---- supported-language cache (module-wide, enumerated once) --------------
let supportedCache: string[] | null = null;
let enumerating: Promise<string[]> | null = null;

const norm = (tag: string) => tag.replace("_", "-").toLowerCase();

async function enumerateSupported(): Promise<string[]> {
  if (supportedCache) return supportedCache;
  if (enumerating) return enumerating;
  enumerating = (async () => {
    let langs: string[] = [];
    if (isNative()) {
      try {
        langs = (await (await plugin()).getSupportedLanguages()).languages ?? [];
      } catch (e) {
        console.error("[voice] getSupportedLanguages failed", e);
      }
      console.info("[voice] voices", langs);
    } else if (typeof speechSynthesis !== "undefined") {
      const voices = await webVoices();
      console.info("[voice] voices", voices.map((v) => `${v.lang} ${v.name}`));
      langs = Array.from(new Set(voices.map((v) => v.lang)));
    }
    // An empty list means "not loaded yet", not "no voices": don't cache it, retry next call.
    if (langs.length) supportedCache = langs;
    enumerating = null;
    return langs;
  })();
  return enumerating;
}

/**
 * Chrome's getVoices() is empty on first call; wait for `voiceschanged` (bounded).
 * Chrome on Windows only loads the voice list once something is spoken, so
 * queue an empty utterance to nudge it (verified: 3 s idle -> [], nudge -> 250 ms).
 */
function webVoices(): Promise<SpeechSynthesisVoice[]> {
  const now = speechSynthesis.getVoices();
  if (now.length) return Promise.resolve(now);
  try {
    speechSynthesis.speak(new SpeechSynthesisUtterance(""));
  } catch {
    /* nudge only */
  }
  return new Promise((resolve) => {
    const done = () => {
      speechSynthesis.removeEventListener("voiceschanged", done);
      resolve(speechSynthesis.getVoices());
    };
    speechSynthesis.addEventListener("voiceschanged", done);
    setTimeout(done, VOICES_WAIT_MS);
  });
}

/** True when some installed voice matches `tag` by language prefix (te matches te-IN). */
export function languageHasVoice(supported: string[] | null, tag: string): boolean {
  if (!supported) return false;
  const want = norm(tag);
  const bare = want.split("-")[0];
  return supported.some((s) => {
    const n = norm(s);
    return n === want || n === bare || n.split("-")[0] === bare;
  });
}

// ---- hook ------------------------------------------------------------------
/**
 * Speech output. speechSynthesis in the browser, the Capacitor plugin in the
 * Android shell. Refuses to speak (ok=false, "voice.pack.missing") when no voice
 * exists for the language — it never substitutes English.
 */
export function useSpeechOutput(lang: string): UseTextToSpeech {
  const tag = toBcp47(lang);
  const [supported, setSupported] = useState<string[] | null>(supportedCache);
  const [speaking, setSpeaking] = useState(false);
  const utter = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    let alive = true;
    enumerateSupported().then((l) => alive && setSupported(l));
    return () => {
      alive = false;
    };
  }, []);

  const hasVoice = languageHasVoice(supported, tag);

  const stop = useCallback(async () => {
    if (isNative()) await (await plugin()).stop().catch(() => {});
    else if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    utter.current = null;
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    async (text: string): Promise<SpeakResult> => {
      const supportedNow = supported ?? (await enumerateSupported());
      if (!languageHasVoice(supportedNow, tag)) return { ok: false, reasonKey: "voice.pack.missing", lang: tag };
      await stop();
      setSpeaking(true);
      try {
        if (isNative()) {
          await (await plugin()).speak({ text, lang: tag, rate: 0.9, pitch: 1.0, category: "ambient" });
          setSpeaking(false);
          return { ok: true, lang: tag };
        }
        return await new Promise<SpeakResult>((resolve) => {
          const u = new SpeechSynthesisUtterance(text);
          u.lang = tag;
          u.rate = 0.9;
          u.pitch = 1.0;
          const voices = speechSynthesis.getVoices();
          const bare = norm(tag).split("-")[0];
          const match =
            voices.find((v) => norm(v.lang) === norm(tag)) || voices.find((v) => norm(v.lang).split("-")[0] === bare);
          if (match) u.voice = match;
          u.onend = () => {
            setSpeaking(false);
            resolve({ ok: true, lang: tag });
          };
          u.onerror = (e) => {
            setSpeaking(false);
            // "interrupted"/"canceled" is our own stop(), not a failure.
            const cancelled = e.error === "interrupted" || e.error === "canceled";
            if (!cancelled) console.error("[voice] synthesis error", e.error);
            resolve({ ok: cancelled, reasonKey: cancelled ? undefined : "voice.output.error", lang: tag });
          };
          utter.current = u;
          speechSynthesis.speak(u);
        });
      } catch (e) {
        console.error("[voice] synthesis error", e);
        setSpeaking(false);
        return { ok: false, reasonKey: "voice.output.error", lang: tag };
      }
    },
    [supported, tag, stop]
  );

  useEffect(() => {
    return () => {
      void stop();
    };
  }, [stop]);

  return { speaking, supported, hasVoice, speak, stop };
}
