"use client";

import React, { useState } from "react";
import { RotateCcw, AlertCircle, ArrowRight, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { TraceItem } from "@/lib/types";

interface ReplanNodeProps {
  item: TraceItem;
  isLast?: boolean;
}

export const ReplanNode: React.FC<ReplanNodeProps> = ({ item, isLast = false }) => {
  const [isExpanded, setIsExpanded] = useState(true); // Open by default for demo impact
  const meta = item.metadata || {};

  return (
    <div className="relative flex gap-3 group text-xs animate-fadeIn">
      {/* Vertical Hairline Guide */}
      {!isLast && (
        <div className="absolute left-[11px] top-6 bottom-0 w-px bg-orca-border/70 group-hover:bg-amber-400/30 transition-colors" />
      )}

      {/* Replan Icon Bullet (Restrained Amber Recovery) */}
      <div className="relative z-10 flex-shrink-0 w-[23px] h-[23px] rounded-full bg-amber-950/40 border border-amber-400/50 flex items-center justify-center text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
        <RotateCcw className="w-3.5 h-3.5 stroke-[2.2] animate-spin-slow" />
      </div>

      {/* Main Replan Recovery Container */}
      <div className="flex-1 pb-3 min-w-0">
        <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/40 shadow-sm space-y-2">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-amber-300 text-[11.5px] uppercase tracking-wider flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" />
                ORCA REPLANNED
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-[10px] text-amber-200 font-mono tabular-nums font-medium">
                Self-Healing Recovery
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-amber-400/80 hover:text-amber-200 transition"
              aria-expanded={isExpanded}
            >
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Headline action */}
          <div className="text-[12px] text-slate-200 font-medium leading-relaxed">
            {item.summary || "Telemetry feed unavailable · Reassigning task to fallback calibrated model."}
          </div>

          {/* Expanded Diagnostic Flow */}
          {isExpanded && (
            <div className="mt-2 pt-2 border-t border-amber-500/20 space-y-2 text-[11px]">
              {/* Reason */}
              {meta.reason && (
                <div className="flex items-start gap-1.5 text-slate-300">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-amber-400/90 font-medium">Reason: </span>
                    <span className="font-mono tabular-nums text-[10.5px] text-slate-300">{meta.reason}</span>
                  </div>
                </div>
              )}

              {/* Dynamic Task Reassignment Path */}
              {(meta.failed_source || meta.new_source || meta.reassigned_to) && (
                <div className="p-2 rounded bg-orca-darkest/60 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 text-[10.5px]">
                  <span className="text-orca-muted">Reassignment:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="line-through text-rose-300/80 font-mono tabular-nums">
                      {meta.failed_source || meta.failed_agent || "Primary Source"}
                    </span>
                    <ArrowRight className="w-3 h-3 text-amber-400 flex-shrink-0" />
                    <span className="text-emerald-300 font-medium font-mono tabular-nums">
                      {meta.new_source || meta.reassigned_to || "Fallback Calibrated Model"}
                    </span>
                  </div>
                </div>
              )}

              {/* Recovery Status */}
              <div className="flex items-center gap-1.5 text-[10.5px] text-emerald-400 font-mono tabular-nums">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Task pipeline recovered without query termination</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
