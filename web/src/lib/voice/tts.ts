/**
 * Speech output. The only module that constructs a SpeechSynthesisUtterance,
 * and it accepts only a SpokenScript from buildSpokenScript, never free text.
 *
 * Voices are enumerated after `voiceschanged` and matched by language
 * prefix. If no voice exists for the language, nothing is spoken and the
 * caller is told, so the UI shows large readable text instead of speaking
 * English at a Telugu reader. Rate 0.9, pitch 1.0, no stylisation.
 */
import type { SpokenScript } from "@/lib/spoken/buildSpokenScript";

const TAG: Record<string, string> = { en: "en-IN", te: "te-IN", ta: "ta-IN", hi: "hi-IN" };

export function ttsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

let voicesPromise: Promise<SpeechSynthesisVoice[]> | null = null;

/**
 * Resolves once the engine has reported its voices. Some engines answer an
 * empty list for a while after load, so an empty result is never cached:
 * the next call asks again, polling for up to about three seconds.
 */
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!ttsSupported()) return Promise.resolve([]);
  const have = speechSynthesis.getVoices();
  if (have.length) return Promise.resolve(have);
  if (voicesPromise) return voicesPromise;
  voicesPromise = new Promise((resolve) => {
    let tries = 0;
    let done = false;
    const finish = () => {
      if (done) return;
      const v = speechSynthesis.getVoices();
      if (v.length || tries >= 12) {
        done = true;
        voicesPromise = null;
        resolve(v);
        return;
      }
      tries++;
      setTimeout(finish, 250);
    };
    speechSynthesis.addEventListener("voiceschanged", finish, { once: true });
    setTimeout(finish, 250);
  });
  return voicesPromise;
}

export function voiceFor(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | null {
  const tag = TAG[lang] ?? lang;
  const prefix = tag.split("-")[0].toLowerCase();
  const exact = voices.find((v) => v.lang.toLowerCase() === tag.toLowerCase());
  if (exact) return exact;
  const byPrefix = voices.filter((v) => v.lang.toLowerCase().split(/[-_]/)[0] === prefix);
  return byPrefix.find((v) => v.localService) ?? byPrefix[0] ?? null;
}

export interface SpeakHandlers {
  onSentence?: (index: number) => void;
  onWord?: (index: number, charIndex: number, charLength: number) => void;
  onEnd?: () => void;
  onError?: (reason: string) => void;
}

export interface SpeakHandle {
  cancel: () => void;
}

export type SpeakOutcome = { ok: true; handle: SpeakHandle; voice: SpeechSynthesisVoice } | { ok: false; reason: "unsupported" | "no_voice" };

/** Speak a script sentence by sentence so the active sentence can be highlighted. */
export async function speakScript(script: SpokenScript, handlers: SpeakHandlers = {}): Promise<SpeakOutcome> {
  if (!ttsSupported()) return { ok: false, reason: "unsupported" };
  const voices = await loadVoices();
  const voice = voiceFor(voices, script.lang);
  if (!voice) return { ok: false, reason: "no_voice" };

  speechSynthesis.cancel();
  let cancelled = false;
  let i = 0;

  const next = () => {
    if (cancelled) return;
    if (i >= script.sentences.length) {
      handlers.onEnd?.();
      return;
    }
    const idx = i++;
    const u = new SpeechSynthesisUtterance(script.sentences[idx].text);
    u.voice = voice;
    u.lang = voice.lang;
    u.rate = 0.9;
    u.pitch = 1.0;
    u.onstart = () => handlers.onSentence?.(idx);
    u.onboundary = (e) => {
      if (e.name === "word") handlers.onWord?.(idx, e.charIndex, e.charLength ?? 0);
    };
    u.onend = () => next();
    u.onerror = (e) => {
      if (cancelled || e.error === "interrupted" || e.error === "canceled") return;
      handlers.onError?.(e.error);
    };
    speechSynthesis.speak(u);
  };
  next();

  return {
    ok: true,
    voice,
    handle: {
      cancel: () => {
        cancelled = true;
        speechSynthesis.cancel();
      },
    },
  };
}
