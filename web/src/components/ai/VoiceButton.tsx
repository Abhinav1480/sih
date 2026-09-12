"use client";

/**
 * The large central voice control with its listening ring, the audio-level
 * indicator, and the plain-language permission explanation shown before the
 * browser's own prompt. Interim recognition is surfaced as large subtitles.
 */
import { useT } from "@/lib/i18n";
import { IconMic, IconSquare } from "@/components/ui/Icons";

export type VoiceState = "idle" | "explain" | "listening" | "disabled";

export function VoiceButton({ state, level, onPress, onStop, label }: { state: VoiceState; level: number; onPress: () => void; onStop: () => void; label?: string }) {
  const t = useT();
  const listening = state === "listening";
  const ring = 1 + level * 0.35;
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative grid place-items-center" style={{ width: 168, height: 168 }}>
        {listening && (
          <span
            aria-hidden
            className="absolute inset-0 rounded-full"
            style={{ background: "var(--accent-tint)", transform: `scale(${ring})`, transition: "transform 90ms linear" }}
          />
        )}
        <button
          type="button"
          className={`relative grid h-32 w-32 place-items-center rounded-full border-2 transition-colors ${listening ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]" : "border-hairline bg-[var(--surface-solid)] text-[var(--accent)] hover:border-[var(--accent)]"} disabled:opacity-50`}
          aria-pressed={listening}
          aria-label={listening ? t("ai.stopListening") : t("ai.speak")}
          disabled={state === "disabled"}
          onClick={listening ? onStop : onPress}
        >
          {listening ? <IconSquare size={40} /> : <IconMic size={48} />}
        </button>
      </div>
      <div className="text-center">
        <div className="font-semibold">{listening ? t("ai.listening") : (label ?? t("ai.speak"))}</div>
        {!listening && <div className="text-sm text-text-2">{t("ai.speakHint")}</div>}
      </div>
    </div>
  );
}
