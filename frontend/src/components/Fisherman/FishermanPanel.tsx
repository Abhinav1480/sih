"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Fish, AlertOctagon } from "lucide-react";
import { OrcaAnalysisResponse, MarineAlert } from "@/lib/types";
import { t } from "@/lib/i18n";
import { RiskIntelligenceModule } from "@/components/Risk";
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

/** One compact, touch-friendly condition read-out with its "Why?" evidence. */
const ConditionChip: React.FC<{
  labelKey: string;
  value: string | number;
  unit?: string;
  hint: string;
  lang: string;
}> = ({ labelKey, value, unit, hint, lang }) => (
  <div className="min-w-0 rounded-xl bg-white/[0.02] border border-orca-border/60 px-3 py-2">
    <div className="flex items-center justify-between gap-1">
      <span className="text-[10px] uppercase tracking-wider text-orca-dim font-semibold truncate">
        {t(labelKey, lang)}
      </span>
      <EvidenceTrigger variableHint={hint} iconOnly className="flex-shrink-0" />
    </div>
    <div className="leading-none mt-1">
      <span className="font-mono font-bold text-[18px] text-white">{value}</span>
      {unit && <span className="text-[11px] text-orca-muted ml-1">{unit}</span>}
    </div>
  </div>
);

export const FishermanPanel: React.FC<FishermanPanelProps> = ({
  analysis,
  lang,
  alerts,
  onSelectLocation,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const ocean = analysis.ocean_conditions;
  const weather = analysis.weather_conditions;
  const risk = analysis.risk_assessment;
  const zones = analysis.fishing_zones;
  const bestZone = zones && zones.length > 0 ? zones.find((z) => z.rank === 1) || zones[0] : null;

  // Verdict is read defensively — it is NOT part of the current contract, so it
  // is rendered exactly IF the backend/envelope supplies it, else honest fallback.
  const verdict = (analysis as unknown as { verdict?: string }).verdict;

  // Text ORCA reads aloud — already localized by the backend.
  const speakText = [analysis.executive_summary, analysis.recommendation]
    .filter(Boolean)
    .join(". ");

  const isFishing =
    analysis.visualization_plan?.result_type === "fishing_zones" ||
    (zones && zones.length > 0);

  return (
    <div className="space-y-3">
      {/* 1. GO / CAUTION / NO-GO */}
      <FishermanVerdict verdict={verdict} explanation={analysis.recommendation} lang={lang} />

      {/* Voice playback + freshness of the answer */}
      <div className="flex items-center justify-between gap-2">
        <VoiceOutput text={speakText} lang={lang} />
        {analysis.mode && <StatusBadge status={analysis.mode} size="sm" />}
      </div>

      {/* 2. Active marine warnings — surfaced prominently, not hidden */}
      {alerts && alerts.length > 0 && (
        <section
          aria-label={t("alerts.title", lang)}
          className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3"
        >
          <div className="flex items-center gap-1.5 text-rose-300 text-[11px] font-semibold uppercase tracking-wider mb-1.5">
            <AlertOctagon className="w-3.5 h-3.5" />
            {t("alerts.title", lang)}
            <span className="font-mono">({alerts.length})</span>
          </div>
          <ul className="space-y-1">
            {alerts.slice(0, 3).map((a) => (
              <li key={a.alert_id} className="text-[12px] text-rose-100/90 leading-snug">
                <span className="font-semibold">{a.severity}</span> · {a.title}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 3. Marine risk — reuses the existing FE-05 module (no second calc) */}
      {risk && (
        <RiskIntelligenceModule
          risk={risk}
          label={t("risk.label", lang)}
          locationName={analysis.location?.name}
          temporalLabel={analysis.temporal?.label}
          defaultExpanded={false}
        />
      )}

      {/* 4. Key conditions */}
      {(ocean || weather) && (
        <section aria-label={t("conditions.title", lang)} className="space-y-2">
          <h3 className="text-[12px] font-semibold text-slate-200">{t("conditions.title", lang)}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ocean && (
              <ConditionChip
                labelKey="cond.wave"
                value={ocean.significant_wave_height_m}
                unit="m"
                hint="Significant Wave Height"
                lang={lang}
              />
            )}
            {weather && (
              <ConditionChip
                labelKey="cond.wind"
                value={weather.wind_speed_knots}
                unit="kt"
                hint="Wind Speed"
                lang={lang}
              />
            )}
            {ocean && (
              <ConditionChip
                labelKey="cond.swell"
                value={ocean.swell_height_m}
                unit="m"
                hint="Swell Height"
                lang={lang}
              />
            )}
            {weather && (
              <ConditionChip
                labelKey="cond.visibility"
                value={weather.visibility_km}
                unit="km"
                hint="Visibility"
                lang={lang}
              />
            )}
            {ocean && (
              <ConditionChip
                labelKey="cond.sst"
                value={ocean.sea_surface_temp_c}
                unit="°C"
                hint="Sea Surface Temperature"
                lang={lang}
              />
            )}
          </div>
        </section>
      )}

      {/* 5. Fishing opportunity — backend values only, backend ranking only */}
      {isFishing && (
        <section aria-label={t("fishing.title", lang)} className="space-y-2">
          <h3 className="text-[12px] font-semibold text-slate-200 flex items-center gap-1.5">
            <Fish className="w-3.5 h-3.5 text-orca-cyan" />
            {t("fishing.title", lang)}
          </h3>
          {bestZone ? (
            <div className="rounded-xl bg-white/[0.02] border border-orca-border/60 p-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-[13.5px] text-white truncate">
                  {bestZone.name}
                </span>
                <EvidenceTrigger variableHint={bestZone.name} label={t("action.why", lang)} />
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] font-mono text-orca-dim">
                <span>
                  {t("fishing.suitability", lang)}{" "}
                  <span className="text-emerald-400">{bestZone.suitability_score}</span>/100
                </span>
                <span>
                  {t("fishing.distance", lang)}{" "}
                  <span className="text-slate-300">{bestZone.distance_km}</span> km · {bestZone.bearing_deg}°
                </span>
                <span>
                  Chl <span className="text-emerald-400">{bestZone.chlorophyll_mg_m3}</span> mg/m³
                </span>
                <span>
                  SST <span className="text-slate-300">{bestZone.sst_c}</span>°C
                </span>
              </div>
            </div>
          ) : (
            <p className="text-[12px] text-orca-muted">{t("fishing.none", lang)}</p>
          )}
        </section>
      )}

      {/* 6. Evidence (reuses FE-04 drawer) */}
      <EvidenceRegistry />

      {/* Details expander — full ORCA result kept behind a tap, never removed */}
      <div>
        <button
          type="button"
          onClick={() => setShowDetails((v) => !v)}
          aria-expanded={showDetails}
          className="w-full h-11 rounded-xl border border-orca-border bg-white/[0.02] hover:bg-white/[0.04] hover:border-orca-cyan/30 transition flex items-center justify-center gap-2 text-[12.5px] font-medium text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-orca-cyan/60"
        >
          {showDetails ? t("details.hide", lang) : t("details.show", lang)}
          {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showDetails && (
          <div className="mt-3">
            <ResultContainer analysis={analysis} onSelectLocation={onSelectLocation} />
          </div>
        )}
      </div>
    </div>
  );
};
