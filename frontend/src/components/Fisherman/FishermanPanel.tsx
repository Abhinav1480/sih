"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Fish, AlertOctagon, AlertTriangle } from "lucide-react";
import { OrcaAnalysisResponse, MarineAlert } from "@/lib/types";
import { t } from "@/lib/i18n";
import { EvidenceTrigger } from "@/components/Evidence/EvidenceTrigger";
import { EvidenceRegistry } from "@/components/Evidence/EvidenceRegistry";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ResultContainer } from "@/components/Results/ResultContainer";
import { FishermanVerdict } from "./FishermanVerdict";
import { VoiceOutput } from "./VoiceOutput";

interface FishermanPanelProps {
  analysis: OrcaAnalysisResponse;
  lang: string;
  alerts: MarineAlert[];
  onSelectLocation?: (locationName: string) => void;
}

const H3: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-[12px] uppercase tracking-wider font-semibold text-muted flex items-center gap-1.5">{children}</h3>
);

/** One compact, touch-friendly condition read-out with its "Why?" evidence. */
const ConditionChip: React.FC<{
  labelKey: string;
  value: string | number;
  unit?: string;
  hint: string;
  lang: string;
}> = ({ labelKey, value, unit, hint, lang }) => (
  <div className="min-w-0 rounded-lg bg-panel border border-border-base px-3 py-2">
    <div className="flex items-center justify-between gap-1">
      <span className="text-[10px] uppercase tracking-wider text-muted font-semibold truncate">{t(labelKey, lang)}</span>
      <EvidenceTrigger variableHint={hint} iconOnly className="flex-shrink-0" />
    </div>
    <div className="leading-none mt-1">
      <span className="num font-bold text-[18px] text-text">{value}</span>
      {unit && <span className="text-[11px] text-muted ml-1">{unit}</span>}
    </div>
  </div>
);

