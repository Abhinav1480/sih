"use client";

import React, { useEffect } from "react";
import { OrcaAnalysisResponse } from "@/lib/types";
import { SafetyAssessmentCard } from "./SafetyAssessmentCard";
import { ConditionsGrid } from "./ConditionsGrid";
import { FishingZonesCard } from "./FishingZonesCard";
import { RouteAnalysisCard } from "./RouteAnalysisCard";
import { RouteComparisonCard } from "./RouteComparisonCard";
import { ComparisonCard } from "./ComparisonCard";
import { HistoricalTrendCard } from "./HistoricalTrendCard";
import { ClarificationCard } from "./ClarificationCard";
import { SpatialWhatIfCard } from "./SpatialWhatIfCard";
import { EnvelopeCard, VerdictHeadline } from "./EnvelopeCards";
import { Info } from "lucide-react";
import { NUM } from "@/components/ui/tone";
import { useEvidenceOptional } from "@/components/Evidence/evidenceContext";

interface ResultContainerProps {
  analysis: OrcaAnalysisResponse;
  onSelectLocation?: (locationName: string) => void;
}

// Dynamic result title based on the backend result type / intent
function resultTitle(resultType: string, intent: string): string {
  const key = (resultType || intent || "").toLowerCase();
  if (key.includes("route")) return "Route Recommendation";
  if (key.includes("fishing")) return "Fishing Intelligence";
  if (key.includes("spatial")) return "Spatial What-If";
  if (key.includes("comparison")) return "Regional Comparison";
  if (key.includes("historical") || key.includes("trend")) return "Temporal Analysis";
  if (key.includes("geofence") || key.includes("restriction")) return "Geospatial Analysis";
  if (key.includes("safety")) return "Marine Safety";
  if (key.includes("condition") || key.includes("weather") || key.includes("ocean")) return "Marine Conditions";
  return "Marine Intelligence";
}

export const ResultContainer: React.FC<ResultContainerProps> = ({ analysis, onSelectLocation }) => {
  // Contract 1.3.0 envelope fields ride on the same object as the legacy shape.
  const env = analysis as any;
  const answer = env.answer as { headline?: string; verdict?: string; narrative?: string; confidence?: number } | undefined;
  const risk = env.risk as { score?: number; band?: string } | null | undefined;
  const cards: any[] = Array.isArray(env.cards) ? env.cards : [];
  const hasCards = cards.length > 0;
  const cardTypes = new Set(cards.map((c) => c?.type));

  // Register meta/risk/cards with the evidence drawer (limitations, Σ view).
  const evidence = useEvidenceOptional();
  const registerEnvelope = evidence?.registerEnvelope;
  useEffect(() => {
    registerEnvelope?.({ risk: env.risk ?? null, meta: env.meta ?? null, cards });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerEnvelope, env.risk, env.meta, env.cards]);

  const resultType = analysis.visualization_plan?.result_type || "marine_safety";
  const isClarification = Boolean(analysis.needs_clarification || resultType === "clarification");
  const isSpatialWhatIf = resultType === "spatial_what_if_analysis" || Boolean(analysis.spatial_what_if);
  const title = isClarification ? "Clarification Needed" : resultTitle(resultType, analysis.intent);

  // Primary signal: answer.verdict + risk.band. Legacy fallback: risk_assessment
  // band/score only (a verdict is never derived from prose).
  const legacyRisk = analysis.risk_assessment;
  const band = risk?.band ?? legacyRisk?.category;
  const score = typeof risk?.score === "number" ? risk.score : legacyRisk?.overall_score;
  const narrative = answer?.narrative || analysis.executive_summary;

  return (
    <div className="space-y-4">
      {/* Result header — verdict word is the primary signal */}
      <div className="space-y-2.5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display font-semibold text-[15px] text-[#7a94a3] tracking-tight leading-tight">{title}</h2>
          <span className={`text-[10px] text-[#7a94a3] ${NUM} uppercase tracking-wider flex-shrink-0 mt-1`}>
            {analysis.temporal?.label}
          </span>
        </div>

        {!isClarification && (
          <VerdictHeadline verdict={answer?.verdict} band={band} score={score} confidence={answer?.confidence} />
        )}

        {narrative && <p className="text-[#7a94a3] text-[13px] leading-relaxed">{narrative}</p>}

        {/* Legacy recommendation prose — secondary, never the primary signal */}
        {!hasCards && analysis.recommendation && (
          <p className="text-[12.5px] text-[#7a94a3] leading-relaxed border-l-2 border-[#12384a] pl-3">
            {analysis.recommendation}
          </p>
        )}

        <div className="border-b border-[#12384a] pt-1" />
      </div>

      {isSpatialWhatIf && analysis.spatial_what_if && <SpatialWhatIfCard data={analysis.spatial_what_if} />}

      {isClarification && (
        <ClarificationCard
          question={analysis.clarification_question}
          missingInfo={analysis.missing_information}
          onSelectLocation={onSelectLocation}
        />
      )}

      {/* Contract 1.3.0 cards[] — discriminated on type; unknown types are explicit */}
      {cards.map((card, i) => (
        <EnvelopeCard key={card?.id || i} card={card} analysis={env} />
      ))}

      {/* Legacy cards — only where no envelope card covers the same content */}
      {!cardTypes.has("risk_summary") && legacyRisk && (resultType === "marine_safety" || resultType === "general") && !isSpatialWhatIf && (
        <SafetyAssessmentCard risk={legacyRisk} verdict={answer?.verdict} />
      )}

      {!isSpatialWhatIf && (analysis.ocean_conditions || analysis.weather_conditions) && (
        <ConditionsGrid ocean={analysis.ocean_conditions} weather={analysis.weather_conditions} />
      )}

      {!cardTypes.has("pfz_ranking") && analysis.fishing_zones && (resultType === "fishing_zones" || analysis.fishing_zones.length > 0) && (
        <FishingZonesCard zones={analysis.fishing_zones} locationName={analysis.location.name} />
      )}

      {(analysis.route_comparison || (analysis.route_analysis?.candidate_routes && analysis.route_analysis.candidate_routes.length > 1)) && (
        <RouteComparisonCard comparison={analysis.route_comparison} route={analysis.route_analysis} />
      )}

      {!cardTypes.has("route_plan") && analysis.route_analysis && (resultType === "route_analysis" || analysis.route_analysis.waypoints.length > 0) && (
        <RouteAnalysisCard route={analysis.route_analysis} />
      )}

      {!cardTypes.has("comparison_table") && analysis.comparison_data && (resultType === "regional_comparison" || analysis.comparison_data.metrics.length > 0) && (
        <ComparisonCard data={analysis.comparison_data} />
      )}

      {!cardTypes.has("timeseries_chart") && analysis.historical_trend && (resultType === "historical_trend" || analysis.historical_trend.points.length > 0) && (
        <HistoricalTrendCard data={analysis.historical_trend} />
      )}

      {analysis.limitations && analysis.limitations.length > 0 && (
        <div className="p-3 rounded-xl bg-[#0a2432] border border-[#12384a] text-[11px] text-[#7a94a3] space-y-1">
          <div className="font-semibold text-[#e8f4f8] flex items-center gap-1">
            <Info className="w-3.5 h-3.5" />
            <span>Limitations</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-[10px]">
            {analysis.limitations.map((lim, idx) => (
              <li key={idx}>{lim}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
