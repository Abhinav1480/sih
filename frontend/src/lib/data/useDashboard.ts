"use client";

/**
 * The dashboard's data (P3-2): conditions now for the home location, and the
 * active alerts. Fetched on open, refetchable, with a defined loading, empty
 * and error state for each part -- the two parts fail independently.
 *
 * "Conditions now" is a real query to POST /api/query, composed in the
 * reader's language from the locale table and the home harbour. The verdict,
 * band and numbers on the card are the API's for that query; the card opens
 * the full answer. Nothing is cached silently: a failed fetch is a failure
 * state with the reason and a retry.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { getApiBase, getBackendMode } from "@/lib/backend/config";
import type { Alert, Envelope } from "@/lib/contract/envelope";

export type Part<T> =
  | { status: "loading" }
  | { status: "ready"; data: T; fetchedAt: string }
  | { status: "error"; kind: "timeout" | "network" | "http" | "no_backend" | "offline_mode"; detail: string };

const TIMEOUT_MS = 30_000;

async function post<T>(path: string, body: unknown, signal: AbortSignal): Promise<T> {
  const base = getApiBase();
  if (!base) throw new Error("no_backend");
  const res = await fetch(`${base}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

async function get<T>(path: string, signal: AbortSignal): Promise<T> {
  const base = getApiBase();
  if (!base) throw new Error("no_backend");
  const res = await fetch(`${base}${path}`, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

function failure(err: unknown, aborted: boolean): Extract<Part<never>, { status: "error" }> {
  const msg = err instanceof Error ? err.message : String(err);
  if (aborted) return { status: "error", kind: "timeout", detail: `${TIMEOUT_MS / 1000}s` };
  if (msg === "no_backend") return { status: "error", kind: "no_backend", detail: "" };
  if (/^HTTP \d+/.test(msg)) return { status: "error", kind: "http", detail: msg };
  return { status: "error", kind: "network", detail: msg };
}

export interface DashboardInput {
  /** The question to ask for "conditions now", already in the reader's language. */
  conditionsQuery: string;
  location: { latitude: number; longitude: number };
  preferredLanguage: string;
  /** Bumps to refetch (e.g. the tab was opened again). */
  nonce: number;
}

export function useDashboard({ conditionsQuery, location, preferredLanguage, nonce }: DashboardInput) {
  const [conditions, setConditions] = useState<Part<Envelope>>({ status: "loading" });
  const [alerts, setAlerts] = useState<Part<Alert[]>>({ status: "loading" });
  const abort = useRef<AbortController | null>(null);

  const load = useCallback(() => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    if (getBackendMode() === "cached") {
      setConditions({ status: "error", kind: "offline_mode", detail: "" });
      setAlerts({ status: "error", kind: "offline_mode", detail: "" });
      clearTimeout(timer);
      return;
    }
    setConditions({ status: "loading" });
    setAlerts({ status: "loading" });

    post<Envelope>("/api/query", { query: conditionsQuery, user_location: location, preferred_language: preferredLanguage }, controller.signal)
      .then((env) => { if (!controller.signal.aborted) setConditions({ status: "ready", data: env, fetchedAt: new Date().toISOString() }); })
      .catch((err) => { if (abort.current === controller) setConditions(failure(err, controller.signal.aborted)); });

    get<Alert[] | Record<string, unknown>[]>(`/api/alerts?latitude=${location.latitude}&longitude=${location.longitude}`, controller.signal)
      .then((list) => { if (!controller.signal.aborted) setAlerts({ status: "ready", data: (Array.isArray(list) ? list : []) as Alert[], fetchedAt: new Date().toISOString() }); })
      .catch((err) => { if (abort.current === controller) setAlerts(failure(err, controller.signal.aborted)); })
      .finally(() => clearTimeout(timer));
  }, [conditionsQuery, location.latitude, location.longitude, preferredLanguage]);

  useEffect(() => { load(); return () => abort.current?.abort(); }, [load, nonce]);

  return { conditions, alerts, reload: load };
}
