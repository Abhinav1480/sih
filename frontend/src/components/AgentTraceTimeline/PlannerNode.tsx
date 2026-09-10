"use client";

import React, { useState } from "react";
import { Compass, ChevronDown, ChevronUp, Layers, Clock, ShieldCheck, MapPin } from "lucide-react";
import { TraceItem } from "@/lib/types";

interface PlannerNodeProps {
  item: TraceItem;
  isLast?: boolean;
}

export const PlannerNode: React.FC<PlannerNodeProps> = ({ item, isLast = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const meta = item.metadata || {};
  const selectedAgents: string[] = meta.selected_agents || [];
  const constraints: string[] = meta.constraints || [];

  return (
    <div className="relative flex gap-3 group text-xs">
      {/* Vertical Hairline Guide */}
      {!isLast && (
        <div className="absolute left-[11px] top-6 bottom-0 w-px bg-orca-border/70 group-hover:bg-orca-cyan/30 transition-colors" />
      )}

      {/* Node Bullet */}
      <div className="relative z-10 flex-shrink-0 w-[23px] h-[23px] rounded-full bg-orca-dark border border-orca-cyan/40 flex items-center justify-center text-orca-cyan shadow-[0_0_8px_rgba(0,240,208,0.15)]">
        <Compass className="w-3.5 h-3.5 stroke-[2]" />
      </div>

      {/* Content Container */}
      <div className="flex-1 pb-3 min-w-0">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          className="w-full text-left p-2.5 rounded-lg bg-orca-dark/60 border border-orca-border/60 hover:border-orca-cyan/40 hover:bg-orca-dark/90 transition-all focus:outline-none focus:ring-1 focus:ring-orca-cyan"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-semibold text-white tracking-wide text-[11.5px] uppercase">
                {item.title || "ORCA PLANNER"}
              </span>
              <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-orca-cyan/10 border border-orca-cyan/30 text-orca-cyan font-medium truncate">
                {meta.intent || item.summary || "Task Orchestration"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-orca-muted flex-shrink-0">
              <span className="text-[10px] font-mono">{selectedAgents.length} agents</span>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </div>
          </div>

          {/* Compact summary line */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-300">
            {meta.spatial_target && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-orca-cyan" />
                <span className="font-medium text-white">{meta.spatial_target}</span>
              </span>
            )}
            {meta.temporal_window && (
              <span className="flex items-center gap-1 text-orca-muted font-mono text-[10.5px]">
                <Clock className="w-3 h-3" />
                <span>{meta.temporal_window}</span>
              </span>
            )}
          </div>
        </button>

        {/* Expanded Plan Details */}
        {isExpanded && (
          <div className="mt-2 p-2.5 rounded-lg bg-orca-darkest/70 border border-orca-border/60 space-y-2.5 text-[11px]">
            {/* Selected Specialist Agents */}
            {selectedAgents.length > 0 && (
              <div>
                <span className="text-[10px] uppercase tracking-wider text-orca-muted font-mono block mb-1.5">
                  Agents Selected
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedAgents.map((ag) => (
                    <span
                      key={ag}
                      className="px-2 py-0.5 rounded bg-white/[0.04] border border-orca-border/80 text-slate-200 text-[10.5px] font-mono"
                    >
                      {ag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Plan Constraints */}
            {constraints.length > 0 && (
              <div>
                <span className="text-[10px] uppercase tracking-wider text-orca-muted font-mono block mb-1">
                  Constraints Enforced
                </span>
                <ul className="space-y-1 pl-3 text-slate-300">
                  {constraints.map((c, i) => (
                    <li key={i} className="list-disc list-outside text-[10.5px]">
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
