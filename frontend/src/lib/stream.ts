import {
  SSETraceEvent,
  TraceItem,
  TraceItemStatus,
  OrcaAnalysisResponse,
} from "./types";
import { getMockSSEEventsForQuery } from "../mocks/mockSSEEvents";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const FORCE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

export interface StreamCallbacks {
  onEvent: (event: SSETraceEvent) => void;
  onComplete: (response?: OrcaAnalysisResponse) => void;
  onError: (error: string, recoverable: boolean) => void;
}

/**
 * Normalizes and safely merges SSE trace events into a coherent TraceItem timeline.
 * Out-of-order resilient, deduplicating, and correlative.
 */
export function accumulateTraceItems(
  currentItems: TraceItem[],
  event: SSETraceEvent
): TraceItem[] {
  const items = [...currentItems];
  const stage = event.stage;
  const payload = event.payload || event.data || {};
  const agentName = event.agent || payload.agent || "ORCA Specialist";
  const now = event.timestamp || new Date().toISOString();

  switch (stage) {
    case "planner": {
      const existingIdx = items.findIndex((i) => i.type === "planner");
      const plannerItem: TraceItem = {
        id: "node-planner",
        type: "planner",
        timestamp: now,
        agent: "ORCA Task Planner",
        title: "ORCA PLANNER",
        summary: payload.intent || event.action || "Dynamic Query & Spatial Planning",
        status: "COMPLETED",
        metadata: {
          intent: payload.intent,
          spatial_target: payload.spatial_target,
          temporal_window: payload.temporal_window,
          constraints: payload.constraints,
          selected_agents: payload.selected_agents || [],
        },
      };
      if (existingIdx >= 0) {
        items[existingIdx] = { ...items[existingIdx], ...plannerItem };
      } else {
        items.unshift(plannerItem);
      }
      break;
    }

    case "agent_start": {
      const id = `agent-${agentName.toLowerCase().replace(/\s+/g, "-")}`;
      const existingIdx = items.findIndex((i) => i.id === id);
      if (existingIdx >= 0) {
        // If already completed or replanned, do not regress to RUNNING unless requested
        if (items[existingIdx].status === "PENDING") {
          items[existingIdx] = {
            ...items[existingIdx],
            status: "RUNNING",
            summary: payload.task || items[existingIdx].summary || "Analyzing...",
          };
        }
      } else {
        items.push({
          id,
          type: "agent_start",
          timestamp: now,
          agent: agentName,
          title: agentName,
          summary: payload.task || "Analyzing...",
          status: "RUNNING",
          metadata: payload,
          children: [],
        });
      }
      break;
    }

    case "agent_message": {
      const fromAgent = payload.from_agent || agentName;
      const toAgent = payload.to_agent || "Specialist";
      const message = payload.message || event.action || "";

      // Try finding the sender or receiver agent node to attach collaboration note
      const senderId = `agent-${fromAgent.toLowerCase().replace(/\s+/g, "-")}`;
      const parentIdx = items.findIndex((i) => i.id === senderId);

      const messageChild: TraceItem = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: "agent_message",
        timestamp: now,
        agent: fromAgent,
        title: `${fromAgent} → ${toAgent}`,
        summary: message,
        status: "COMPLETED",
        metadata: payload,
      };

      if (parentIdx >= 0) {
        const existingChildren = items[parentIdx].children || [];
        items[parentIdx] = {
          ...items[parentIdx],
          children: [...existingChildren, messageChild],
        };
      } else {
        // Render inline if parent agent hasn't arrived yet (out-of-order resilience)
        items.push(messageChild);
      }
      break;
    }

    case "agent_result": {
      const id = `agent-${agentName.toLowerCase().replace(/\s+/g, "-")}`;
      const existingIdx = items.findIndex((i) => i.id === id);
      const durMs = payload.duration_ms || event.duration_ms || 0;
      const evIds = payload.evidence_ids || event.evidence_ids || [];

      const resultItem: Partial<TraceItem> = {
        status: "COMPLETED" as TraceItemStatus,
        summary: payload.summary || event.action || "Telemetry evaluated",
        duration_ms: durMs,
        duration: durMs ? Number((durMs / 1000).toFixed(2)) : undefined,
        evidenceIds: evIds,
        metadata: { ...(payload.metadata || {}), raw_summary: payload.summary },
      };

      if (existingIdx >= 0) {
        items[existingIdx] = {
          ...items[existingIdx],
          ...resultItem,
        };
      } else {
        // Arrived before agent_start (out-of-order event handling)
        items.push({
          id,
          type: "agent_result",
          timestamp: now,
          agent: agentName,
          title: agentName,
          summary: payload.summary || event.action || "Analysis completed",
          status: "COMPLETED",
          duration_ms: durMs,
          duration: durMs ? Number((durMs / 1000).toFixed(2)) : undefined,
          evidenceIds: evIds,
          metadata: payload.metadata,
          children: [],
        });
      }
      break;
    }

    case "replan": {
      const replanId = `replan-${Date.now()}`;
      const failedAgent = payload.failed_agent;

      // Correlate and annotate the affected agent if identified
      if (failedAgent) {
        const failedId = `agent-${failedAgent.toLowerCase().replace(/\s+/g, "-")}`;
        const fIdx = items.findIndex((i) => i.id === failedId);
        if (fIdx >= 0) {
          items[fIdx] = {
            ...items[fIdx],
            status: "REPLANNED",
            summary: `Primary source timed out · Reassigned to fallback`,
          };
        }
      }

      items.push({
        id: replanId,
        type: "replan",
        timestamp: now,
        agent: "ORCA Task Planner",
        title: "↻ ORCA REPLANNED",
        summary:
          payload.action_taken ||
          `${payload.failed_source || "Telemetry source"} unavailable · Reassigned task to fallback provider`,
        status: "REPLANNED",
        metadata: {
          reason: payload.reason,
          failed_source: payload.failed_source,
          failed_agent: payload.failed_agent,
          reassigned_to: payload.reassigned_to,
          new_source: payload.new_source,
          action_taken: payload.action_taken,
        },
      });
      break;
    }

    case "correlation": {
      const corrId = `corr-${Date.now()}`;
      const agentsInvolved = payload.agents || [];
      items.push({
        id: corrId,
        type: "correlation",
        timestamp: now,
        agent: agentsInvolved.join(" + ") || "Cross-Agent Correlation",
        title: "CROSS-AGENT FINDING",
        summary: payload.finding || event.action || "Cross-agent correlation established",
        status: "COMPLETED",
        metadata: {
          agents: agentsInvolved,
          finding: payload.finding,
          impact: payload.impact,
          title: payload.title,
        },
      });
      break;
    }

    case "risk": {
      const existingIdx = items.findIndex((i) => i.type === "risk");
      const riskScore = typeof payload.score === "number" ? payload.score : 0;
      const riskBand = payload.band || "LOW";
      const factors = payload.key_factors || [];

      const riskItem: TraceItem = {
        id: "node-risk-engine",
        type: "risk",
        timestamp: now,
        agent: "Deterministic Risk Engine",
        title: "RISK ENGINE",
        summary: `${riskBand} · ${riskScore} / 100`,
        status: "COMPLETED",
        metadata: {
          score: riskScore,
          band: riskBand,
          key_factors: factors,
        },
      };

      if (existingIdx >= 0) {
        items[existingIdx] = { ...items[existingIdx], ...riskItem };
      } else {
        items.push(riskItem);
      }
      break;
    }

    case "synthesis": {
      const existingIdx = items.findIndex((i) => i.type === "synthesis");
      const isReady = payload.status === "ready";
      const synthItem: TraceItem = {
        id: "node-synthesis",
        type: "synthesis",
        timestamp: now,
        agent: "Report Synthesis Agent",
        title: "SYNTHESIS",
        summary: isReady ? "FINAL RESPONSE READY" : "Generating final marine intelligence...",
        status: isReady ? "COMPLETED" : "RUNNING",
        metadata: payload,
      };

      if (existingIdx >= 0) {
        items[existingIdx] = { ...items[existingIdx], ...synthItem };
      } else {
        items.push(synthItem);
      }
      break;
    }

    case "done": {
      const existingIdx = items.findIndex((i) => i.type === "done");
      const totalAgents = payload.total_agents || items.filter((i) => i.type === "agent_start" || i.type === "agent_result").length;
      const totalDur = payload.total_duration_ms || event.duration_ms || 0;
      const secStr = (totalDur / 1000).toFixed(1);

      const doneItem: TraceItem = {
        id: "node-done",
        type: "done",
        timestamp: now,
        agent: "ORCA Orchestrator",
        title: "✓ ANALYSIS COMPLETE",
        summary: `${totalAgents} agents · ${secStr}s`,
        status: "COMPLETED",
        duration_ms: totalDur,
        duration: Number(secStr),
        metadata: payload,
      };

      if (existingIdx >= 0) {
        items[existingIdx] = { ...items[existingIdx], ...doneItem };
      } else {
        items.push(doneItem);
      }
      break;
    }

    case "error": {
      items.push({
        id: `node-error-${Date.now()}`,
        type: "error",
        timestamp: now,
        agent: agentName || "System",
        title: "ANALYSIS FAILED",
        summary: payload.message || event.action || "Execution error encountered.",
        status: "FAILED",
        metadata: {
          recoverable: payload.recoverable !== false,
          message: payload.message,
        },
      });
      break;
    }

    default:
      // Ignore unknown stages safely
      break;
  }

  return items;
}

