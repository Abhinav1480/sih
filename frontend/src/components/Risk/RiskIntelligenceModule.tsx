"use client";

import React from "react";
import { DeterministicRiskResult } from "@/lib/types";
import { RiskGauge } from "./RiskGauge";
import { RiskFactorList } from "./RiskFactorList";
import { Shield, Sparkles } from "lucide-react";

export interface RiskIntelligenceModuleProps {
  risk?: DeterministicRiskResult | null;
  verdict?: "GO" | "CAUTION" | "NO_GO" | "NOT_APPLICABLE" | string;
  label?: string;
  isLoading?: boolean;
  locationName?: string;
  temporalLabel?: string;
  defaultExpanded?: boolean;
  className?: string;
}

export const RiskIntelligenceModule: React.FC<RiskIntelligenceModuleProps> = ({
  risk,
  verdict,
  label = "MARINE RISK",
  isLoading = false,
  locationName,
  temporalLabel,
  defaultExpanded = false,
  className = "",
}) => {
  // Loading State: Honest "Analyzing..." without fake placeholder scores
  if (isLoading) {
    return (
      <section
        aria-label="Risk Assessment Loading"
        className={`p-4 rounded-xl bg-orca-dark/50 border border-orca-border/70 space-y-3 ${className}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-orca-cyan" />
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-orca-muted">
              {label}
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-orca-cyan/10 border border-orca-cyan/30 text-orca-cyan text-[10px] font-mono flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-orca-cyan animate-ping" />
            Evaluating factors...
          </span>
        </div>

        <div className="flex items-center gap-2.5 pt-1 text-slate-300 text-xs font-mono">
          <Sparkles className="w-3.5 h-3.5 text-orca-cyan animate-spin-slow" />
          <span>Synthesizing hydrodynamic wave, wind, and boundary threshold rules...</span>
        </div>
      </section>
    );
  }

  // Safe Missing State: Honest statement without fabricating risk level
  if (!risk) {
    return (
      <section
        aria-label="Risk Assessment Unavailable"
        className={`p-3.5 rounded-xl bg-white/[0.02] border border-orca-border/50 text-xs text-orca-muted flex items-center justify-between gap-3 ${className}`}
      >
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-orca-dim" />
          <span className="font-mono text-[11px] uppercase tracking-wider text-orca-muted">
            {label}
          </span>
        </div>
        <span className="text-[11px] font-mono text-orca-dim">Risk assessment unavailable</span>
      </section>
    );
  }

  const score = typeof risk.score === "number" ? risk.score : risk.overall_score ?? 0;
  const band = risk.band || risk.category || "LOW";
  const factors = risk.factors || risk.contributing_factors || [];

  return (
    <section
      aria-label={`${label} Module`}
      className={`p-4 rounded-xl bg-orca-dark/60 border border-orca-border/80 space-y-4 shadow-sm ${className}`}
    >
      {/* 1. Primary Risk Gauge with Band, Score, Track, and Verdict */}
      <RiskGauge
        score={score}
        band={band}
        verdict={verdict}
        label={label}
        showTrack={true}
      />

      {/* 2. Factor Decomposition List with Contribution Bars & Rules */}
      <RiskFactorList
        factors={factors}
        overallScore={score}
        triggeredRules={risk.triggered_rules}
        missingInputs={risk.missing_inputs}
        dataQualityLabel={risk.data_quality_label || risk.data_quality}
        defaultExpanded={defaultExpanded}
        showTotalCheck={true}
      />
    </section>
  );
};
