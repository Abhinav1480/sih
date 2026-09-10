"use client";

import React from "react";
import {
  Compass,
  Navigation,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Waves,
  Wind,
  Thermometer,
  CloudRain,
  Eye,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  BarChart3,
  MapPin,
  Activity,
  Layers
} from "lucide-react";
import { SpatialWhatIfAnalysisData } from "@/lib/types";

interface SpatialWhatIfCardProps {
  data: SpatialWhatIfAnalysisData;
}

export const SpatialWhatIfCard: React.FC<SpatialWhatIfCardProps> = ({ data }) => {
  if (!data) return null;

  const getMetricIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("wave") || lower.includes("swell")) return Waves;
    if (lower.includes("wind") || lower.includes("gust")) return Wind;
    if (lower.includes("temp") || lower.includes("sst")) return Thermometer;
    if (lower.includes("visib")) return Eye;
    if (lower.includes("rain") || lower.includes("precip")) return CloudRain;
    return Activity;
  };

  const getImpactBadgeClass = (impact: string) => {
    if (impact.includes("High")) {
      return "bg-amber-500/20 text-amber-300 border-amber-500/40";
    }
    if (impact.includes("Moderate")) {
      return "bg-cyan-500/20 text-cyan-300 border-cyan-500/40";
    }
    return "bg-slate-500/20 text-slate-300 border-slate-500/40";
  };

  const isHazardous = data.operational_significance.includes("INCREASED HAZARD");
  const isFavorable = data.operational_significance.includes("FAVORABLE");

  return (
    <div className="maritime-card p-5 md:p-6 space-y-5">
      {/* 1. Header with Vector Displacement Journey */}
      <div className="border-b border-white/[0.06] pb-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider font-mono">
            <Compass className="w-4 h-4 text-cyan-400" />
            <span>Spatial What-If & Displacement Analysis</span>
          </div>
          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 font-mono font-medium">
            {data.temporal_label}
          </span>
        </div>

        {/* Vector Flow Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center bg-orca-darkest/70 p-3.5 rounded-xl border border-white/[0.06]">
          {/* Origin Point */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs flex-shrink-0">
              A
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-bold text-emerald-400 font-mono">Origin Anchor</div>
              <div className="font-bold text-white text-sm truncate">{data.origin.name}</div>
              <div className="text-[10px] text-slate-400 font-mono">
                {data.origin.latitude.toFixed(3)}°N, {data.origin.longitude.toFixed(3)}°E
              </div>
            </div>
          </div>

          {/* Vector Direction Badge */}
          <div className="flex flex-col items-center justify-center px-3 py-1.5 bg-orca-dark/80 border border-white/[0.06] rounded-lg text-center">
            <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400">
              <span>{data.distance_km} km {data.direction.toUpperCase()}</span>
              <Navigation
                className="w-3.5 h-3.5 text-cyan-400"
                style={{ transform: `rotate(${data.bearing_deg}deg)` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              Azimuth {data.bearing_deg.toFixed(0)}° Bearing
            </span>
          </div>

          {/* Displaced Target */}
          <div className="flex items-center gap-2.5 justify-start md:justify-end">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-xs flex-shrink-0">
              B
            </div>
            <div className="min-w-0 text-left md:text-right">
              <div className="text-[10px] uppercase font-bold text-cyan-400 font-mono">Displaced Target</div>
              <div className="font-bold text-white text-sm truncate">{data.displaced.name}</div>
              <div className="text-[10px] text-slate-400 font-mono">
                {data.displaced.latitude.toFixed(3)}°N, {data.displaced.longitude.toFixed(3)}°E
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Hero Callout: Top Changed Condition with 3-Tier Scientific Breakdown */}
      <div className="p-4 md:p-5 rounded-xl bg-gradient-to-r from-blue-950/40 via-orca-panel to-cyan-950/30 border border-cyan-500/30 space-y-3.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider font-extrabold text-cyan-400 flex items-center gap-1.5 font-mono">
            <BarChart3 className="w-4 h-4" />
            <span>Condition Changing Most</span>
          </span>
          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-mono font-bold">
            Rank #1 Operational Shift
          </span>
        </div>
        <div className="text-base md:text-lg font-display font-bold text-white">
          {data.top_changed_condition}
        </div>

        {/* 3-Tier Scientific Causality Pipeline */}
        <div className="grid grid-cols-1 gap-2 pt-1">
          {/* Tier 1: Computed Fact */}
          <div className="p-3 rounded-lg bg-orca-darkest/80 border border-cyan-500/25 flex items-start gap-2.5 text-xs">
            <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono font-bold text-[10px] uppercase flex-shrink-0 mt-0.5">
              1. Computed Fact
            </span>
            <span className="text-slate-100 font-medium leading-relaxed">
              {data.computed_fact || data.ranked_changes[0]?.computed_fact || data.ranked_changes[0]?.explanation}
            </span>
          </div>

          {/* Tier 2: Data-Supported Interpretation */}
          <div className="p-3 rounded-lg bg-orca-darkest/80 border border-emerald-500/25 flex items-start gap-2.5 text-xs">
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold text-[10px] uppercase flex-shrink-0 mt-0.5">
              2. Data Interpretation
            </span>
            <span className="text-emerald-100 leading-relaxed">
              {data.data_supported_interpretation || data.ranked_changes[0]?.data_supported_interpretation || "Forecast indicates localized environmental variation across this displacement baseline."}
            </span>
          </div>

          {/* Tier 3: Physical Hypothesis / Causality */}
          <div className="p-3 rounded-lg bg-orca-darkest/80 border border-white/[0.08] flex items-start gap-2.5 text-xs">
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-bold text-[10px] uppercase flex-shrink-0 mt-0.5">
              3. Physical Hypothesis
            </span>
            <span className="text-slate-300 italic leading-relaxed">
              {data.physical_hypothesis || data.ranked_changes[0]?.physical_hypothesis || "The available data does not establish a definitive physical cause for this difference."}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Operational Hazard / Navigation Advisory */}
      <div
        className={`p-3.5 rounded-xl border text-xs leading-relaxed flex items-start gap-3 ${
          isHazardous
            ? "bg-rose-500/10 border-rose-500/30 text-rose-200"
            : isFavorable
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
            : "bg-cyan-500/10 border-cyan-500/30 text-cyan-200"
        }`}
      >
        {isHazardous ? (
          <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
        ) : isFavorable ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
        ) : (
          <Compass className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
        )}
        <div>
          <span className="font-bold block mb-0.5 text-white">
            Operational Significance & Vessel Guidance
          </span>
          <span>{data.operational_significance}</span>
        </div>
      </div>

      {/* 4. Ranked Conditions of Change Breakdown */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5 font-mono">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Ranked Environmental Variations</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Normalized Maritime Impact</span>
        </div>

        <div className="space-y-2.5">
          {data.ranked_changes.map((item) => {
            const Icon = getMetricIcon(item.metric_name);
            const isIncrease = item.absolute_difference > 0;
            const isZero = item.absolute_difference === 0;

            return (
              <div
                key={item.rank}
                className="p-3.5 rounded-xl bg-orca-darkest/75 border border-white/[0.06] hover:border-cyan-500/30 transition-colors space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-orca-card border border-white/[0.1] flex items-center justify-center text-[10px] font-bold text-cyan-400 font-mono flex-shrink-0">
                      #{item.rank}
                    </span>
                    <Icon className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <span className="font-bold text-white text-xs md:text-sm truncate">
                      {item.metric_name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold ${getImpactBadgeClass(
                        item.operational_impact
                      )}`}
                    >
                      {item.operational_impact}
                    </span>

                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                        isZero
                          ? "bg-slate-800 text-slate-400"
                          : isIncrease
                          ? "bg-amber-950/60 border border-amber-500/30 text-amber-300"
                          : "bg-emerald-950/60 border border-emerald-500/30 text-emerald-300"
                      }`}
                    >
                      {item.absolute_difference > 0 ? `+${item.absolute_difference}` : item.absolute_difference}{" "}
                      {item.unit}
                      {item.percentage_difference !== undefined && item.percentage_difference !== null && (
                        <span className="ml-1 text-[10px] opacity-80">
                          ({item.percentage_difference > 0 ? `+${item.percentage_difference}` : item.percentage_difference}%)
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Values Comparison Strip */}
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-white/[0.06]">
                  <div className="text-slate-300">
                    <span className="text-slate-400 mr-1.5">{data.origin.name}:</span>
                    <b className="text-white">{item.location_a_value}</b>{" "}
                    <span className="text-[10px] text-slate-400">{item.unit}</span>
                  </div>
                  <div className="text-slate-300 text-right">
                    <span className="text-slate-400 mr-1.5">{data.displaced.name}:</span>
                    <b className="text-white">{item.location_b_value}</b>{" "}
                    <span className="text-[10px] text-slate-400">{item.unit}</span>
                  </div>
                </div>

                {/* Grounded Evidence-Aware Breakdown */}
                <div className="text-[11px] bg-orca-card/50 p-2.5 rounded-lg border border-white/[0.06] space-y-1.5">
                  {item.data_supported_interpretation && (
                    <div className="text-emerald-300/90">
                      <span className="font-semibold text-emerald-400 mr-1.5">Forecast Indication:</span>
                      {item.data_supported_interpretation}
                    </div>
                  )}
                  <div className="text-slate-400 italic">
                    <span className="font-semibold text-slate-300 not-italic mr-1.5">Evidence Status:</span>
                    {item.physical_hypothesis || "The available data does not establish a definitive physical cause for this difference."}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Complete Parameter Comparison Table */}
      <div className="space-y-2 pt-2 border-t border-white/[0.06]">
        <div className="text-xs uppercase font-bold text-slate-400 font-mono">
          All Evaluated Marine Parameters (Origin vs Displaced)
        </div>
        <div className="overflow-x-auto rounded-xl border border-white/[0.06] bg-orca-darkest/70">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.06] text-[10px] uppercase text-slate-400 font-mono bg-orca-darkest/90">
                <th className="py-2.5 px-3">Parameter</th>
                <th className="py-2.5 px-3 text-right">{data.origin.name}</th>
                <th className="py-2.5 px-3 text-right">{data.displaced.name}</th>
                <th className="py-2.5 px-3 text-right">Net Change</th>
                <th className="py-2.5 px-3">Condition Assessment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {data.metrics_summary.map((m, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 px-3 font-medium text-white">{m.metric_name}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                    {m.location_a_value} <span className="text-[10px] text-slate-400">{m.unit}</span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-white font-bold">
                    {m.location_b_value} <span className="text-[10px] text-slate-400">{m.unit}</span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold">
                    <span
                      className={
                        m.difference > 0
                          ? "text-amber-400"
                          : m.difference < 0
                          ? "text-emerald-400"
                          : "text-slate-400"
                      }
                    >
                      {m.difference > 0 ? `+${m.difference}` : m.difference} {m.unit}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-orca-panel border border-white/[0.08] text-cyan-400 font-semibold">
                      {m.favorability}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
