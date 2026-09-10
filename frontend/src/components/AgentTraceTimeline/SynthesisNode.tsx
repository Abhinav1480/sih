"use client";

import React from "react";
import { CheckCircle2, FileText } from "lucide-react";
import { TraceItem } from "@/lib/types";

interface SynthesisNodeProps {
  item: TraceItem;
  isLast?: boolean;
}

export const SynthesisNode: React.FC<SynthesisNodeProps> = ({ item, isLast = false }) => {
  const isCompleted = item.status === "COMPLETED" || item.summary?.includes("READY");

  return (
    <div className="relative flex gap-3 group text-xs animate-fadeIn">
      {/* Vertical Hairline Guide */}
      {!isLast && (
        <div className="absolute left-[11px] top-6 bottom-0 w-px bg-orca-border/70 group-hover:bg-orca-cyan/30 transition-colors" />
      )}

      {/* Node Bullet */}
      <div
        className={`relative z-10 flex-shrink-0 w-[23px] h-[23px] rounded-full border flex items-center justify-center transition-all ${
          isCompleted
            ? "border-emerald-400/50 bg-emerald-950/40 text-emerald-300"
            : "border-orca-cyan/50 bg-cyan-950/40 text-orca-cyan shadow-[0_0_8px_rgba(0,240,208,0.2)]"
        }`}
      >
        {isCompleted ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <div className="w-2 h-2 rounded-full bg-orca-cyan animate-ping" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-3 min-w-0">
        <div className="p-2.5 rounded-lg bg-orca-dark/60 border border-orca-border/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-3.5 h-3.5 text-orca-muted flex-shrink-0" />
            <div className="min-w-0">
              <span className="font-semibold text-white text-[11px] uppercase tracking-wider block">
                SYNTHESIS
              </span>
              <span
                className={`text-[11px] truncate block ${
                  isCompleted ? "text-emerald-300 font-medium" : "text-orca-cyan font-mono tabular-nums text-[10.5px]"
                }`}
              >
                {isCompleted ? "FINAL RESPONSE READY" : "Generating final marine intelligence..."}
              </span>
            </div>
          </div>

          {!isCompleted && (
            <div className="w-16 h-1 rounded-full bg-white/[0.08] overflow-hidden flex-shrink-0">
              <div className="w-full h-full bg-orca-cyan origin-left animate-indeterminate-bar" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
