"use client";

import React from "react";
import { RiskIntelligenceModule } from "../Risk";

interface SafetyAssessmentCardProps {
  /** Legacy `risk_assessment` or contract 1.3.0 `risk` block. */
  risk: Record<string, any> | null | undefined;
  locationName?: string;
  temporalLabel?: string;
  verdict?: string;
}

export const SafetyAssessmentCard: React.FC<SafetyAssessmentCardProps> = ({ risk, verdict }) => {
  if (!risk) return null;
  return <RiskIntelligenceModule risk={risk} verdict={verdict} label="MARINE SAFETY RISK" />;
};
