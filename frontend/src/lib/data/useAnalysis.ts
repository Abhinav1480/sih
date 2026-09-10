"use client";

/**
 * The one way a screen gets an answer.
 *
 * Three sources, and every screen is told which one it got:
 *
 *   live     -- POST /api/query against the backend in the active mode
 *   cached   -- the last response this phone synced, from Preferences
 *   bundled  -- one of the frozen contract captures shipped in the app, so a
 *               fresh install with no network still renders a complete result
 *
 * A cached or bundled result is stamped `meta.cached` / `meta.cached_at` so
 * the UI can say how old it is. It is never presented as live. Nothing here
 * invents a value; a failure is a failure state the screen renders.
 *
 * Loading can't hang forever: a request is abandoned at QUERY_TIMEOUT_MS and
 * the screen gets an error it can show.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { getApiBase, getBackendMode, loadBackendConfig } from "@/lib/backend/config";
import { loadLastResponse, saveLastResponse } from "@/lib/offline/store";
import type { Envelope, QueryRequest } from "@/lib/contract/envelope";
import { bundledCapture, bundledCaptureForQuery } from "./captures";

export type Source = "live" | "cached" | "bundled";

export type AnalysisState =
  | { phase: "idle" }
  | { phase: "checking"; query: string; startedAt: number }
  | { phase: "answer"; envelope: Envelope; source: Source; savedAt: string | null; query: string }
  | { phase: "error"; query: string; reason: string; retryable: boolean };

const QUERY_TIMEOUT_MS = 30_000;

async function fetchLive(request: QueryRequest, signal: AbortSignal): Promise<Envelope> {
  const base = getApiBase();
  if (!base) throw new Error("no backend configured");
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

export function useAnalysis() {
  const [state, setState] = useState<AnalysisState>({ phase: "idle" });
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    loadBackendConfig();
    return () => abort.current?.abort();
  }, []);

  /** Serve a cached or bundled answer without asking the network. */
  const serveOffline = useCallback(async (query: string): Promise<boolean> => {
    const last = await loadLastResponse();
    if (last?.response && "answer" in (last.response as object)) {
      setState({
        phase: "answer",
        envelope: stamp(last.response as unknown as Envelope, last.savedAt),
        source: "cached",
        savedAt: last.savedAt,
        query,
      });
      return true;
    }
    const bundled = bundledCaptureForQuery(query) ?? bundledCapture("canonical-02-safe-to-venture.json");
    if (bundled) {
      setState({
        phase: "answer",
        envelope: stamp(bundled.response, bundled.capturedAt),
        source: "bundled",
        savedAt: bundled.capturedAt,
        query,
      });
      return true;
    }
    return false;
  }, []);

  const ask = useCallback(
    async (query: string, location: { latitude: number; longitude: number }, conversationId?: string) => {
      abort.current?.abort();
      const controller = new AbortController();
      abort.current = controller;
      setState({ phase: "checking", query, startedAt: Date.now() });

      if (getBackendMode() === "cached") {
        if (!(await serveOffline(query))) {
          setState({ phase: "error", query, reason: "nothing cached", retryable: false });
        }
        return;
      }

      const timer = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS);
      try {
        const envelope = await fetchLive(
          { query, user_location: location, conversation_id: conversationId },
          controller.signal
        );
        clearTimeout(timer);
        await saveLastResponse(envelope as never);
        setState({ phase: "answer", envelope, source: "live", savedAt: null, query });
      } catch (err) {
        clearTimeout(timer);
        if (controller.signal.aborted && abort.current !== controller) return; // superseded
        // The network failed. Fall back to what the phone has, and say so.
        if (await serveOffline(query)) return;
        const reason = err instanceof Error ? err.message : String(err);
        setState({ phase: "error", query, reason, retryable: true });
      }
    },
    [serveOffline]
  );

  const reset = useCallback(() => {
    abort.current?.abort();
    setState({ phase: "idle" });
  }, []);

  return { state, ask, reset };
}
