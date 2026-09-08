"use client";

import React from "react";
import { OrcaAnalysisResponse } from "@/lib/types";
import { SafetyAssessmentCard } from "./SafetyAssessmentCard";
import { ConditionsGrid } from "./ConditionsGrid";
import { FishingZonesCard } from "./FishingZonesCard";
import { RouteAnalysisCard } from "./RouteAnalysisCard";
import { ComparisonCard } from "./ComparisonCard";
import { HistoricalTrendCard } from "./HistoricalTrendCard";
import { Sparkles, CheckCircle2, AlertTriangle, AlertCircle, Info } from "lucide-react";

interface ResultContainerProps {
  analysis: OrcaAnalysisResponse;
}

export const ResultContainer: React.FC<ResultContainerProps> = ({ analysis }) => {
  const resultType = analysis.visualization_plan?.result_type || "marine_safety";
  const risk = analysis.risk_assessment;
  const isSafe = risk ? risk.category === "LOW" || risk.category === "MODERATE" : true;

  return (
    <div className="space-y-4">
      {/* Executive Summary & Recommendation Banner */}
      <div className="bg-gradient-to-br from-orca-card to-orca-darkest border border-orca-border rounded-2xl p-5 shadow-2xl space-y-3">
        <div className="flex items-center gap-2 text-orca-cyan text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-4 h-4" />
          <span>Executive Intelligence Summary</span>
        </div>

        <p className="text-white text-sm md:text-base leading-relaxed font-medium">
          {analysis.executive_summary}
        </p>

        {/* Actionable Recommendation Box */}
        <div
          className={`p-3.5 rounded-xl border text-xs leading-relaxed flex items-start gap-3 ${
            isSafe
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
              : "bg-rose-500/10 border-rose-500/30 text-rose-200"
          }`}
        >
          {isSafe ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          )}
          <div>
            <span className="font-bold block mb-0.5 text-white">
              {isSafe ? "Actionable Recommendation" : "Operational Hazard Advisory"}
            </span>
            <span>{analysis.recommendation}</span>
          </div>
        </div>
      </div>

      {/* DYNAMIC CARD RENDERING BASED ON VISUALIZATION PLAN */}
      {/* 1. Marine Safety Card */}
      {analysis.risk_assessment && (resultType === "marine_safety" || resultType === "general") && (
        <SafetyAssessmentCard
          risk={analysis.risk_assessment}
          locationName={analysis.location.name}
          temporalLabel={analysis.temporal.label}
        />
      )}

      {/* 2. Key Conditions Grid */}
      {(analysis.ocean_conditions || analysis.weather_conditions) && (
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

      {/* 4. Route Analysis Card */}
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
