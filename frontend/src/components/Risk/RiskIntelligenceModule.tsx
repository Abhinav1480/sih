"use client";

import React from "react";
import { DeterministicRiskResult } from "@/lib/types";
import { RiskGauge } from "./RiskGauge";
import { RiskFactorList } from "./RiskFactorList";
import { Shield } from "lucide-react";
import { NUM } from "@/components/ui/tone";

export interface RiskIntelligenceModuleProps {
  /** Legacy `risk_assessment` OR contract 1.3.0 `risk` block — both shapes read. */
  risk?: (DeterministicRiskResult & Record<string, any>) | Record<string, any> | null;
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
  className = "",
}) => {
  const frame = `rounded-xl bg-[#0a2432] border border-[#12384a] ${className}`;

  if (isLoading) {
    return (
      <section aria-label="Risk Assessment Loading" className={`${frame} p-4 flex items-center gap-2 text-[11px] ${NUM} text-[#7a94a3]`}>
        <Shield className="w-4 h-4 text-[#38e8d0]" />
        <span>{label}</span>
        <span className="ml-auto flex items-center gap-1.5 text-[#38e8d0]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#38e8d0] animate-ping" /> evaluating factors
        </span>
      </section>
    );
  }

  if (!risk) {
    return (
      <section aria-label="Risk Assessment Unavailable" className={`${frame} p-3.5 flex items-center justify-between gap-3 text-[11px] ${NUM} text-[#7a94a3]`}>
        <span className="flex items-center gap-2"><Shield className="w-4 h-4" />{label}</span>
        <span>risk assessment unavailable</span>
      </section>
    );
  }

  const r = risk as Record<string, any>;
  const score: number = typeof r.score === "number" ? r.score : r.overall_score ?? 0;
  const band: string = r.band || r.category || "";
  const factors = r.factors || r.contributing_factors || [];
  const confidence: number | undefined =
    typeof r.confidence === "number" ? r.confidence : r.confidence_percentage;
  const dataQuality: string | undefined = r.data_quality || r.data_quality_label || r.data_quality_notes;

  return (
    <section aria-label={`${label} Module`} className={`${frame} p-4 space-y-4`}>
      <RiskGauge score={score} band={band} verdict={verdict} label={label} />
      <RiskFactorList
        factors={factors}
        overallScore={score}
        band={band}
        triggeredRules={r.triggered_rules}
        missingInputs={r.missing_inputs}
        dataQualityLabel={dataQuality}
        confidence={confidence}
        showTotalCheck
      />
    </section>
  );
};
