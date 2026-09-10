import { OrcaAnalysisResponse, MarineAlert, ConversationSummary } from "./types";
import { getMockAnalysisResponse } from "../mocks/mockAnalysisResponses";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const FORCE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

export async function submitMarineQuery(
  query: string,
  conversationId?: string,
  preferredLanguage: string = "en"
): Promise<OrcaAnalysisResponse> {
  if (FORCE_MOCKS) {
    // Return structured mock response for offline / demo mode
    return getMockAnalysisResponse(query, conversationId);
  }

  try {
    const res = await fetch(`${API_BASE}/api/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        conversation_id: conversationId,
        preferred_language: preferredLanguage,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Network request failed" }));
      throw new Error(err.detail || "Failed to process marine intelligence query");
    }

    return res.json();
  } catch (err: any) {
    // If backend connection fails in demo/dev mode, gracefully fall back to mock response
    if (err.message && (err.message.includes("Failed to fetch") || err.message.includes("Network request failed"))) {
      console.warn("[ORCA API] Backend unreachable, falling back to mock marine analysis response.");
      return getMockAnalysisResponse(query, conversationId);
    }
    throw err;
  }
}

export async function fetchActiveAlerts(): Promise<MarineAlert[]> {
  try {
    const res = await fetch(`${API_BASE}/api/alerts`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function fetchConversations(): Promise<ConversationSummary[]> {
  try {
    const res = await fetch(`${API_BASE}/api/conversations`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function exportMarkdownReport(
  analysis: OrcaAnalysisResponse
): Promise<{ report_id: string; markdown_content: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/export/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(analysis),
    });
    if (!res.ok) throw new Error("Failed to generate advisory report");
    return res.json();
  } catch {
    return {
      report_id: `rep-${Date.now()}`,
      markdown_content: `# ORCA Marine Intelligence Advisory Report\n\n**Location:** ${analysis.location.name}\n**Time:** ${analysis.temporal.label}\n\n## Executive Summary\n${analysis.executive_summary}\n\n## Recommendation\n${analysis.recommendation}`,
    };
  }
}
