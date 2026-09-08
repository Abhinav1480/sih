"use client";

import React, { useState } from "react";
import { Cpu, CheckCircle2, ChevronDown, ChevronUp, Clock, Terminal } from "lucide-react";
import { AgentStepRecord } from "@/lib/types";

interface AgentActivityFeedProps {
  steps: AgentStepRecord[];
}

export const AgentActivityFeed: React.FC<AgentActivityFeedProps> = ({ steps }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!steps || steps.length === 0) return null;

  return (
    <div className="bg-orca-card/60 border border-orca-border rounded-xl overflow-hidden text-xs">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-orca-card transition"
      >
        <div className="flex items-center gap-2 text-orca-cyan font-medium">
          <Cpu className="w-4 h-4 text-orca-cyan animate-pulse" />
          <span>Collaborative Agent Telemetry ({steps.length} Agents Executed)</span>
        </div>
        <div className="flex items-center gap-2 text-orca-muted">
          <span className="text-[10px]">Audit Trail</span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {/* Step List */}
      {isOpen && (
        <div className="p-3 border-t border-orca-border space-y-2 max-h-64 overflow-y-auto bg-orca-darkest/60 font-mono text-[11px]">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="p-2 rounded-lg bg-orca-card/50 border border-orca-border/50 flex flex-col gap-1"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-orca-cyan flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  {step.agent}
                </span>
                <span className="text-[10px] text-orca-muted flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {step.duration_ms} ms
                </span>
              </div>
              <div className="text-white text-[11px] font-sans pl-5">
                {step.action}
              </div>
              {step.details && (
                <div className="text-[10px] text-orca-muted pl-5 font-mono">
                  &gt; {step.details}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
