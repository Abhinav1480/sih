"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, Square } from "lucide-react";
import type { OrcaAnalysisResponse } from "@/lib/types";
import { t } from "@/lib/i18n";
import { isNative } from "@/lib/native";
import { buildSpokenText } from "@/lib/voice/speechText";
import { useSpeechOutput } from "@/lib/voice/useSpeechOutput";
import { toBcp47 } from "@/lib/voice/useSpeechInput";

interface VoiceOutputProps {
  analysis: OrcaAnalysisResponse;
  lang: string;
  /** Applied to the Replay button (callers pass touch-target heights). */
  className?: string;
}

type Status = "idle" | "missing" | "error" | "unavailable";

const STATUS_KEY: Record<Exclude<Status, "idle">, string> = {
  missing: "voice.pack.missing",
  error: "voice.output.error",
  unavailable: "voice.output.unavailable",
};

/**
 * Speaks the envelope summary (verdict, two numbers, one instruction) once per
 * answer and always offers Replay. When the device has no voice for the
 * language it does NOT speak English — it shows the text large instead.
 */
export const VoiceOutput: React.FC<VoiceOutputProps> = ({ analysis, lang, className = "" }) => {
  const spoken = useMemo(() => buildSpokenText(analysis, lang), [analysis, lang]);
  const tts = useSpeechOutput(spoken.lang);
  const [status, setStatus] = useState<Status>("idle");

  const say = useCallback(async () => {
    if (!spoken.text) return;
    if (!isNative() && typeof speechSynthesis === "undefined") return setStatus("unavailable");
    const r = await tts.speak(spoken.text);
    setStatus(r.ok ? "idle" : r.reasonKey === "voice.pack.missing" ? "missing" : "error");
  }, [spoken.text, tts.speak]);

  // Auto-speak once per new answer; stop when the answer changes or we unmount.
  const sayRef = useRef(say);
  sayRef.current = say;
  const answerKey = analysis.request_id ?? analysis.query_id;
  useEffect(() => {
    void sayRef.current();
    return () => {
      void tts.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answerKey, spoken.text]);

  const large = status !== "idle";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={tts.speaking ? () => void tts.stop() : () => void say()}
          disabled={status === "unavailable"}
          aria-label={tts.speaking ? t("voice.stop", lang) : t("voice.replay", lang)}
          aria-pressed={tts.speaking}
          className={`inline-flex items-center gap-2 h-11 px-4 rounded-lg border text-[14px] font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40 ${
            tts.speaking
              ? "bg-accent/15 border-accent/40 text-accent"
              : "bg-panel border-border-base text-text hover:text-accent hover:border-accent/40"
          } ${className}`}
        >
          {tts.speaking ? <Square className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
          {tts.speaking ? t("voice.stop", lang) : t("voice.replay", lang)}
        </button>
        {tts.speaking && <span className="text-[12px] text-muted">{t("voice.playing", lang)}</span>}
      </div>

      <p
        data-testid="voice-spoken-text"
        lang={toBcp47(spoken.lang)}
        className={`text-text leading-snug ${large ? "text-[22px] font-semibold" : "text-[14px]"}`}
      >
        {spoken.text}
      </p>

      {status !== "idle" && (
        <p role="status" className="text-[13px] text-caution">
          {t(STATUS_KEY[status], lang)}
        </p>
      )}
      {spoken.fellBack && <p className="text-[12px] text-muted">{t("voice.spoken.fallbackLang", lang)}</p>}
    </div>
  );
};
