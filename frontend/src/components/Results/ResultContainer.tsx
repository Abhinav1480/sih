"use client";

import React from "react";
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
import { CheckCircle2, AlertTriangle, Info } from "lucide-react";

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
  const resultType = analysis.visualization_plan?.result_type || "marine_safety";
  const isClarification = Boolean(analysis.needs_clarification || resultType === "clarification");
  const isSpatialWhatIf = resultType === "spatial_what_if_analysis" || Boolean(analysis.spatial_what_if);
  const risk = analysis.risk_assessment;
  const isSafe = risk ? risk.category === "LOW" || risk.category === "MODERATE" : true;
  const title = isClarification ? "Clarification Needed" : resultTitle(resultType, analysis.intent);

  return (
    <div className="space-y-4">
      {/* Result header — flat section, dynamic title */}
      <div className="space-y-2.5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display font-bold text-[19px] text-white tracking-tight leading-tight">
            {title}
          </h2>
          <span className="text-[10px] text-orca-dim font-mono uppercase tracking-wider flex-shrink-0 mt-1">
            {analysis.temporal.label}
          </span>
        </div>

        <p className="text-slate-300 text-[13.5px] leading-relaxed">
          {analysis.executive_summary}
        </p>

        {/* Recommendation — concise, calm callout (not a giant colored block) */}
        {analysis.recommendation && (
          <div className="flex items-start gap-2.5 pt-1">
            {isSafe ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="min-w-0">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-orca-muted mb-0.5">
                Recommendation
              </span>
              <span className="text-[13px] text-slate-200 leading-relaxed">{analysis.recommendation}</span>
            </div>
          </div>
        )}

        <div className="border-b border-orca-border/60 pt-1" />
      </div>

      {/* DYNAMIC CARD RENDERING BASED ON VISUALIZATION PLAN */}
      {/* 0. Spatial What-If Displacement Analysis Card */}
      {isSpatialWhatIf && analysis.spatial_what_if && (
        <SpatialWhatIfCard data={analysis.spatial_what_if} />
      )}

      {/* 0.5. Clarification Flow Card */}
      {isClarification && (
        <ClarificationCard
          question={analysis.clarification_question}
          missingInfo={analysis.missing_information}
          onSelectLocation={onSelectLocation}
        />
      )}

      {/* 1. Marine Safety Card */}
      {analysis.risk_assessment && (resultType === "marine_safety" || resultType === "general") && !isSpatialWhatIf && (
        <SafetyAssessmentCard
          risk={analysis.risk_assessment}
          locationName={analysis.location.name}
          temporalLabel={analysis.temporal.label}
        />
      )}

      {/* 2. Key Conditions Grid (Only for non-displacement single location queries) */}
      {!isSpatialWhatIf && (analysis.ocean_conditions || analysis.weather_conditions) && (
        <ConditionsGrid
          ocean={analysis.ocean_conditions}
          weather={analysis.weather_conditions}
        />
      )}

      {/* 3. Potential Fishing Zones Card */}
      {analysis.fishing_zones && (resultType === "fishing_zones" || analysis.fishing_zones.length > 0) && (
        <FishingZonesCard
          zones={analysis.fishing_zones}
          locationName={analysis.location.name}
        />
      )}

      {/* 4. Route Corridor Comparison & Candidate Selection Card */}
      {(analysis.route_comparison || (analysis.route_analysis && analysis.route_analysis.candidate_routes && analysis.route_analysis.candidate_routes.length > 1)) && (
        <RouteComparisonCard
          comparison={analysis.route_comparison}
          route={analysis.route_analysis}
        />
      )}

      {/* 4.5. Route Analysis Card */}
      {analysis.route_analysis && (resultType === "route_analysis" || analysis.route_analysis.waypoints.length > 0) && (
        <RouteAnalysisCard route={analysis.route_analysis} />
      )}

      {/* 5. Regional Comparison Card */}
      {analysis.comparison_data && (resultType === "regional_comparison" || analysis.comparison_data.metrics.length > 0) && (
        <ComparisonCard data={analysis.comparison_data} />
      )}

      {/* 6. Historical Trend Card */}
      {analysis.historical_trend && (resultType === "historical_trend" || analysis.historical_trend.points.length > 0) && (
        <HistoricalTrendCard data={analysis.historical_trend} />
      )}

      {/* Regulatory Limitations Banner */}
      {analysis.limitations && analysis.limitations.length > 0 && (
        <div className="p-3 rounded-xl bg-orca-darkest/40 border border-orca-border/50 text-[11px] text-orca-muted space-y-1">
          <div className="font-semibold text-slate-400 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-orca-muted" />
            <span>Decision Support Disclaimer & Constraints</span>
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
