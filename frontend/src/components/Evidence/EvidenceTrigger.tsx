"use client";

import React from "react";
import { HelpCircle, Sigma, Database } from "lucide-react";
import { useEvidence } from "./evidenceContext";

type TriggerKind = "why" | "calc" | "count";

interface EvidenceTriggerProps {
  kind?: TriggerKind;
  /** For kind="why": the backend `variable` label to associate this value with. */
  variableHint?: string;
  /** Optional explicit label override. */
  label?: string;
  /** For kind="count": number of sources to display ("Evidence × N"). */
  count?: number;
  /** Render only the icon (no visible text) — for compact metric grids. */
  iconOnly?: boolean;
  className?: string;
}

/**
 * Compact, subtle affordance that links a displayed value to its evidence.
 * Never a large button — an inline "Why?" / "How calculated?" / "Evidence × N"
 * chip that opens the shared EvidencePanel.
 */
export const EvidenceTrigger: React.FC<EvidenceTriggerProps> = ({
  kind = "why",
  variableHint,
  label,
  count,
  iconOnly = false,
  className = "",
}) => {
  const { openWhy, openCalculation, openRegistry } = useEvidence();

  const handle = () => {
    if (kind === "calc") return openCalculation();
    if (kind === "count") return openRegistry();
    return openWhy(variableHint || "");
  };

  const { Icon, text, aria } = (() => {
    if (kind === "calc") {
      return { Icon: Sigma, text: label || "How calculated?", aria: "How this value was calculated" };
    }
    if (kind === "count") {
      return {
        Icon: Database,
        text: label || `Evidence × ${count ?? 0}`,
        aria: `View ${count ?? 0} evidence sources`,
      };
    }
    return {
      Icon: HelpCircle,
      text: label || "Why?",
      aria: variableHint ? `Why: evidence for ${variableHint}` : "View supporting evidence",
    };
  })();

  return (
    <button
      type="button"
      onClick={handle}
      aria-label={aria}
      className={`inline-flex items-center gap-1 text-[10.5px] font-medium text-orca-dim hover:text-orca-cyan rounded-md px-1.5 py-0.5 border border-transparent hover:border-orca-cyan/30 hover:bg-orca-cyan/5 transition focus:outline-none focus-visible:ring-1 focus-visible:ring-orca-cyan/60 ${className}`}
    >
      <Icon className="w-3 h-3 flex-shrink-0" />
      {!iconOnly && <span>{text}</span>}
    </button>
  );
};
