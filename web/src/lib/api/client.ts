/**
 * The one place the web app obtains an ORCA response.
 *
 * Two transports, chosen by NEXT_PUBLIC_ORCA_API_BASE:
 *
 *   captures  (no base set)  answers come from the frozen reference captures
 *                             under src/captures/, verbatim API output. The UI
 *                             says so on every turn and shows the question the
 *                             capture actually answered.
 *   live      (base set)      POST {base}/api/query, GET {base}/api/alerts
 *
 * Both return the same Envelope. Nothing here alters a response; a reply
 * that is not an envelope is an error, never a partial guess.
 */
import type { AlertBulletin, Envelope, QueryRequest } from "@/lib/types";
import { pickCapture, captureAlerts, CAPTURE_DATE } from "@/lib/captures";

export const API_BASE = (process.env.NEXT_PUBLIC_ORCA_API_BASE ?? "").replace(/\/$/, "");
export const API_MODE: "live" | "captures" = API_BASE ? "live" : "captures";
export { CAPTURE_DATE };

const TIMEOUT_MS = 45_000;

export type ApiErrorCode = "network" | "timeout" | "server" | "bad_response";

export class ApiError extends Error {
  constructor(public code: ApiErrorCode, detail?: string) {
    super(detail ?? code);
  }
}

function isEnvelope(x: unknown): x is Envelope {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return typeof o.request_id === "string" && typeof o.session_id === "string" && !!o.answer && Array.isArray(o.cards)
    && Array.isArray(o.evidence) && Array.isArray(o.layers) && Array.isArray(o.trace) && !!o.meta;
}

async function post<T>(path: string, body: unknown, validate: (x: unknown) => x is T): Promise<T> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    throw new ApiError((e as Error).name === "AbortError" ? "timeout" : "network");
  }
  clearTimeout(timer);
  if (!res.ok) throw new ApiError("server", `HTTP ${res.status}`);
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new ApiError("bad_response");
  }
  if (!validate(json)) throw new ApiError("bad_response");
  return json;
}

export interface QueryResult {
  envelope: Envelope;
  /** Present in capture mode: the question the recorded answer actually belongs to. */
  capturedQuestion?: string;
}

export async function query(req: QueryRequest): Promise<QueryResult> {
  if (API_MODE === "captures") {
    const cap = pickCapture(req);
    // A short pause keeps the thinking state visible; the trace shown after is the capture's own.
    await new Promise((r) => setTimeout(r, 700));
    return { envelope: cap.response, capturedQuestion: cap.question };
  }
  const envelope = await post("/api/query", req, isEnvelope);
  return { envelope };
}

export async function fetchAlerts(loc: { latitude: number; longitude: number } | null): Promise<AlertBulletin[]> {
  if (API_MODE === "captures") {
    await new Promise((r) => setTimeout(r, 300));
    return captureAlerts();
  }
  const qs = loc ? `?latitude=${loc.latitude}&longitude=${loc.longitude}` : "";
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/alerts${qs}`, { signal: ctl.signal });
  } catch (e) {
    clearTimeout(timer);
    throw new ApiError((e as Error).name === "AbortError" ? "timeout" : "network");
  }
  clearTimeout(timer);
  if (!res.ok) throw new ApiError("server", `HTTP ${res.status}`);
  const json: unknown = await res.json().catch(() => {
    throw new ApiError("bad_response");
  });
  if (!Array.isArray(json)) throw new ApiError("bad_response");
  return json as AlertBulletin[];
}
