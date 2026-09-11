"use client";

/**
 * The one way a screen gets an answer.
 *
 * Three sources, and every screen is told which one it got:
 *
 *   live     -- POST /api/query against the backend in the active mode
 *   cached   -- the last response this phone synced, from Preferences
 *   bundled  -- one of the frozen contract captures shipped in the app
 *
 * The answer shown for a question is the API's answer to THAT question.
 * When the live call fails, the screen gets an error state with the reason
 * and, alongside it, what the phone holds -- the saved answer and a bundled
 * example, each named by the question it actually answered. Nothing is
 * rendered from cache unless the reader chooses it, and then it is stamped
 * `meta.cached` / `meta.cached_at` so it is never presented as live.
 *
 * Loading can't hang forever: a request is abandoned at QUERY_TIMEOUT_MS.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { getApiBase, getBackendMode, loadBackendConfig } from "@/lib/backend/config";
import { loadLastResponse, saveLastResponse } from "@/lib/offline/store";
import type { Envelope, QueryRequest } from "@/lib/contract/envelope";
import { bundledCapture, bundledCaptureForQuery } from "./captures";

export type Source = "live" | "cached" | "bundled";

/** An answer the phone holds, offered -- not shown -- when the live call fails. */
export interface OfflineOffer {
  source: "cached" | "bundled";
  /** The question this answer was produced for. Shown beside the offer, verbatim. */
  query: string;
  savedAt: string;
  envelope: Envelope;
}

export type FailureKind = "timeout" | "network" | "http" | "no_backend" | "cached_mode";

export type AnalysisState =
  | { phase: "idle" }
  | { phase: "checking"; query: string; startedAt: number }
  | { phase: "answer"; envelope: Envelope; source: Source; savedAt: string | null; query: string }
  | { phase: "error"; query: string; kind: FailureKind; detail: string; offers: OfflineOffer[] };

const QUERY_TIMEOUT_MS = 30_000;
const DEFAULT_EXAMPLE = "canonical-02-safe-to-venture.json";

async function fetchLive(request: QueryRequest, signal: AbortSignal): Promise<Envelope> {
  const base = getApiBase();
  if (!base) throw new Error("no_backend");
  const res = await fetch(`${base}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as Envelope;
}

function stamp(envelope: Envelope, savedAt: string): Envelope {
  return { ...envelope, meta: { ...envelope.meta, cached: true, cached_at: savedAt } };
}

/** What the phone could show instead, each labelled by its own question. */
async function offlineOffers(query: string): Promise<OfflineOffer[]> {
  const offers: OfflineOffer[] = [];
  const last = await loadLastResponse();
  const lastEnv = last?.response as unknown as Envelope | undefined;
  if (lastEnv && "answer" in (lastEnv as object) && lastEnv.meta?.query_text) {
    offers.push({ source: "cached", query: lastEnv.meta.query_text, savedAt: last!.savedAt, envelope: stamp(lastEnv, last!.savedAt) });
  }
  const bundled = bundledCaptureForQuery(query) ?? bundledCapture(DEFAULT_EXAMPLE);
  if (bundled) {
    offers.push({ source: "bundled", query: bundled.query, savedAt: bundled.capturedAt, envelope: stamp(bundled.response, bundled.capturedAt) });
  }
  return offers;
}

function classify(err: unknown, aborted: boolean): { kind: FailureKind; detail: string } {
  const msg = err instanceof Error ? err.message : String(err);
  if (aborted) return { kind: "timeout", detail: `${QUERY_TIMEOUT_MS / 1000}s` };
  if (msg === "no_backend") return { kind: "no_backend", detail: "" };
  if (/^HTTP \d+/.test(msg)) return { kind: "http", detail: msg };
  return { kind: "network", detail: msg };
}

export function useAnalysis() {
  const [state, setState] = useState<AnalysisState>({ phase: "idle" });
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    loadBackendConfig();
    return () => abort.current?.abort();
  }, []);

  const ask = useCallback(
    async (query: string, location: { latitude: number; longitude: number }, conversationId?: string) => {
      abort.current?.abort();
      const controller = new AbortController();
      abort.current = controller;
      setState({ phase: "checking", query, startedAt: Date.now() });

      if (getBackendMode() === "cached") {
        // Offline mode is a choice, but the saved answer is still only offered, named by its question.
        setState({ phase: "error", query, kind: "cached_mode", detail: "", offers: await offlineOffers(query) });
        return;
      }

      const timer = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS);
      console.info("[query] request", JSON.stringify({ query, user_location: location }));
      try {
        const envelope = await fetchLive({ query, user_location: location, conversation_id: conversationId }, controller.signal);
        clearTimeout(timer);
        console.info("[query] response", JSON.stringify({ query_text: envelope.meta?.query_text, intent: envelope.intent, verdict: envelope.answer?.verdict, band: envelope.risk?.band, score: envelope.risk?.score, request_id: envelope.request_id }));
        await saveLastResponse(envelope as never);
        setState({ phase: "answer", envelope, source: "live", savedAt: null, query });
      } catch (err) {
        clearTimeout(timer);
        if (controller.signal.aborted && abort.current !== controller) return; // superseded by a newer ask
        const { kind, detail } = classify(err, controller.signal.aborted);
        console.warn("[query] failed", kind, detail);
        setState({ phase: "error", query, kind, detail, offers: await offlineOffers(query) });
      }
    },
    []
  );

  /** The reader chose an offered answer. It renders as cached, named by its own question. */
  const showOffer = useCallback((offer: OfflineOffer) => {
    setState({ phase: "answer", envelope: offer.envelope, source: offer.source, savedAt: offer.savedAt, query: offer.query });
  }, []);

  const reset = useCallback(() => {
    abort.current?.abort();
    setState({ phase: "idle" });
  }, []);

  return { state, ask, showOffer, reset };
}
