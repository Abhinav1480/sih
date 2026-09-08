"use client";

import React from "react";
import { ShieldCheck, AlertTriangle, AlertOctagon, Info, CheckCircle } from "lucide-react";
import { DeterministicRiskResult } from "@/lib/types";

interface SafetyAssessmentCardProps {
  risk: DeterministicRiskResult;
  locationName: string;
  temporalLabel: string;
}

export const SafetyAssessmentCard: React.FC<SafetyAssessmentCardProps> = ({
  risk,
  locationName,
  temporalLabel,
}) => {
  const isLow = risk.category === "LOW";
  const isMod = risk.category === "MODERATE";
  const isHigh = risk.category === "HIGH";
  const isSevere = risk.category === "SEVERE";

  const badgeColor = isLow
    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
    : isMod
    ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
    : isHigh
    ? "bg-rose-500/20 text-rose-400 border-rose-500/40"
    : "bg-red-600/30 text-red-400 border-red-500/50";

  const dialColor = isLow
    ? "text-emerald-400"
    : isMod
    ? "text-amber-400"
    : isHigh
    ? "text-rose-400"
    : "text-red-500";

  return (
    <div className="bg-orca-card border border-orca-border rounded-2xl p-5 space-y-4 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-orca-border/60 pb-3">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-orca-muted font-bold">
            Marine Safety Assessment
          </div>
          <div className="font-display font-bold text-lg text-white">
            {locationName} · <span className="text-sm font-normal text-slate-300">{temporalLabel}</span>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-bold border ${badgeColor}`}>
          {risk.category} RISK
        </div>
      </div>

      {/* Main Score Dial & Gauge */}
      <div className="flex items-center gap-6 py-1">
        <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-orca-darkest border-2 border-orca-border flex-shrink-0">
          <div className="text-center">
            <span className={`font-display text-3xl font-extrabold ${dialColor}`}>
              {risk.overall_score}
            </span>
            <span className="text-[10px] text-orca-muted block font-semibold">/ 100</span>
          </div>
        </div>

        <div className="space-y-1.5 flex-1 text-xs">
          <div className="font-semibold text-slate-200">
            Deterministic Composite Hazard Index
          </div>
          <p className="text-orca-muted leading-relaxed">
            Derived through authoritative multi-sensor matrix evaluation across wave height, wind shear, swell surge, and active coastal meteorological warnings.
          </p>
          <div className="flex items-center gap-2 text-[10px] text-orca-cyan">
            <span>Confidence: {risk.confidence_percentage}%</span>
            <span>•</span>
            <span>{risk.data_quality_label}</span>
          </div>
        </div>
      </div>

      {/* Contributing Factors Decomposition */}
      <div className="space-y-2">
        <div className="text-[11px] uppercase font-bold text-orca-muted flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-orca-cyan" />
          <span>Transparent Hazard Factor Decomposition</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {risk.contributing_factors.map((factor, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-xl bg-orca-darkest/70 border border-orca-border flex items-center justify-between text-xs"
            >
              <div>
                <div className="font-medium text-white text-[11px]">{factor.name}</div>
                <div className="text-[10px] text-orca-muted">{factor.description}</div>
              </div>
              <div className="text-right flex-shrink-0 pl-2">
                <div className="font-bold text-white text-[11px]">{factor.value}</div>
                <span className="text-[10px] font-mono font-bold text-rose-400">
                  +{factor.points_added} pts
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Triggered Authoritative Rules */}
      {risk.triggered_rules && risk.triggered_rules.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="text-[11px] uppercase font-bold text-orca-muted flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-orca-amber" />
            <span>Triggered Authoritative Directives</span>
          </div>
          <div className="space-y-1">
            {risk.triggered_rules.map((rule, idx) => (
              <div
                key={idx}
                className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 text-[11px] flex items-start gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                <span>{rule}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
