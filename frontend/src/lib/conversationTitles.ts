import { ConversationSummary, OrcaAnalysisResponse } from "./types";

import { API_BASE } from "./api";

// Memory cache for derived conversation titles to ensure instantaneous rendering
const titleMemoryCache = new Map<string, string>();

/**
 * Derives a concise, intelligent title from either an analysis object or a raw query string.
 * Avoids generic phrases and produces clean, scannable intelligence labels.
 */
export function deriveConversationTitle(
  queryOrTitle: string,
  analysis?: OrcaAnalysisResponse | null
): string {
  // 1. If structured analysis is provided, extract semantic title directly
  if (analysis) {
    const locName = analysis.location?.name;
    const ra = analysis.route_analysis;
    const comp = analysis.comparison_data;
    const sw = analysis.spatial_what_if;
    const intent = analysis.intent;

    if (analysis.query_text) {
      const derivedFromQuery = deriveConversationTitle(analysis.query_text);
      if (derivedFromQuery && derivedFromQuery !== "Coastal Marine Analysis") {
        return derivedFromQuery;
      }
    }

    if (ra?.origin?.name && ra?.destination?.name) {
      return `${ra.origin.name} → ${ra.destination.name} route`;
    }

    if (comp?.location_a?.name && comp?.location_b?.name) {
      return `${comp.location_a.name} vs ${comp.location_b.name}`;
    }

    if (sw?.distance_km && locName) {
      return `${sw.distance_km} km offshore from ${locName}`;
    }

    if (intent === "fishing_zones") {
      return locName ? `Fishing zones near ${locName}` : "Potential fishing zones";
    }

    if (intent === "marine_safety") {
      return locName ? `Safety near ${locName}` : "Marine safety assessment";
    }

    if (intent === "ocean_conditions") {
      return locName ? `Wave conditions near ${locName}` : "Ocean & wave conditions";
    }

    if (intent === "weather_forecast") {
      return locName ? `Weather near ${locName}` : "Marine weather forecast";
    }

    if (intent === "geofence_restriction") {
      return locName ? `Protected areas near ${locName}` : "Marine protected areas";
    }

    if (intent === "historical_trend") {
      return locName ? `24h trend near ${locName}` : "Historical ocean trend";
    }

    if (locName) {
      return `Marine conditions near ${locName}`;
    }
  }

  // 2. Parse query text if title or query is provided
  const text = (queryOrTitle || "").trim();
  if (!text || text.toLowerCase() === "marine decision session") {
    return "Coastal Marine Analysis";
  }

  // Route pattern: "from X to Y" or "X to Y route"
  const routeMatch = text.match(
    /(?:route\s+)?(?:from\s+)?([A-Za-z\s]+?)\s+(?:to|→|->)\s+([A-Za-z\s]+?)(?:\s+(?:cross|pass|route|waters|corridor|tomorrow|safe)|$|\?|\.)/i
  );
  if (routeMatch && routeMatch[1] && routeMatch[2]) {
    const orig = cleanLocationName(routeMatch[1]);
    const dest = cleanLocationName(routeMatch[2]);
    if (orig && dest && orig.toLowerCase() !== dest.toLowerCase()) {
      return `${orig} → ${dest} route`;
    }
  }

  // Distance / Offshore pattern: "30 km offshore from Visakhapatnam"
  const offshoreMatch = text.match(
    /(\d+\s*(?:km|nm|miles)\s+offshore(?:\s+from\s+[A-Za-z]+)?)/i
  );
  if (offshoreMatch) {
    const matched = offshoreMatch[1].trim();
    return matched.charAt(0).toUpperCase() + matched.slice(1);
  }

  // Regional Comparison pattern: "compare ... between X and Y" or "X vs Y"
  const compBetweenMatch = text.match(/between\s+([A-Za-z]+)\s+and\s+([A-Za-z]+)/i);
  if (compBetweenMatch) {
    return `${cleanLocationName(compBetweenMatch[1])} vs ${cleanLocationName(compBetweenMatch[2])}`;
  }
  const vsMatch = text.match(/([A-Za-z]+)\s+(?:vs\.?|versus)\s+([A-Za-z]+)/i);
  if (vsMatch) {
    return `${cleanLocationName(vsMatch[1])} vs ${cleanLocationName(vsMatch[2])}`;
  }

  // Fishing / PFZ pattern: "fishing zones near Visakhapatnam"
  const fishMatch = text.match(
    /(?:fishing|pfz|fish)\s+(?:zones?|grounds?)?.*?(?:near|around|in|off|from)\s+([A-Za-z]+)/i
  );
  if (fishMatch) {
    return `Fishing zones near ${cleanLocationName(fishMatch[1])}`;
  }

  // Protected areas pattern: "protected areas near Kakinada"
  const protMatch = text.match(
    /(?:protected|marine\s+protected|mpa|sanctuary|reserve).*?(?:near|around|in|off|from)\s+([A-Za-z]+)/i
  );
  if (protMatch) {
    return `Protected areas near ${cleanLocationName(protMatch[1])}`;
  }

  // Wave / Sea conditions pattern: "wave conditions near Kakinada"
  const waveMatch = text.match(
    /(?:wave|swell|wave\s+height|wave\s+conditions).*?(?:near|around|in|off|from)\s+([A-Za-z]+)/i
  );
  if (waveMatch) {
    return `Wave conditions near ${cleanLocationName(waveMatch[1])}`;
  }

  // Safety pattern: "Is it safe to go fishing tomorrow morning near Visakhapatnam"
  const safetyMatch = text.match(
    /(?:safe|safety|is\s+it\s+safe).*?(?:near|around|in|off|from)\s+([A-Za-z]+)/i
  );
  if (safetyMatch) {
    return `Safety near ${cleanLocationName(safetyMatch[1])}`;
  }

  // Conditions pattern: "conditions near X"
  const condMatch = text.match(
    /(?:conditions|weather|ocean).*?(?:near|around|in|off|from)\s+([A-Za-z]+)/i
  );
  if (condMatch) {
    return `Conditions near ${cleanLocationName(condMatch[1])}`;
  }

  // Telugu / Vernacular detection: if text has Telugu script and mentions known location
  if (/[\u0C00-\u0C7F]/.test(text)) {
    if (text.includes("విశాఖపట్నం")) return "Visakhapatnam conditions (తెలుగు)";
    if (text.includes("కాకినాడ")) return "Kakinada conditions (తెలుగు)";
    if (text.includes("చెన్నై")) return "Chennai conditions (తెలుగు)";
    return "Marine vernacular query";
  }

  // Clean common conversational boilerplate
  let cleaned = text
    .replace(/^(?:is it safe to go fishing|is it safe to|can you show me|show me|what is the|what are the|tell me about|please check|analyze|show)\s+/i, "")
    .replace(/\s+(?:tomorrow morning|tomorrow evening|tomorrow|today|right now|over the next \d+ hours).*$/i, "")
    .replace(/\s+(?:with favorable chlorophyll and calm waves|explain this in telugu|explain in telugu).*$/i, "")
    .trim()
    .replace(/[?.!]+$/, "");

  if (cleaned.length > 36) {
    cleaned = cleaned.substring(0, 33).trim() + "...";
  }

  if (cleaned.length >= 3) {
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  return "Coastal Marine Analysis";
}

function cleanLocationName(raw: string): string {
  const trimmed = raw.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const lastWord = words[words.length - 1];
  return lastWord.charAt(0).toUpperCase() + lastWord.slice(1).toLowerCase();
}

/**
 * Asynchronously resolves a meaningful title for a conversation.
 * If the conversation title is "Marine Decision Session" or empty, it checks
 * local memory/sessionStorage or queries /api/conversations/{id}/analyses.
 */
export async function resolveConversationTitle(conv: ConversationSummary): Promise<string> {
  // Check memory cache first
  if (titleMemoryCache.has(conv.id)) {
    return titleMemoryCache.get(conv.id)!;
  }

  // Check sessionStorage if running in browser
  if (typeof window !== "undefined") {
    const cached = sessionStorage.getItem(`orca_conv_title_${conv.id}`);
    if (cached && cached !== "Marine Decision Session") {
      titleMemoryCache.set(conv.id, cached);
      return cached;
    }
  }

  // If conversation already has an explicit non-generic title
  if (conv.title && conv.title !== "Marine Decision Session" && conv.title.trim().length > 0) {
    const derived = deriveConversationTitle(conv.title);
    titleMemoryCache.set(conv.id, derived);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(`orca_conv_title_${conv.id}`, derived);
    }
    return derived;
  }

  // Fetch analysis records for this conversation
  try {
    const res = await fetch(`${API_BASE}/api/conversations/${conv.id}/analyses`);
    if (res.ok) {
      const analyses: OrcaAnalysisResponse[] = await res.json();
      if (analyses && analyses.length > 0) {
        const latest = analyses[analyses.length - 1];
        const derived = deriveConversationTitle("", latest);
        titleMemoryCache.set(conv.id, derived);
        if (typeof window !== "undefined") {
          sessionStorage.setItem(`orca_conv_title_${conv.id}`, derived);
        }
        return derived;
      }
    }
  } catch {
    // Graceful fallback on network error
  }

  const fallback = "Coastal Marine Analysis";
  titleMemoryCache.set(conv.id, fallback);
  return fallback;
}

export interface GroupedConversations {
  today: ConversationSummary[];
  yesterday: ConversationSummary[];
  earlier: ConversationSummary[];
}

/**
 * Groups conversations into TODAY, Yesterday, and Earlier based on created_at or updated_at.
 */
export function groupConversationsByDate(
  conversations: ConversationSummary[]
): GroupedConversations {
  const today: ConversationSummary[] = [];
  const yesterday: ConversationSummary[] = [];
  const earlier: ConversationSummary[] = [];

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;

  conversations.forEach((conv) => {
    const dateStr = conv.updated_at || conv.created_at;
    if (!dateStr) {
      earlier.push(conv);
      return;
    }

    const itemDate = new Date(dateStr).getTime();
    if (isNaN(itemDate)) {
      earlier.push(conv);
      return;
    }

    if (itemDate >= todayStart) {
      today.push(conv);
    } else if (itemDate >= yesterdayStart) {
      yesterday.push(conv);
    } else {
      earlier.push(conv);
    }
  });

  return { today, yesterday, earlier };
}
