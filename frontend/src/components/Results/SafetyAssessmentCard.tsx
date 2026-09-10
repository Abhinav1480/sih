"use client";

import React from "react";
import { DeterministicRiskResult } from "@/lib/types";
import { RiskIntelligenceModule } from "../Risk";

interface SafetyAssessmentCardProps {
  risk: DeterministicRiskResult;
  locationName?: string;
  temporalLabel?: string;
  verdict?: string;
}

export const SafetyAssessmentCard: React.FC<SafetyAssessmentCardProps> = ({
  risk,
  locationName,
  temporalLabel,
  verdict,
}) => {
  if (!risk) return null;

  return (
    <div className="space-y-2">
      <RiskIntelligenceModule
        risk={risk}
        verdict={verdict}
        label="MARINE SAFETY RISK"
        locationName={locationName}
        temporalLabel={temporalLabel}
      />
    </div>
  );
};
