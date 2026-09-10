"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { DeterministicRiskResult } from "@/lib/types";

interface SafetyAssessmentCardProps {
  risk: DeterministicRiskResult;
  locationName: string;
  temporalLabel: string;
}

export const SafetyAssessmentCard: React.FC<SafetyAssessmentCardProps> = ({ risk }) => {
  const cfg =
    risk.category === "LOW"
      ? { label: "LOW", text: "text-emerald-400", meter: "bg-emerald-500", verdict: "Safe for standard passage and fishing operations." }
      : risk.category === "MODERATE"
      ? { label: "MODERATE", text: "text-amber-400", meter: "bg-amber-500", verdict: "Exercise heightened vigilance; marginal sea conditions." }
      : risk.category === "HIGH"
      ? { label: "HIGH", text: "text-rose-400", meter: "bg-rose-500", verdict: "Elevated hazard; small craft warned." }
      : { label: "SEVERE", text: "text-red-400", meter: "bg-red-500", verdict: "Severe conditions active; voyage restricted." };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-slate-200">Marine Safety</h3>
        <span className="text-[10px] text-orca-dim font-mono">
          {risk.overall_score}/100
        </span>
      </div>

      {/* Risk verdict — obvious and calm */}
      <div className="flex items-center gap-3">
        <span className={`font-display text-2xl font-bold ${cfg.text} tracking-tight`}>
          {cfg.label}
        </span>
        <span className="text-[12.5px] text-slate-400 leading-snug">{cfg.verdict}</span>
      </div>

      {/* Score meter */}
      <div className="w-full bg-white/[0.05] h-1.5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${cfg.meter}`}
          style={{ width: `${Math.min(Math.max(risk.overall_score, 4), 100)}%` }}
        />
      </div>

      {/* Contributors — flat rows */}
      {risk.contributing_factors && risk.contributing_factors.length > 0 && (
        <div className="pt-1 space-y-1.5">
          {risk.contributing_factors.map((factor, idx) => (
            <div key={idx} className="flex items-center justify-between text-[12.5px] gap-3">
              <span className="text-slate-300 truncate">{factor.name}</span>
              <div className="flex items-center gap-2 flex-shrink-0 font-mono">
                <span className="text-slate-400 text-[11.5px]">{factor.value}</span>
                <span className={`text-[11px] ${factor.points_added > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                  {factor.points_added > 0 ? `+${factor.points_added}` : factor.points_added}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Triggered rules */}
      {risk.triggered_rules && risk.triggered_rules.length > 0 && (
        <div className="pt-1 space-y-1">
          {risk.triggered_rules.map((rule, idx) => (
            <div key={idx} className="flex items-start gap-2 text-[11.5px] text-amber-300/90">
              <AlertTriangle className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />
              <span>{rule}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
