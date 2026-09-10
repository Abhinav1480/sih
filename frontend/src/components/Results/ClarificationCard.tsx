"use client";

import React from "react";
import { HelpCircle, MapPin } from "lucide-react";

interface ClarificationCardProps {
  /** answer.headline of a `needs_clarification` envelope — the question. */
  question?: string;
  missingInfo?: string[];
  /** Quick-pick a port; the parent resubmits in the same conversation. */
  onSelectLocation?: (locationName: string) => void;
}

const COMMON_PORTS = ["Visakhapatnam", "Kakinada", "Chennai", "Paradip", "Mumbai", "Kochi", "Thoothukudi", "Porbandar"];

/**
 * Inline clarification prompt. Not an error: ORCA needs one more detail and
 * the user answers in the same query bar, keeping the conversation_id.
 */
export const ClarificationCard: React.FC<ClarificationCardProps> = ({ question, missingInfo, onSelectLocation }) => {
  return (
    <div id="orca-clarification-card" className="rounded-md border border-caution/40 bg-caution/5 p-4 space-y-3 orca-data-arrive">
      <div className="flex items-center gap-2 text-caution text-[10px] font-semibold uppercase tracking-wider">
        <HelpCircle className="w-3.5 h-3.5" />
        <span>Clarification needed</span>
      </div>

      <h3 className="text-text text-[15px] font-semibold leading-snug">
        {question || "Which coastal port, harbour, or coordinates should ORCA analyse?"}
      </h3>
      <p className="text-xs text-muted">Reply in the query bar below — your answer continues this conversation.</p>

      {missingInfo && missingInfo.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {missingInfo.map((info) => (
            <span key={info} className="num text-[10px] px-2 py-0.5 rounded border border-caution/30 text-caution">
              missing: {info}
            </span>
          ))}
        </div>
      )}

      {onSelectLocation && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {COMMON_PORTS.map((port) => (
            <button
              key={port}
              type="button"
              onClick={() => onSelectLocation(port)}
              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-border-base bg-panel/60 text-[11.5px] text-muted hover:text-text hover:border-accent/40"
            >
              <MapPin className="w-3 h-3" />
              {port}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
