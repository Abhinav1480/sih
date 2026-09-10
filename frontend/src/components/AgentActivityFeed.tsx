"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AgentStepRecord, TraceItem, TraceItemStatus } from "@/lib/types";
import { AgentTraceTimeline } from "./AgentTraceTimeline";

interface AgentActivityFeedProps {
  /** Legacy `agent_activity[]` (mirror of contract `trace[]`, `details` for `detail`). */
  steps?: AgentStepRecord[];
  /** Contract 1.3.0 `trace[]` — preferred when present. */
  trace?: any[];
  traceItems?: TraceItem[];
  isRunning?: boolean;
  totalDurationMs?: number;
  onRetry?: () => void;
  className?: string;
  defaultCollapsed?: boolean;
  /** Milliseconds between revealed rows when replaying a completed trace. */
  revealStepMs?: number;
}

const slug = (s: string) => s.toLowerCase().replace(/\s+/g, "-");

/** One trace/agent_activity row → a uniform telemetry TraceItem (all render via TraceNode). */
function rowToItem(row: any, idx: number): TraceItem {
  const status = String(row.status || "COMPLETED").toUpperCase() as TraceItemStatus;
  const isDone = row.stage === "done";
  return {
    id: `trace-${row.seq ?? idx}-${slug(String(row.agent || "agent"))}`,
    type: isDone ? "done" : "agent_result",
    timestamp: row.timestamp || "",
    agent: row.agent || "",
    title: isDone ? "✓ ENVELOPE ASSEMBLED" : row.agent || "",
    summary: row.action || "",
    status,
    duration_ms: typeof row.duration_ms === "number" ? row.duration_ms : undefined,
    duration: typeof row.duration_ms === "number" ? Number((row.duration_ms / 1000).toFixed(2)) : undefined,
    evidenceIds: row.evidence_ids || [],
    metadata: {
      seq: row.seq,
      stage: row.stage,
      tool: row.tool,
      details: row.detail ?? row.details,
    },
  };
}

export const AgentActivityFeed: React.FC<AgentActivityFeedProps> = ({
  steps,
  trace,
  traceItems,
  isRunning = false,
  totalDurationMs,
  onRetry,
  className,
  defaultCollapsed = true,
  revealStepMs = 120,
}) => {
  const items: TraceItem[] = useMemo(() => {
    if (traceItems && traceItems.length > 0) return traceItems;
    const rows = trace && trace.length > 0 ? trace : steps || [];
    return rows.map(rowToItem);
  }, [steps, trace, traceItems]);

  // Staggered reveal (~120 ms/row) of a completed trace, once per data arrival.
  // Live SSE items (traceItems) are shown as they arrive, no replay.
  const replay = !(traceItems && traceItems.length > 0);
  const [shown, setShown] = useState(replay ? 0 : items.length);
  useEffect(() => {
    if (!replay) {
      setShown(items.length);
      return;
    }
    setShown(0);
    if (items.length === 0) return;
    let n = 0;
    const id = window.setInterval(() => {
      n += 1;
      setShown(n);
      if (n >= items.length) window.clearInterval(id);
    }, revealStepMs);
    return () => window.clearInterval(id);
  }, [items, replay, revealStepMs]);

  if (items.length === 0 && !isRunning) return null;

  const visible = items.slice(0, shown);
  const revealing = replay && shown < items.length;
  const totalMs =
    totalDurationMs ?? items.reduce((a, i) => a + (i.duration_ms || 0), 0);

  return (
    <AgentTraceTimeline
      items={visible}
      isRunning={isRunning || revealing}
      totalDurationMs={totalMs || undefined}
      onRetry={onRetry}
      className={className}
      defaultCollapsed={defaultCollapsed}
      expectedCount={items.length}
    />
  );
};
