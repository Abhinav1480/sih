"use client";

import React, { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { t } from "@/lib/i18n";

type VoiceState =
  | "idle"
  | "listening"
  | "processing"
  | "unavailable"
  | "denied"
  | "error";

interface VoiceInputProps {
  lang: string;
  /** Called with the transcribed text — the parent populates its query input. */
  onTranscript: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

/** Map ORCA language codes to BCP-47 tags for speech recognition. */
const BCP47: Record<string, string> = {
  en: "en-IN",
  te: "te-IN",
  hi: "hi-IN",
  ta: "ta-IN",
  ml: "ml-IN",
  kn: "kn-IN",
  bn: "bn-IN",
  mr: "mr-IN",
};

const LISTEN_TIMEOUT_MS = 10000;

export const VoiceInput: React.FC<VoiceInputProps> = ({
  lang,
  onTranscript,
  disabled = false,
  className = "",
}) => {
  const [state, setState] = useState<VoiceState>("idle");
  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<number | null>(null);

  // Detect availability once on mount (client only).
  useEffect(() => {
    const SR =
      typeof window !== "undefined"
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : undefined;
    if (!SR) setState("unavailable");
  }, []);

  const clearTimer = () => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const stop = () => {
    clearTimer();
    try {
      recognitionRef.current?.stop();
    } catch {
      /* no-op */
    }
  };

  useEffect(() => () => stop(), []); // cleanup on unmount

  const start = () => {
    if (disabled) return;
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setState("unavailable");
      return;
    }

    // Toggle off if already listening.
    if (state === "listening") {
      stop();
      setState("idle");
      return;
    }

    let recognition: any;
    try {
      recognition = new SR();
    } catch {
      setState("error");
      return;
    }
    recognition.lang = BCP47[lang] || "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onresult = (event: any) => {
      clearTimer();
      const transcript = event?.results?.[0]?.[0]?.transcript ?? "";
      setState("processing");
      if (transcript) onTranscript(transcript);
      setState("idle");
    };

    recognition.onerror = (event: any) => {
      clearTimer();
      const err = event?.error;
      if (err === "not-allowed" || err === "service-not-allowed") {
        setState("denied");
      } else if (err === "no-speech" || err === "aborted") {
        setState("idle");
      } else {
        setState("error");
      }
    };

    recognition.onend = () => {
      clearTimer();
      // If we ended while still "listening" (no result fired), return to idle.
      setState((s) => (s === "listening" ? "idle" : s));
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setState("listening");
      // Never hang indefinitely.
      timeoutRef.current = window.setTimeout(() => {
        stop();
        setState((s) => (s === "listening" ? "idle" : s));
      }, LISTEN_TIMEOUT_MS);
    } catch {
      setState("error");
    }
  };

  const isUnavailable = state === "unavailable";
  const isListening = state === "listening";
  const isProcessing = state === "processing";

  // Status / error message (aria-live so screen readers hear state changes).
  const message =
    state === "unavailable"
      ? t("voice.input.unavailable", lang)
      : state === "denied"
      ? t("voice.input.denied", lang)
      : state === "error"
      ? t("voice.input.error", lang)
      : state === "listening"
      ? t("voice.listening", lang)
      : state === "processing"
      ? t("voice.processing", lang)
      : "";

  const buttonLabel = isListening
    ? t("voice.stopListening", lang)
    : t("voice.speak", lang);

  return (
    <>
      <button
        type="button"
        onClick={start}
        disabled={disabled || isUnavailable}
        aria-label={buttonLabel}
        aria-pressed={isListening}
        title={isUnavailable ? t("voice.input.unavailable", lang) : buttonLabel}
        className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-orca-cyan/60 disabled:opacity-40 disabled:cursor-not-allowed ${
          isListening
            ? "bg-rose-500/20 text-rose-300 border border-rose-500/50 animate-pulse"
            : "bg-orca-panel border border-orca-border text-orca-muted hover:text-orca-cyan hover:border-orca-cyan/40"
        } ${className}`}
      >
        {isProcessing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : isUnavailable ? (
          <MicOff className="w-5 h-5" />
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </button>
      {/* Live region for state + errors (also visible text). */}
      <span
        aria-live="polite"
        className={`sr-only-fallback text-[10.5px] ${
          state === "denied" || state === "error" || state === "unavailable"
            ? "text-amber-300"
            : "text-orca-dim"
        }`}
      >
        {message}
      </span>
    </>
  );
};
