"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PluginListenerHandle } from "@capacitor/core";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";
import { isNative } from "@/lib/native";
import { t } from "@/lib/i18n";
import type { SttState, UseSpeechToText, UseSpeechToTextOptions } from "./types";

/** ORCA language code -> BCP-47 tag for recognizers and synthesizers. */
export const BCP47: Record<string, string> = {
  en: "en-IN",
  te: "te-IN",
  hi: "hi-IN",
  ta: "ta-IN",
  ml: "ml-IN",
  kn: "kn-IN",
  bn: "bn-IN",
  mr: "mr-IN",
  gu: "gu-IN",
  or: "or-IN",
};
export const toBcp47 = (lang: string): string => BCP47[lang] ?? "en-IN";

const NO_RESULT_TIMEOUT_MS = 10_000;
/** After the recognizer reports end-of-speech, wait this long for the final partial. */
const SETTLE_MS = 1200;
// ponytail: the Android recognizer and a WebView getUserMedia stream can fight over the
// mic on Android 10+, so native animates a pseudo level. Flip to true to use the analyser there.
const USE_MIC_LEVEL_ON_NATIVE = false;

type WebRecognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

const webRecognitionCtor = (): (new () => WebRecognition) | undefined =>
  typeof window === "undefined"
    ? undefined
    : (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

/** Web Speech error code -> [state, i18n key]. Anything unlisted is a generic error. */
const WEB_ERRORS: Record<string, [SttState, string]> = {
  "not-allowed": ["denied", "voice.input.denied"],
  "service-not-allowed": ["denied", "voice.input.denied"],
  "no-speech": ["nomatch", "voice.input.nomatch"],
  aborted: ["nomatch", "voice.input.aborted"],
  "audio-capture": ["error", "voice.input.audioCapture"],
  network: ["error", "voice.input.network"],
};

/**
 * Speech input. Web Speech API in the browser (Chrome/Edge/Safari), the
 * Capacitor plugin inside the Android shell. The final transcript is delivered
 * once through `onFinal` so it enters the same query pipeline as typed text.
 */
export function useSpeechInput(opts: UseSpeechToTextOptions): UseSpeechToText {
  const { lang, onFinal, onPartial } = opts;
  const [state, setState] = useState<SttState>("idle");
  const [level, setLevel] = useState(0);
  const [partial, setPartial] = useState("");
  const [messageKey, setMessageKey] = useState("");

  // Latest callbacks/lang without re-subscribing.
  const cb = useRef({ onFinal, onPartial, lang });
  cb.current = { onFinal, onPartial, lang };

  const lastText = useRef("");
  const finalized = useRef(true);
  const timers = useRef<number[]>([]);
  const nativeHandles = useRef<PluginListenerHandle[]>([]);
  const webRec = useRef<WebRecognition | null>(null);
  const audio = useRef<{ ctx: AudioContext; stream: MediaStream; raf: number } | null>(null);
  const pseudoRaf = useRef(0);

  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };
  const after = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const fail = (s: SttState, key: string) => {
    setState(s);
    setMessageKey(key);
  };

  // ---- audio level --------------------------------------------------------
  const stopLevel = () => {
    if (audio.current) {
      cancelAnimationFrame(audio.current.raf);
      audio.current.stream.getTracks().forEach((tr) => tr.stop());
      audio.current.ctx.close().catch(() => {});
      audio.current = null;
    }
    cancelAnimationFrame(pseudoRaf.current);
    setLevel(0);
  };

  const startPseudoLevel = () => {
    const tick = () => {
      const tm = performance.now() / 1000;
      setLevel(0.35 + 0.25 * Math.sin(tm * 6) + 0.15 * Math.sin(tm * 13 + 1));
      pseudoRaf.current = requestAnimationFrame(tick);
    };
    tick();
  };

  /** Real mic level from an AnalyserNode on getUserMedia; pseudo level only if that fails. */
  const startLevel = async () => {
    const canAnalyse =
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof AudioContext !== "undefined" &&
      (!isNative() || USE_MIC_LEVEL_ON_NATIVE);
    if (!canAnalyse) return startPseudoLevel();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const entry = { ctx, stream, raf: 0 };
      audio.current = entry;
      const tick = () => {
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        setLevel(Math.min(1, Math.sqrt(sum / buf.length) * 4));
        entry.raf = requestAnimationFrame(tick);
      };
      tick();
    } catch (e) {
      console.error("[voice] mic level unavailable", e);
      startPseudoLevel();
    }
  };

  // ---- teardown -----------------------------------------------------------
  const teardown = async () => {
    clearTimers();
    stopLevel();
    if (webRec.current) {
      try {
        webRec.current.onresult = webRec.current.onerror = webRec.current.onend = null;
        webRec.current.abort();
      } catch {
        /* already stopped */
      }
      webRec.current = null;
    }
    if (nativeHandles.current.length) {
      const hs = nativeHandles.current;
      nativeHandles.current = [];
      await Promise.all(hs.map((h) => h.remove().catch(() => {})));
      await SpeechRecognition.stop().catch(() => {});
    }
  };

  /** Deliver the final text exactly once, or report no match. */
  const finalize = (text: string) => {
    if (finalized.current) return;
    finalized.current = true;
    void teardown();
    const clean = text.trim();
    if (!clean) return fail("nomatch", "voice.input.nomatch");
    setPartial("");
    setState("idle");
    setMessageKey("");
    cb.current.onFinal(clean);
  };

  const gotPartial = (text: string) => {
    lastText.current = text;
    setPartial(text);
    cb.current.onPartial?.(text);
    clearTimers();
    after(NO_RESULT_TIMEOUT_MS, () => finalize(lastText.current));
  };

  // ---- listening ----------------------------------------------------------
  const beginCommon = () => {
    lastText.current = "";
    finalized.current = false;
    setPartial("");
    setMessageKey("");
    setState("listening");
    after(NO_RESULT_TIMEOUT_MS, () => finalize(lastText.current));
    void startLevel();
  };

  const listenNative = async () => {
    beginCommon();
    try {
      nativeHandles.current = await Promise.all([
        SpeechRecognition.addListener("partialResults", (d) => {
          const m = d?.matches?.[0];
          if (m) gotPartial(m);
        }),
        SpeechRecognition.addListener("listeningState", (d) => {
          if (d?.status !== "stopped") return;
          setState((s) => (s === "listening" ? "processing" : s));
          // The recognizer's onResults lands shortly after end-of-speech.
          after(SETTLE_MS, () => finalize(lastText.current));
        }),
      ]);
      await SpeechRecognition.start({
        language: toBcp47(cb.current.lang),
        maxResults: 1,
        partialResults: true,
        popup: false,
      });
    } catch (e) {
      finalized.current = true;
      await teardown();
      fail("error", "voice.input.error");
      console.error("[voice] recognition error", e);
    }
  };

  const listenWeb = () => {
    const Ctor = webRecognitionCtor();
    if (!Ctor) return fail("unavailable", "voice.input.unavailable");
    if (!window.isSecureContext) return fail("unavailable", "voice.input.insecure");
    let rec: WebRecognition;
    try {
      rec = new Ctor();
    } catch (e) {
      console.error("[voice] recognition error", e);
      return fail("error", "voice.input.error");
    }
    // Language is set from the app selector before every start.
    rec.lang = toBcp47(cb.current.lang);
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.continuous = false;
    rec.onresult = (e: any) => {
      let text = "";
      let isFinal = false;
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i][0]?.transcript ?? "";
        if (e.results[i].isFinal) isFinal = true;
      }
      if (isFinal) return finalize(text);
      gotPartial(text);
    };
    rec.onerror = (e: any) => {
      const err: string = e?.error ?? "unknown";
      console.error("[voice] recognition error", err);
      finalized.current = true;
      void teardown();
      const [s, key] = WEB_ERRORS[err] ?? ["error", "voice.input.error"];
      fail(s, key);
    };
    rec.onend = () => {
      // Ended without a final result: use whatever we heard.
      if (!finalized.current) finalize(lastText.current);
    };
    webRec.current = rec;
    beginCommon();
    try {
      rec.start();
    } catch (e) {
      console.error("[voice] recognition error", e);
      finalized.current = true;
      void teardown();
      fail("error", "voice.input.error");
    }
  };

  // ---- public API ---------------------------------------------------------
  const stop = useCallback(async () => {
    if (finalized.current && state !== "requesting") return;
    finalized.current = true;
    await teardown();
    setPartial("");
    setState("idle");
    setMessageKey("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const start = useCallback(async () => {
    if (state === "listening" || state === "processing") {
      // Tap again = done talking; hand over what we have.
      finalize(lastText.current);
      return;
    }
    if (!isNative()) return listenWeb();
    const avail = await SpeechRecognition.available().catch(() => ({ available: false }));
    if (!avail.available) return fail("unavailable", "voice.input.unavailable");
    const perm = await SpeechRecognition.checkPermissions().catch(() => null);
    if (perm?.speechRecognition === "granted") return listenNative();
    if (state !== "requesting") {
      // First tap explains why the OS dialog is about to appear; second tap requests.
      setState("requesting");
      setMessageKey("voice.permission.explain");
      return;
    }
    const req = await SpeechRecognition.requestPermissions().catch(() => null);
    if (req?.speechRecognition !== "granted") return fail("denied", "voice.input.denied");
    return listenNative();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Say up front (before any tap) when the browser cannot do voice at all.
  useEffect(() => {
    if (isNative()) return;
    if (!webRecognitionCtor()) fail("unavailable", "voice.input.unavailable");
    else if (!window.isSecureContext) fail("unavailable", "voice.input.insecure");
  }, []);

  useEffect(() => {
    return () => {
      finalized.current = true;
      void teardown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { state, level, partial, message: messageKey ? t(messageKey, lang) : "", start, stop };
}
