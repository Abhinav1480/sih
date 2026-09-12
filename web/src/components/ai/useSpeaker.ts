"use client";

/**
 * Speaks a SpokenScript and tracks which sentence and word are being spoken
 * so the transcript can highlight them. Reports, rather than hides, when no
 * voice exists for the language or the browser cannot speak at all.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { SpokenScript } from "@/lib/spoken/buildSpokenScript";
import { speakScript, ttsSupported, loadVoices, voiceFor, type SpeakHandle } from "@/lib/voice/tts";

export type SpeakerState = "idle" | "speaking";
export type VoiceAvailability = "unknown" | "available" | "no_voice" | "unsupported";

export function useSpeaker(lang: string) {
  const [state, setState] = useState<SpeakerState>("idle");
  const [activeSentence, setActiveSentence] = useState<number>(-1);
  const [activeWord, setActiveWord] = useState<{ sentence: number; start: number; end: number } | null>(null);
  const [availability, setAvailability] = useState<VoiceAvailability>("unknown");
  const [scriptId, setScriptId] = useState<string | null>(null);
  const handle = useRef<SpeakHandle | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadVoices().then((voices) => {
      if (cancelled) return;
      setAvailability(!ttsSupported() ? "unsupported" : voiceFor(voices, lang) ? "available" : "no_voice");
    });
    return () => {
      cancelled = true;
    };
  }, [lang]);

  const stop = useCallback(() => {
    handle.current?.cancel();
    handle.current = null;
    setState("idle");
    setActiveSentence(-1);
    setActiveWord(null);
  }, []);

  const speak = useCallback(async (script: SpokenScript, id: string): Promise<boolean> => {
    stop();
    if (script.sentences.length === 0) return false;
    setScriptId(id);
    const r = await speakScript(script, {
      onSentence: (i) => {
        setActiveSentence(i);
        setActiveWord(null);
      },
      onWord: (i, start, len) => setActiveWord({ sentence: i, start, end: start + len }),
      onEnd: () => {
        handle.current = null;
        setState("idle");
        setActiveSentence(-1);
        setActiveWord(null);
      },
      onError: () => {
        handle.current = null;
        setState("idle");
        setActiveSentence(-1);
        setActiveWord(null);
      },
    });
    if (!r.ok) {
      setAvailability(r.reason === "unsupported" ? "unsupported" : "no_voice");
      return false;
    }
    handle.current = r.handle;
    setState("speaking");
    return true;
  }, [stop]);

  useEffect(() => () => handle.current?.cancel(), []);

  return { state, activeSentence, activeWord, availability, scriptId, speak, stop };
}
