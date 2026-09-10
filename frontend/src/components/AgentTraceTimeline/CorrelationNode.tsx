"use client";

import React from "react";
import { GitMerge, Sparkles } from "lucide-react";
import { TraceItem } from "@/lib/types";

interface CorrelationNodeProps {
  item: TraceItem;
  isLast?: boolean;
}

export const CorrelationNode: React.FC<CorrelationNodeProps> = ({ item, isLast = false }) => {
  const meta = item.metadata || {};
  const agents: string[] = meta.agents || (item.agent ? item.agent.split(" + ") : []);

  return (
    <div className="relative flex gap-3 group text-xs animate-fadeIn">
      {/* Vertical Hairline Guide */}
      {!isLast && (
        <div className="absolute left-[11px] top-6 bottom-0 w-px bg-orca-border/70 group-hover:bg-cyan-400/30 transition-colors" />
      )}

      {/* Node Bullet */}
      <div className="relative z-10 flex-shrink-0 w-[23px] h-[23px] rounded-full bg-cyan-950/40 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-[0_0_8px_rgba(0,240,208,0.15)]">
        <GitMerge className="w-3.5 h-3.5" />
      </div>

      {/* Card Content */}
      <div className="flex-1 pb-3 min-w-0">
        <div className="p-2.5 rounded-lg bg-cyan-950/15 border border-cyan-500/25 space-y-1.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="font-semibold text-cyan-300 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              CROSS-AGENT FINDING
            </span>
            {agents.length > 0 && (
              <div className="flex items-center gap-1">
                {agents.map((ag, i) => (
                  <span
                    key={i}
                    className="px-1.5 py-0.5 rounded bg-cyan-900/40 border border-cyan-400/20 text-[10px] text-cyan-200 font-mono"
                  >
                    {ag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="text-[11.5px] text-slate-200 leading-snug">
            {meta.finding || item.summary}
          </div>

          {meta.impact && (
            <div className="text-[10.5px] text-orca-muted pt-1 border-t border-cyan-500/15">
              <span className="text-cyan-400/80 font-medium">Impact: </span>
              {meta.impact}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