/**
 * Replays mock SSE events sequentially with realistic timing for SIH demos and offline operation.
 */
export function runMockSSEReplay(
  query: string,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): () => void {
  const events = getMockSSEEventsForQuery(query);
  let currentIndex = 0;
  let timerId: any = null;

  const scheduleNext = () => {
    if (signal?.aborted) return;
    if (currentIndex >= events.length) {
      callbacks.onComplete();
      return;
    }

    const currentEvent = events[currentIndex];
    // Dynamic pacing: planner/results slightly slower, messages/starts fast
    let delay = 280;
    if (currentEvent.stage === "planner") delay = 350;
    else if (currentEvent.stage === "replan") delay = 480;
    else if (currentEvent.stage === "correlation") delay = 380;
    else if (currentEvent.stage === "synthesis" && currentEvent.payload?.status === "generating") delay = 450;
    else if (currentEvent.stage === "done") delay = 200;

    timerId = setTimeout(() => {
      if (signal?.aborted) return;
      callbacks.onEvent(currentEvent);
      currentIndex++;
      scheduleNext();
    }, delay);
  };

  scheduleNext();

  return () => {
    if (timerId) clearTimeout(timerId);
  };
}

/**
 * Primary streaming orchestrator.
 * Tries real SSE / stream endpoint first if available.
 * If mock mode is enabled or stream endpoint is unavailable, smoothly executes mock telemetry.
 */
