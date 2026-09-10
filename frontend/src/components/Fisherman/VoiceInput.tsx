"use client";

import React from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { t } from "@/lib/i18n";
import { useSpeechInput } from "@/lib/voice/useSpeechInput";

interface VoiceInputProps {
  /** ORCA language code from the app's language selector (en | te | hi | ta | ...). */
  lang?: string;
  /** Final transcript — the parent feeds it into the same pipeline as typed text. */
  onTranscript: (text: string) => void;
  disabled?: boolean;
  className?: string;
  /** xl = fisherman home press-to-speak; md = console input row. */
  size?: "md" | "xl";
}

export const VoiceInput: React.FC<VoiceInputProps> = ({
  lang = "en",
  onTranscript,
  disabled = false,
  className = "",
  size = "md",
}) => {
  const { state, level, partial, message, start } = useSpeechInput({ lang, onFinal: onTranscript });

  const listening = state === "listening";
  const processing = state === "processing";
  const unavailable = state === "unavailable";
  const problem = unavailable || state === "denied" || state === "nomatch" || state === "error";

  const dim = size === "xl" ? "w-20 h-20" : "w-11 h-11";
  const icon = size === "xl" ? "w-9 h-9" : "w-5 h-5";
  const label = listening ? t("voice.stopListening", lang) : t("voice.speak", lang);

  const status = listening
    ? partial || t("voice.listening", lang)
    : processing
    ? t("voice.processing", lang)
    : message;

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <button
        type="button"
        onClick={() => void start()}
        disabled={disabled || unavailable}
        aria-label={label}
        aria-pressed={listening}
        title={unavailable ? message : label}
        className={`relative ${dim} rounded-full flex items-center justify-center flex-shrink-0 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40 disabled:cursor-not-allowed ${
          listening
            ? "bg-severe/20 text-severe border border-severe/50"
            : "bg-panel border border-border-base text-muted hover:text-accent hover:border-accent/40"
        }`}
      >
        {/* Live audio level: the ring grows with the mic RMS while listening. */}
        {listening && (
          <span
            aria-hidden
            className="absolute inset-0 rounded-full bg-severe/30"
            style={{ transform: `scale(${1 + level * 0.8})`, transition: "transform 60ms linear" }}
          />
        )}
        <span className="relative">
          {processing ? (
            <Loader2 className={`${icon} animate-spin`} />
          ) : unavailable ? (
            <MicOff className={icon} />
          ) : (
            <Mic className={icon} />
          )}
        </span>
      </button>
      {/* Live region: interim transcript while speaking, otherwise state / what went wrong. */}
      <span
        aria-live="polite"
        className={`text-center leading-snug ${size === "xl" ? "text-[13px] max-w-[260px]" : "text-[10.5px] max-w-[160px]"} ${
          problem ? "text-caution" : listening && partial ? "text-text" : "text-muted"
        }`}
      >
        {status}
      </span>
    </div>
  );
};
