"use client";

import React from "react";
import { HelpCircle, Sigma, Database } from "lucide-react";
import { useEvidenceOptional } from "./evidenceContext";

type TriggerKind = "why" | "calc" | "count" | "ids";

interface EvidenceTriggerProps {
  kind?: TriggerKind;
  /** For kind="why": the backend `variable` label to associate this value with. */
  variableHint?: string;
  /** For kind="ids": the card's evidence_ids to open the drawer at. */
  evidenceIds?: string[];
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
 * Never a large button — an inline "why" / "Σ" / "evidence × N" chip that
 * opens the shared EvidencePanel. Renders nothing outside an EvidenceProvider.
 */
export const EvidenceTrigger: React.FC<EvidenceTriggerProps> = ({
  kind = "why",
  variableHint,
  evidenceIds,
  label,
  count,
  iconOnly = false,
  className = "",
}) => {
  const ctx = useEvidenceOptional();
  if (!ctx) return null;
  const { openWhy, openCalculation, openRegistry, openRecords } = ctx;

  const handle = () => {
    if (kind === "calc") return openCalculation();
    if (kind === "count") return openRegistry();
    if (kind === "ids") return openRecords(evidenceIds || []);
    return openWhy(variableHint || "");
  };

  const { Icon, text, aria } = (() => {
    if (kind === "calc") {
      return { Icon: Sigma, text: label || "how calculated", aria: "How this value was calculated" };
    }
    if (kind === "count") {
      return {
        Icon: Database,
        text: label || `evidence × ${count ?? 0}`,
        aria: `View ${count ?? 0} evidence sources`,
      };
    }
    if (kind === "ids") {
      const n = evidenceIds?.length ?? 0;
      return {
        Icon: Database,
        text: label || `evidence × ${n}`,
        aria: n > 0 ? `Open ${n} evidence records for this card` : "No evidence records for this card",
      };
    }
    return {
      Icon: HelpCircle,
      text: label || "why",
      aria: variableHint ? `Why: evidence for ${variableHint}` : "View supporting evidence",
    };
  })();

  return (
    <button
      type="button"
      onClick={handle}
      aria-label={aria}
      title={aria}
      className={`inline-flex items-center gap-1 text-[10px] font-mono tabular-nums text-[#7a94a3] hover:text-[#38e8d0] rounded px-1 py-px border border-[#12384a] hover:border-[#38e8d0]/50 transition focus:outline-none focus-visible:ring-1 focus-visible:ring-[#38e8d0]/60 ${className}`}
    >
      <Icon className="w-2.5 h-2.5 flex-shrink-0" />
      {!iconOnly && <span>{text}</span>}
    </button>
  );
};
