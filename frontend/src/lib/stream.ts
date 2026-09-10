import {
  SSETraceEvent,
  TraceItem,
  TraceItemStatus,
  OrcaAnalysisResponse,
} from "./types";
import { getApiBase, getBackendMode } from "./backend/config";

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
        items[parentIdx] = { ...items[parentIdx], children: [...existingChildren, messageChild] };
      } else {
        items.push(messageChild);
      }
      break;
    }

    case "agent_result": {
      // Contract 1.3.0 trace rows carry seq/status/detail; SKIPPED rows are kept
      // as their own nodes (never merged away) so unavailable sources stay visible.
      const rowStatus = ((event.status || payload.status || "COMPLETED") as string).toUpperCase() as TraceItemStatus;
      const seq = event.seq ?? payload.seq;
      const id =
        rowStatus === "SKIPPED" || seq != null
          ? `trace-${seq ?? Date.now()}-${agentName.toLowerCase().replace(/\s+/g, "-")}`
          : `agent-${agentName.toLowerCase().replace(/\s+/g, "-")}`;
      const existingIdx = items.findIndex((i) => i.id === id);
      const durMs = payload.duration_ms || event.duration_ms || 0;
      const evIds = payload.evidence_ids || event.evidence_ids || [];
      const detail = event.detail || payload.detail || payload.details;

      const resultItem: Partial<TraceItem> = {
        status: rowStatus,
        summary: payload.summary || event.action || "Telemetry evaluated",
        duration_ms: durMs,
        duration: durMs ? Number((durMs / 1000).toFixed(2)) : undefined,
        evidenceIds: evIds,
        metadata: { ...(payload.metadata || {}), tool: (event as any).tool ?? payload.tool, details: detail },
      };

      if (existingIdx >= 0) {
        items[existingIdx] = { ...items[existingIdx], ...resultItem };
      } else {
        items.push({
          id,
          type: "agent_result",
          timestamp: now,
          agent: agentName,
          title: agentName,
          summary: resultItem.summary!,
          status: rowStatus,
          duration_ms: durMs,
          duration: resultItem.duration,
          evidenceIds: evIds,
          metadata: resultItem.metadata,
          children: [],
        });
      }
      break;
    }

    case "replan": {
      const replanId = `replan-${Date.now()}`;
      const failedAgent = payload.failed_agent;
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
      const agentsInvolved = payload.agents || [];
      items.push({
        id: `corr-${Date.now()}`,
        type: "correlation",
        timestamp: now,
        agent: agentsInvolved.join(" + ") || "Cross-Agent Correlation",
        title: "CROSS-AGENT FINDING",
        summary: payload.finding || event.action || "Cross-agent correlation established",
        status: "COMPLETED",
        metadata: { agents: agentsInvolved, finding: payload.finding, impact: payload.impact, title: payload.title },
      });
      break;
    }

    case "risk": {
      const existingIdx = items.findIndex((i) => i.type === "risk");
      const riskScore = typeof payload.score === "number" ? payload.score : 0;
      const riskBand = payload.band || "LOW";
      const riskItem: TraceItem = {
        id: "node-risk-engine",
        type: "risk",
        timestamp: now,
        agent: "Deterministic Risk Engine",
        title: "RISK ENGINE",
        summary: `${riskBand} · ${riskScore} / 100`,
        status: "COMPLETED",
        metadata: { score: riskScore, band: riskBand, key_factors: payload.key_factors || [] },
      };
      if (existingIdx >= 0) items[existingIdx] = { ...items[existingIdx], ...riskItem };
      else items.push(riskItem);
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
      if (existingIdx >= 0) items[existingIdx] = { ...items[existingIdx], ...synthItem };
      else items.push(synthItem);
      break;
    }

    case "done": {
      const existingIdx = items.findIndex((i) => i.type === "done");
      const totalAgents =
        payload.total_agents || items.filter((i) => i.type === "agent_start" || i.type === "agent_result").length;
      const totalDur = payload.total_duration_ms || event.duration_ms || 0;
      const secStr = (totalDur / 1000).toFixed(1);
      const doneItem: TraceItem = {
        id: "node-done",
        type: "done",
        timestamp: now,
        agent: "ORCA Orchestrator",
        title: "✓ ANALYSIS COMPLETE",
        summary: event.detail || payload.detail || `${totalAgents} agents · ${secStr}s`,
        status: "COMPLETED",
        duration_ms: totalDur,
        duration: Number(secStr),
        metadata: payload,
      };
      if (existingIdx >= 0) items[existingIdx] = { ...items[existingIdx], ...doneItem };
      else items.push(doneItem);
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
        metadata: { recoverable: payload.recoverable !== false, message: payload.message },
      });
      break;
    }

    default:
      break;
  }

  return items;
}

/** Parse one SSE frame body into a trace event and hand it to callbacks. */
function dispatchSSEFrame(rawMessage: string, callbacks: StreamCallbacks) {
  let stage = "";
  let dataStr = "";
  for (const line of rawMessage.split("\n")) {
    if (line.startsWith("event:")) stage = line.slice(6).trim();
    else if (line.startsWith("data:")) dataStr = line.slice(5).trim();
  }
  if (!dataStr) return;
  try {
    const parsed = JSON.parse(dataStr);
    callbacks.onEvent({
      stage: (stage || parsed.stage || parsed.type || "agent_result") as any,
      seq: parsed.seq,
      agent: parsed.agent,
      action: parsed.action,
      duration_ms: parsed.duration_ms,
      status: parsed.status,
      detail: parsed.detail,
      evidence_ids: parsed.evidence_ids,
      payload: parsed.payload || parsed,
      timestamp: parsed.timestamp || new Date().toISOString(),
    });
  } catch {
    // Ignore unparseable raw chunks
  }
}

async function readSSE(response: Response, callbacks: StreamCallbacks) {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() || "";
    for (const f of frames) if (f.trim()) dispatchSSEFrame(f, callbacks);
  }
}

const isSSE = (r: Response) =>
  r.ok && !!r.body && (r.headers.get("content-type") || "").includes("text/event-stream");

/**
 * Live trace stream. Tries POST then GET {getApiBase()}/api/query/stream. When the
 * endpoint is unavailable (404 today) it resolves quietly with no events; the
 * caller then reveals `trace[]` from the completed /api/query response
 * (see AgentActivityFeed's staggered reveal). No mock telemetry is ever emitted.
 */
export async function streamOrcaAnalysis(
  query: string,
  conversationId: string | undefined,
  language: string,
  callbacks: StreamCallbacks,
  abortController?: AbortController
): Promise<void> {
  if (getBackendMode() === "cached") {
    callbacks.onComplete();
    return;
  }
  const url = `${getApiBase()}/api/query/stream`;
  const signal = abortController?.signal;
  try {
    let res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify({ query, conversation_id: conversationId, preferred_language: language }),
      signal,
    });
    if (!isSSE(res)) {
      const qs = new URLSearchParams({ query, preferred_language: language });
      if (conversationId) qs.set("conversation_id", conversationId);
      res = await fetch(`${url}?${qs}`, { headers: { Accept: "text/event-stream" }, signal });
    }
    if (isSSE(res)) {
      await readSSE(res, callbacks);
      callbacks.onComplete();
      return;
    }
    callbacks.onError(`stream endpoint unavailable (${res.status})`, true);
  } catch (err: any) {
    if (err?.name === "AbortError") return;
    callbacks.onError(err?.message || "stream failed", true);
  }
  callbacks.onComplete();
}
