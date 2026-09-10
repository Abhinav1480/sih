"use client";

import React, { useState } from "react";
import {
  Cpu,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { TraceItem } from "@/lib/types";
import { NUM } from "@/components/ui/tone";
import { PlannerNode } from "./PlannerNode";
import { ReplanNode } from "./ReplanNode";
import { CorrelationNode } from "./CorrelationNode";
import { RiskNode } from "./RiskNode";
import { SynthesisNode } from "./SynthesisNode";
import { TraceNode } from "./TraceNode";

interface AgentTraceTimelineProps {
  items: TraceItem[];
  isRunning?: boolean;
  totalDurationMs?: number;
  onRetry?: () => void;
  className?: string;
  defaultCollapsed?: boolean;
  /** Total rows expected (for the staggered reveal counter). */
  expectedCount?: number;
}

export const AgentTraceTimeline: React.FC<AgentTraceTimelineProps> = ({
  items,
  isRunning = false,
  totalDurationMs,
  onRetry,
  className = "",
  defaultCollapsed = false,
  expectedCount,
}) => {
  const [isOpen, setIsOpen] = useState(!defaultCollapsed);

  if ((!items || items.length === 0) && !isRunning) return null;
  const skippedCount = items.filter((i) => (i.status as string) === "SKIPPED").length;

  // Derive summary metrics
  const completedCount = items.filter(
    (i) => i.status === "COMPLETED" && (i.type === "agent_start" || i.type === "agent_result")
  ).length;
  const runningItem = items.find((i) => i.status === "RUNNING");
  const replanCount = items.filter((i) => i.type === "replan").length;
  const errorItem = items.find((i) => i.type === "error");

  const durationSec = totalDurationMs
    ? (totalDurationMs / 1000).toFixed(2)
    : items.find((i) => i.type === "done")?.duration
    ? items.find((i) => i.type === "done")?.duration?.toFixed(2)
    : null;

  return (
    <section
      aria-label="ORCA Agent Reasoning Trace"
      className={`rounded-xl border border-orca-border/80 bg-orca-dark/40 overflow-hidden text-xs transition-all ${className}`}
    >
      {/* Interactive Header / Status Bar */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="w-full px-3.5 py-2.5 flex items-center justify-between bg-orca-dark/60 hover:bg-orca-dark/90 transition border-b border-orca-border/50 text-left focus:outline-none focus:ring-1 focus:ring-orca-cyan"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex-shrink-0 relative">
            <Cpu className="w-4 h-4 text-orca-cyan" />
            {isRunning && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-orca-cyan animate-ping" />
            )}
          </div>
          <div className="flex items-center gap-2 truncate">
            <span className="font-semibold text-white tracking-wide text-[12px]">
              ORCA REASONING TRACE
            </span>
            {isRunning ? (
              <span className="px-2 py-0.5 rounded-full bg-orca-cyan/10 border border-orca-cyan/30 text-orca-cyan text-[10px] font-mono tabular-nums flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-orca-cyan animate-pulse" />
                Active Analysis
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono tabular-nums flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5" />
                Complete
              </span>
            )}
            {skippedCount > 0 && (
              <span className={`inline-flex px-2 py-0.5 rounded-full border border-[#ffb443]/60 text-[#ffb443] text-[10px] ${NUM} items-center gap-1`}>
                {skippedCount} SKIPPED
              </span>
            )}
            {replanCount > 0 && (
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-[10px] font-mono tabular-nums items-center gap-1">
                <RotateCcw className="w-2.5 h-2.5" />
                Replan Recovered
              </span>
            )}
          </div>
        </div>

        {/* Telemetry metadata */}
        <div className="flex items-center gap-2.5 text-orca-muted flex-shrink-0 text-[11px] font-mono tabular-nums">
          <span className={`text-slate-300 ${NUM}`}>
            {items.length}{expectedCount && expectedCount > items.length ? `/${expectedCount}` : ""} rows
          </span>
          {durationSec && (
            <span className="flex items-center gap-1 text-orca-muted">
              <Clock className="w-3 h-3" />
              {durationSec}s
            </span>
          )}
          <span className="text-orca-dim">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </div>
      </button>

      {/* Vertical Mission-Control Timeline Content */}
      {isOpen && (
        <div className="p-3.5 space-y-0.5 max-h-[480px] overflow-y-auto bg-orca-darkest/70">
          {/* Active running highlight banner if running */}
          {isRunning && runningItem && (
            <div className="mb-3 p-2 rounded-lg bg-orca-cyan/5 border border-orca-cyan/20 flex items-center justify-between text-[11px] text-orca-cyan font-mono tabular-nums animate-pulse">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                {runningItem.title || runningItem.agent}: {runningItem.summary}
              </span>
              <span className="text-[10px] text-orca-muted">Mission In-Progress</span>
            </div>
          )}

          {items.length === 0 && isRunning && (
            <div className={`text-[11px] ${NUM} text-[#7a94a3] flex items-center gap-2 py-1`}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#38e8d0] animate-pulse" />
              awaiting telemetry — live stream unavailable, trace replays on completion
            </div>
          )}

          {/* Render individual trace nodes */}
          {items.map((item, index) => {
            const isLast = index === items.length - 1;

            if (item.type === "planner") {
              return <PlannerNode key={item.id || index} item={item} isLast={isLast} />;
            }
            if (item.type === "replan") {
              return <ReplanNode key={item.id || index} item={item} isLast={isLast} />;
            }
            if (item.type === "correlation") {
              return <CorrelationNode key={item.id || index} item={item} isLast={isLast} />;
            }
            if (item.type === "risk") {
              return <RiskNode key={item.id || index} item={item} isLast={isLast} />;
            }
            if (item.type === "synthesis") {
              return <SynthesisNode key={item.id || index} item={item} isLast={isLast} />;
            }
            if (item.type === "done") {
              return (
                <div key={item.id || index} className="relative flex gap-3 text-xs pt-1">
                  <div className="relative z-10 flex-shrink-0 w-[23px] h-[23px] rounded-full bg-emerald-950/40 border border-emerald-400/50 flex items-center justify-center text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0 pb-1">
                    <div className="p-2 rounded-lg bg-emerald-950/15 border border-emerald-500/25 flex items-center justify-between">
                      <span className="font-semibold text-emerald-300 font-mono tabular-nums text-[11px] uppercase tracking-wide">
                        {item.title}
                      </span>
                      <span className="text-emerald-400 font-mono tabular-nums text-[10.5px]">
                        {item.summary}
                      </span>
                    </div>
                  </div>
                </div>
              );
            }
            if (item.type === "error") {
              return (
                <div key={item.id || index} className="relative flex gap-3 text-xs pt-1">
                  <div className="relative z-10 flex-shrink-0 w-[23px] h-[23px] rounded-full bg-rose-950/40 border border-rose-400/50 flex items-center justify-center text-rose-300">
                    <AlertCircle className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0 pb-1">
                    <div className="p-2.5 rounded-lg bg-rose-950/20 border border-rose-500/30 flex items-center justify-between gap-2">
                      <div>
                        <span className="font-semibold text-rose-200 block text-[11px] uppercase">
                          ANALYSIS FAILED
                        </span>
                        <span className="text-rose-300 text-[11px]">{item.summary}</span>
                      </div>
                      {item.metadata?.recoverable && onRetry && (
                        <button
                          type="button"
                          onClick={onRetry}
                          className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 text-[10.5px] font-mono tabular-nums transition"
                        >
                          Retry
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            // Standard Specialist Agent Nodes (agent_start / agent_result)
            return <TraceNode key={item.id || index} item={item} isLast={isLast} />;
          })}
        </div>
      )}
    </section>
  );
};
