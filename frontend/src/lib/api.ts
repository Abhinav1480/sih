import { OrcaAnalysisResponse, MarineAlert, ConversationSummary } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function submitMarineQuery(
  query: string,
  conversationId?: string,
  preferredLanguage: string = "en"
): Promise<OrcaAnalysisResponse> {
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
}

export async function fetchActiveAlerts(): Promise<MarineAlert[]> {
  const res = await fetch(`${API_BASE}/api/alerts`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchConversations(): Promise<ConversationSummary[]> {
  const res = await fetch(`${API_BASE}/api/conversations`);
  if (!res.ok) return [];
  return res.json();
}

export async function exportMarkdownReport(analysis: OrcaAnalysisResponse): Promise<{ report_id: string; markdown_content: string }> {
  const res = await fetch(`${API_BASE}/api/export/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(analysis),
  });
  if (!res.ok) throw new Error("Failed to generate advisory report");
  return res.json();
}
