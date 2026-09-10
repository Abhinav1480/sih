"use client";

import React, { useState } from "react";
import { Send } from "lucide-react";
import { OrcaAnalysisResponse } from "@/lib/types";
import { t } from "@/lib/i18n";
import { BigNumber } from "./BigNumber";
import { normalizeVerdict, verdictFromBand, VERDICT_STYLE, UNKNOWN_STYLE } from "./FishermanVerdict";
import { VoiceInput } from "./VoiceInput";
import { VoiceOutput } from "./VoiceOutput";

interface FishermanHomeProps {
  analysis: OrcaAnalysisResponse | null;
  isLoading: boolean;
  lang: string;
  onSubmitQuery: (q: string) => void;
  cachedAt?: string | null;
  /** Slot under the verdict for connectivity / geofence / trip-card elements injected by page.tsx. */
  children?: React.ReactNode;
  /** Slot at the bottom. */
  extra?: React.ReactNode;
}

/** Provider/tier of the evidence record whose variable/dataset mentions `word` (case-insensitive). */
function provenanceFor(analysis: OrcaAnalysisResponse, word: string, exclude?: string) {
  const hit = (analysis.evidence || []).find((e) => {
    const s = `${e.variable || ""} ${e.dataset || ""}`.toLowerCase();
    return s.includes(word) && !(exclude && s.includes(exclude));
  }) as { provider?: string; provider_tier?: string } | undefined;
  return { provider: hit?.provider, provider_tier: hit?.provider_tier };
}

function hhmm(iso?: string): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? undefined
    : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

export const FishermanHome: React.FC<FishermanHomeProps> = ({
  analysis,
  isLoading,
  lang,
  onSubmitQuery,
  cachedAt,
  children,
  extra,
}) => {
  const [text, setText] = useState("");
  const [lastQuery, setLastQuery] = useState("");

  const submit = (q: string) => {
    const s = q.trim();
    if (!s || isLoading) return;
    setLastQuery(s);
    setText("");
    onSubmitQuery(s);
  };

  const band = analysis?.risk?.band;
  const score = analysis?.risk?.score;
  const verdict =
    normalizeVerdict(analysis?.answer?.verdict ?? (analysis as { verdict?: string } | null)?.verdict) ??
    verdictFromBand(band);
  const style = verdict ? VERDICT_STYLE[verdict] : UNKNOWN_STYLE;
  const Icon = style.icon;

  const wave = analysis?.ocean_conditions?.significant_wave_height_m;
  const wind = analysis?.weather_conditions?.wind_speed_knots;
  const returnBy = hhmm(analysis?.meta?.temporal?.end_time ?? analysis?.temporal?.end_time);

  return (
    <div className="min-h-screen bg-base text-text px-4 pb-8 pt-6 max-w-[430px] mx-auto flex flex-col gap-4">
      {isLoading ? (
        <div className="py-10 text-center space-y-4" role="status" aria-live="polite">
          {lastQuery && <p className="text-[16px] text-text leading-snug">{lastQuery}</p>}
          <span className="inline-block w-4 h-4 rounded-full bg-accent animate-pulse" />
          <p className="text-[14px] text-muted">{t("fisherman.analyzing", lang)}</p>
        </div>
      ) : analysis ? (
        <>
          {/* (a) verdict word — from answer.verdict / risk.band only */}
          <section aria-label={t("verdict.section", lang)} className="text-center pt-2">
            <Icon className={`w-16 h-16 mx-auto stroke-[2.5] ${style.text}`} />
            <div className={`font-display font-black text-[64px] sm:text-[72px] leading-none tracking-tight ${style.text}`}>
              {verdict ? t(`fisherman.verdict.${verdict}`, lang) : "?"}
            </div>
            {!verdict && <p className="text-[16px] text-muted mt-1">{t("fisherman.verdict.unavailable", lang)}</p>}
            {(band || score !== undefined) && (
              <div className="num text-[18px] text-muted mt-2">
                {band && t(`fisherman.band.${band.toUpperCase()}`, lang)}
                {band && score !== undefined && " · "}
                {score !== undefined && `${score}/100`}
              </div>
            )}
            {cachedAt && (
              <p className="num text-[12px] text-muted mt-1">
                {t("fisherman.cachedAt", lang, { time: hhmm(cachedAt) ?? cachedAt })}
              </p>
            )}
          </section>

          {/* (b) three numbers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <BigNumber
              label={t("fisherman.wave", lang)}
              value={typeof wave === "number" ? Number(wave.toFixed(1)) : undefined}
              unit="m"
              lang={lang}
              {...provenanceFor(analysis, "wave", "swell")}
            />
            <BigNumber
              label={t("fisherman.wind", lang)}
              value={typeof wind === "number" ? Math.round(wind) : undefined}
              unit="kt"
              lang={lang}
              {...provenanceFor(analysis, "wind")}
            />
            <BigNumber label={t("fisherman.returnBy", lang)} value={returnBy} lang={lang} />
          </div>

          {/* (c) slot */}
          {children}

          {/* (e) spoken verdict + replay */}
          <VoiceOutput analysis={analysis} lang={lang} className="h-14" />
        </>
      ) : (
        /* (f) empty state */
        <section aria-label={t("fisherman.examples", lang)} className="pt-4 space-y-2">
          <h2 className="text-[14px] uppercase tracking-wider text-muted font-semibold">{t("fisherman.examples", lang)}</h2>
          {["1", "2", "3"].map((n) => {
            const q = t(`fisherman.example.${n}`, lang);
            return (
              <button
                key={n}
                type="button"
                onClick={() => submit(q)}
                className="w-full min-h-14 rounded-lg bg-panel border border-border-base px-4 py-3 text-left text-[16px] text-text active:bg-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {q}
              </button>
            );
          })}
        </section>
      )}

      {/* (d) press-to-speak + always-available text row */}
      <div className="mt-auto space-y-3">
        <div className="flex flex-col items-center gap-2">
          <VoiceInput lang={lang} onTranscript={submit} disabled={isLoading} size="xl" />
          <span className="text-[14px] text-muted">{t("fisherman.speak", lang)}</span>
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit(text);
          }}
        >
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("fisherman.typeQuestion", lang)}
            aria-label={t("fisherman.typeQuestion", lang)}
            disabled={isLoading}
            className="flex-1 min-w-0 h-14 rounded-lg bg-panel border border-border-base px-4 text-[16px] text-text placeholder:text-muted focus:outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={isLoading || !text.trim()}
            aria-label={t("fisherman.send", lang)}
            className="w-14 h-14 shrink-0 rounded-lg bg-accent text-base flex items-center justify-center disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Send className="w-6 h-6" />
          </button>
        </form>
      </div>

      {/* (h) slot */}
      {extra}
    </div>
  );
};
