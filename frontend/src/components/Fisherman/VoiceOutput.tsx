"use client";

import React, { useEffect, useRef, useState } from "react";
import { Volume2, Square, VolumeX } from "lucide-react";
import { t } from "@/lib/i18n";

interface VoiceOutputProps {
  /** The text ORCA should read aloud (already localized by the backend). */
  text: string;
  lang: string;
  className?: string;
}

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

export const VoiceOutput: React.FC<VoiceOutputProps> = ({ text, lang, className = "" }) => {
  const [available, setAvailable] = useState(true);
  const [playing, setPlaying] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setAvailable(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  // Stop any playback if the text/lang changes or the component unmounts —
  // never leave a stale answer reading over a new one.
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setPlaying(false);
    }
  }, [text, lang]);

  const play = () => {
    if (!available || !text) return;
    const synth = window.speechSynthesis;
    synth.cancel(); // replay from the start

    const utter = new SpeechSynthesisUtterance(text);
    const target = BCP47[lang] || "en-IN";
    utter.lang = target;

    // Prefer a voice matching the language when the browser provides one.
    const voices = synth.getVoices();
    const match =
      voices.find((v) => v.lang === target) ||
      voices.find((v) => v.lang?.toLowerCase().startsWith(lang.toLowerCase()));
    if (match) utter.voice = match;

    utter.onend = () => setPlaying(false);
    utter.onerror = () => setPlaying(false);

    utterRef.current = utter;
    synth.speak(utter);
    setPlaying(true);
  };

  const stop = () => {
    if (!available) return;
    window.speechSynthesis.cancel();
    setPlaying(false);
  };

  // Do not pretend audio is playing when synthesis is unavailable.
  if (!available) {
    return (
      <span className={`text-[11px] text-amber-300 inline-flex items-center gap-1.5 ${className}`}>
        <VolumeX className="w-3.5 h-3.5" />
        {t("voice.output.unavailable", lang)}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={playing ? stop : play}
      aria-label={playing ? t("voice.stop", lang) : t("voice.listen", lang)}
      aria-pressed={playing}
      className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border text-[12px] font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-orca-cyan/60 ${
        playing
          ? "bg-orca-cyan/15 border-orca-cyan/40 text-orca-cyan"
          : "bg-orca-panel border border-orca-border text-slate-300 hover:text-orca-cyan hover:border-orca-cyan/40"
      } ${className}`}
    >
      {playing ? <Square className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
      {playing ? t("voice.playing", lang) : t("voice.listen", lang)}
    </button>
  );
};