export async function streamOrcaAnalysis(
  query: string,
  conversationId: string | undefined,
  language: string,
  callbacks: StreamCallbacks,
  abortController?: AbortController
): Promise<void> {
  // If explicitly configured for mock mode, replay mock SSE stream immediately
  if (FORCE_MOCKS) {
    runMockSSEReplay(query, callbacks, abortController?.signal);
    return;
  }

  // Attempt real SSE stream if supported by backend (/api/query/stream)
  try {
    const streamUrl = `${API_BASE}/api/query/stream`;
    const response = await fetch(streamUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        query,
        conversation_id: conversationId,
        preferred_language: language,
      }),
      signal: abortController?.signal,
    });

    if (response.ok && response.body && response.headers.get("content-type")?.includes("text/event-stream")) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const rawMessage of lines) {
          if (!rawMessage.trim()) continue;

          let stage: string = "";
          let dataStr: string = "";

          for (const line of rawMessage.split("\n")) {
            if (line.startsWith("event:")) {
              stage = line.slice(6).trim();
            } else if (line.startsWith("data:")) {
              dataStr = line.slice(5).trim();
            }
          }

          if (dataStr) {
            try {
              const parsed = JSON.parse(dataStr);
              const eventStage = (stage || parsed.stage || parsed.type || "agent_result") as any;
              callbacks.onEvent({
                stage: eventStage,
                agent: parsed.agent,
                action: parsed.action,
                duration_ms: parsed.duration_ms,
                payload: parsed.payload || parsed,
                timestamp: parsed.timestamp || new Date().toISOString(),
              });
            } catch (e) {
              // Ignore unparseable raw chunks
            }
          }
        }
      }

      callbacks.onComplete();
      return;
    }
  } catch (err: any) {
    // If aborted by user, return cleanly
    if (err.name === "AbortError") return;
    // Otherwise fallback smoothly to mock SSE replay
  }

  // Graceful fallback for demo or when /api/query/stream is pending BE-04
  runMockSSEReplay(query, callbacks, abortController?.signal);
}