export const FishermanPanel: React.FC<FishermanPanelProps> = ({ analysis, lang, alerts, onSelectLocation }) => {
  const [showDetails, setShowDetails] = useState(false);

  const ocean = analysis.ocean_conditions;
  const weather = analysis.weather_conditions;
  const zones = analysis.fishing_zones;
  const bestZone = zones && zones.length > 0 ? zones.find((z) => z.rank === 1) || zones[0] : null;
  const meta = analysis.meta;

  const verdict = analysis.answer?.verdict ?? (analysis as { verdict?: string }).verdict;
  const band = analysis.risk?.band ?? analysis.risk_assessment?.category;
  const score = analysis.risk?.score ?? analysis.risk_assessment?.overall_score;
  const factors = analysis.risk?.factors ?? analysis.risk_assessment?.contributing_factors ?? [];
  const rules = analysis.risk?.triggered_rules ?? analysis.risk_assessment?.triggered_rules ?? [];
  const sum = factors.reduce((a, f) => a + (Number(f.points_added) || 0), 0);
  const mismatch = score !== undefined && sum !== score;
  const skipped = (analysis.trace || []).filter((s) => s.status === "SKIPPED");
  const limitations = meta?.limitations ?? analysis.limitations ?? [];

  const isFishing = analysis.visualization_plan?.result_type === "fishing_zones" || (zones && zones.length > 0);

  return (
    <div className="space-y-3">
      {/* 1. GO / CAUTION / NO-GO */}
      <FishermanVerdict
        verdict={verdict}
        explanation={analysis.answer?.headline || analysis.recommendation}
        lang={lang}
        band={band}
        score={score}
      />

      <div className="flex items-center justify-between gap-2">
        <VoiceOutput analysis={analysis} lang={lang} />
        {(meta?.mode || analysis.mode) && <StatusBadge status={(meta?.mode || analysis.mode) as any} size="sm" />}
      </div>

      {/* Degraded banner */}
      {meta?.degraded && (
        <div role="alert" className="rounded-lg border border-caution/50 bg-caution/10 p-3 flex gap-2 text-[13px] text-caution">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{t("fisherman.degraded", lang)}</span>
        </div>
      )}

      {/* 2. Active marine warnings */}
      {alerts && alerts.length > 0 && (
        <section aria-label={t("alerts.title", lang)} className="rounded-lg border border-severe/40 bg-severe/10 p-3">
          <div className="flex items-center gap-1.5 text-severe text-[11px] font-semibold uppercase tracking-wider mb-1.5">
            <AlertOctagon className="w-3.5 h-3.5" />
            {t("alerts.title", lang)}
            <span className="num">({alerts.length})</span>
          </div>
          <ul className="space-y-1">
            {alerts.slice(0, 3).map((a) => (
              <li key={a.alert_id} className="text-[12px] text-text leading-snug">
                <span className="font-semibold">{a.severity}</span> · {a.title}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 3. Risk factors with visible arithmetic */}
      {factors.length > 0 && (
        <section aria-label={t("fisherman.factors", lang)} className="rounded-lg bg-panel border border-border-base p-3 space-y-2">
          <H3>{t("fisherman.factors", lang)}</H3>
          <ul className="divide-y divide-border-base">
            {factors.map((f, i) => (
              <li key={i} className="py-2 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[13px] text-text font-medium">{f.name}</div>
                  <div className="num text-[12px] text-muted">{f.value}</div>
                  {f.description && <div className="text-[12px] text-muted leading-snug">{f.description}</div>}
                </div>
                <span className="num text-[16px] font-bold text-text shrink-0">+{f.points_added}</span>
              </li>
            ))}
          </ul>
          <div className={`flex items-center justify-between border-t border-border-base pt-2 text-[14px] ${mismatch ? "text-caution" : "text-text"}`}>
            <span className="font-semibold">
              {t("fisherman.sum", lang)}
              {mismatch && <span className="ml-2 text-[12px] font-normal">({t("fisherman.sumMismatch", lang)})</span>}
            </span>
            <span className="num font-bold">
              {sum} = {t("fisherman.score", lang).toLowerCase()} {score ?? "—"}
            </span>
          </div>
          {rules.length > 0 && (
            <div className="pt-1">
              <H3>{t("fisherman.rules", lang)}</H3>
              <ul className="list-disc pl-4 text-[12px] text-text space-y-0.5 mt-1">
                {rules.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* 4. Key conditions */}
      {(ocean || weather) && (
        <section aria-label={t("conditions.title", lang)} className="space-y-2">
          <H3>{t("conditions.title", lang)}</H3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ocean && <ConditionChip labelKey="cond.wave" value={ocean.significant_wave_height_m} unit="m" hint="Significant Wave Height" lang={lang} />}
            {weather && <ConditionChip labelKey="cond.wind" value={weather.wind_speed_knots} unit="kt" hint="Wind Speed" lang={lang} />}
            {ocean && <ConditionChip labelKey="cond.swell" value={ocean.swell_height_m} unit="m" hint="Swell Height" lang={lang} />}
            {weather && <ConditionChip labelKey="cond.visibility" value={weather.visibility_km} unit="km" hint="Visibility" lang={lang} />}
            {ocean && <ConditionChip labelKey="cond.sst" value={ocean.sea_surface_temp_c} unit="°C" hint="Sea Surface Temperature" lang={lang} />}
          </div>
        </section>
      )}

      {/* 5. Fishing opportunity */}
      {isFishing && (
        <section aria-label={t("fishing.title", lang)} className="space-y-2">
          <H3>
            <Fish className="w-3.5 h-3.5 text-accent" />
            {t("fishing.title", lang)}
          </H3>
          {bestZone ? (
            <div className="rounded-lg bg-panel border border-border-base p-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-[13.5px] text-text truncate">{bestZone.name}</span>
                <EvidenceTrigger variableHint={bestZone.name} label={t("action.why", lang)} />
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] num text-muted">
                <span>
                  {t("fishing.suitability", lang)} <span className="text-calm">{bestZone.suitability_score}</span>/100
                </span>
                <span>
                  {t("fishing.distance", lang)} <span className="text-text">{bestZone.distance_km}</span> km · {bestZone.bearing_deg}°
                </span>
              </div>
            </div>
          ) : (
            <p className="text-[12px] text-muted">{t("fishing.none", lang)}</p>
          )}
        </section>
      )}

      {/* 6. Notes */}
      {meta?.notes && meta.notes.length > 0 && (
        <section aria-label={t("fisherman.notes", lang)} className="space-y-1">
          <H3>{t("fisherman.notes", lang)}</H3>
          <ul className="list-disc pl-4 text-[12px] text-text space-y-0.5">
            {meta.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </section>
      )}

      {/* 7. Skipped sources */}
      {skipped.length > 0 && (
        <section aria-label={t("fisherman.skipped", lang)} className="space-y-1">
          <H3>{t("fisherman.skipped", lang)}</H3>
          <ul className="space-y-1.5">
            {skipped.map((s) => (
              <li key={s.seq} className="text-[12px] leading-snug">
                <div className="text-text font-medium">{s.action || s.agent}</div>
                {s.detail && <div className="text-muted">{s.detail}</div>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 8. Evidence (reuses FE-04 drawer) */}
      <EvidenceRegistry />

      {/* Details: limitations + full ORCA result behind a tap */}
      <div>
        <button
          type="button"
          onClick={() => setShowDetails((v) => !v)}
          aria-expanded={showDetails}
          className="w-full h-14 rounded-lg border border-border-base bg-panel active:bg-raised transition flex items-center justify-center gap-2 text-[14px] font-medium text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {t("fisherman.details", lang)}
          {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showDetails && (
          <div className="mt-3 space-y-3">
            {limitations.length > 0 && (
              <section aria-label={t("fisherman.limitations", lang)} className="space-y-1">
                <H3>{t("fisherman.limitations", lang)}</H3>
                <ul className="list-disc pl-4 text-[12px] text-muted space-y-0.5">
                  {limitations.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              </section>
            )}
            <ResultContainer analysis={analysis} onSelectLocation={onSelectLocation} />
          </div>
        )}
      </div>
    </div>
  );
};
