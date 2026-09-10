"use client";

import React, { useMemo } from "react";
import { AgentStepRecord, TraceItem, TraceItemStatus } from "@/lib/types";
import { AgentTraceTimeline } from "./AgentTraceTimeline";

interface AgentActivityFeedProps {
  steps?: AgentStepRecord[];
  traceItems?: TraceItem[];
  isRunning?: boolean;
  totalDurationMs?: number;
  onRetry?: () => void;
  className?: string;
  defaultCollapsed?: boolean;
}

export const AgentActivityFeed: React.FC<AgentActivityFeedProps> = ({
  steps,
  traceItems,
  isRunning = false,
  totalDurationMs,
  onRetry,
  className,
  defaultCollapsed = true,
}) => {
  // Convert AgentStepRecord[] into rich TraceItem[] if traceItems are not provided directly
  const items: TraceItem[] = useMemo(() => {
    if (traceItems && traceItems.length > 0) {
      return traceItems;
    }

    if (!steps || steps.length === 0) return [];

    return steps.map((step, idx) => {
      const agentLower = step.agent.toLowerCase();
      const actionLower = step.action.toLowerCase();

      let type: TraceItem["type"] = "agent_result";
      let status: TraceItemStatus = (step.status as TraceItemStatus) || "COMPLETED";

      if (agentLower.includes("planner") || actionLower.includes("plan")) {
        type = "planner";
      } else if (actionLower.includes("replan") || agentLower.includes("replan")) {
        type = "replan";
        status = "REPLANNED";
      } else if (agentLower.includes("correlation") || actionLower.includes("correlation")) {
        type = "correlation";
      } else if (agentLower.includes("risk") || actionLower.includes("risk")) {
        type = "risk";
      } else if (agentLower.includes("synthesis") || agentLower.includes("report") || actionLower.includes("synthesiz")) {
        type = "synthesis";
      }

      return {
        id: `step-${idx}-${step.agent.replace(/\s+/g, "-")}`,
        type,
        timestamp: step.timestamp || new Date().toISOString(),
        agent: step.agent,
        title: step.agent,
        summary: step.action,
        status,
        duration_ms: step.duration_ms,
        duration: step.duration_ms ? Number((step.duration_ms / 1000).toFixed(2)) : undefined,
        metadata: {
          tool: step.tool,
          details: step.details,
        },
      };
    });
  }, [steps, traceItems]);

  if (items.length === 0 && !isRunning) return null;

  return (
    <AgentTraceTimeline
      items={items}
      isRunning={isRunning}
      totalDurationMs={totalDurationMs}
      onRetry={onRetry}
      className={className}
      defaultCollapsed={defaultCollapsed}
    />
  );
};
