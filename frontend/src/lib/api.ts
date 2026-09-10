import { OrcaAnalysisResponse, MarineAlert, ConversationSummary, Coordinates } from "./types";
import { getMockAnalysisResponse } from "../mocks/mockAnalysisResponses";
import { getApiBase, getBackendMode } from "./backend/config";
import { fallbackCached } from "./backend/fallbackResponse";
import { loadLastResponse, saveLastResponse } from "./offline/store";

export { getApiBase };
/**
 * Backward-compat for `${API_BASE}/api/...` call sites (conversationTitles.ts):
 * stringifies to the CURRENT mode's base URL instead of a build-time constant.
 */
export const API_BASE = { toString: getApiBase };
const FORCE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";
const QUERY_TIMEOUT_MS = 30_000;

export const DEFAULT_USER_LOCATION: Coordinates = { latitude: 16.9891, longitude: 82.2475 }; // Kakinada

export interface CachedMarker {
  savedAt: string;
  source: "last" | "bundled";
}

/** Non-null when the response was served from cache (never live). */
export function getCachedMarker(r: OrcaAnalysisResponse): CachedMarker | null {
  return ((r as any).__cached as CachedMarker | undefined) ?? null;
}

/** Last synced response if any, else the bundled DEMO capture; stamped so the UI can label it. */
async function cachedResponse(): Promise<OrcaAnalysisResponse> {
  const last = await loadLastResponse();
  const { response, savedAt } = last ?? fallbackCached();
  const marker: CachedMarker = { savedAt, source: last ? "last" : "bundled" };
  const out: OrcaAnalysisResponse = {
    ...response,
    meta: { ...(response.meta as any), cached: true, cached_at: savedAt },
  };
  (out as any).__cached = marker;
  return out;
}

export async function submitMarineQuery(
  query: string,
  conversationId?: string,
  preferredLanguage: string = "en",
  userLocation: Coordinates = DEFAULT_USER_LOCATION
): Promise<OrcaAnalysisResponse> {
  if (FORCE_MOCKS) return getMockAnalysisResponse(query, conversationId);
  if (getBackendMode() === "cached") return cachedResponse();

  let res: Response;
  try {
    res = await fetch(`${getApiBase()}/api/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        conversation_id: conversationId ?? null,
        preferred_language: preferredLanguage,
        user_location: userLocation,
      }),
      signal: AbortSignal.timeout(QUERY_TIMEOUT_MS),
    });
  } catch {
    // Network error or timeout: serve cache rather than fail. 4xx/5xx below still throw.
    return cachedResponse();
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const detail = typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail ?? "");
    throw new Error(detail || `Request failed (${res.status}).`);
  }

  const data: OrcaAnalysisResponse = await res.json();
  // Follow-ups: the envelope's session_id is what we send back as conversation_id.
  data.conversation_id = data.session_id || data.conversation_id;
  await saveLastResponse(data);
  return data;
}

export async function fetchActiveAlerts(): Promise<MarineAlert[]> {
  if (getBackendMode() === "cached") return [];
  try {
    const res = await fetch(`${getApiBase()}/api/alerts`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function fetchConversations(): Promise<ConversationSummary[]> {
  if (getBackendMode() === "cached") return [];
  try {
    const res = await fetch(`${getApiBase()}/api/conversations`);
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
    const res = await fetch(`${getApiBase()}/api/export/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(analysis),
    });
    if (!res.ok) throw new Error("Failed to generate advisory report");
    return res.json();
  } catch {
    const loc = analysis.meta?.location || analysis.location;
    const tmp = analysis.meta?.temporal || analysis.temporal;
    return {
      report_id: `rep-${Date.now()}`,
      markdown_content: `# ORCA Marine Intelligence Advisory Report\n\n**Location:** ${loc?.name ?? "—"}\n**Time:** ${tmp?.label ?? "—"}\n\n## Summary\n${analysis.answer?.narrative ?? analysis.executive_summary ?? ""}\n\n## Recommendation\n${analysis.recommendation ?? ""}`,
    };
  }
}
