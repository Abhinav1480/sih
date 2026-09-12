"use client";

/**
 * The user's home location and today's conditions there.
 *
 * `useHomeConditions` runs a real conditions query for the saved home
 * harbour (in capture mode that is the recorded conditions answer) and keeps
 * the envelope for a short while in this tab, remembering when it was
 * fetched so the dashboard can say honestly when ORCA last synced. Nothing is
 * shown that did not come back from that call.
 */
import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/lib/auth/session";
import { query, ApiError } from "@/lib/api/client";
import type { Envelope } from "@/lib/types";
import { useLang } from "@/lib/i18n";

export interface HomeLocation {
  name: string;
  latitude: number;
  longitude: number;
}

export function useHomeLocation(): HomeLocation | null {
  const { profile } = useSession();
  const h = profile.home_harbour;
  if (!h || typeof h.latitude !== "number" || typeof h.longitude !== "number" || !Number.isFinite(h.latitude) || !Number.isFinite(h.longitude)) return null;
  return { name: h.name?.trim() ? h.name : `${h.latitude.toFixed(3)}, ${h.longitude.toFixed(3)}`, latitude: h.latitude, longitude: h.longitude };
}

/** Browser position, asked once per call; null when unavailable or refused. */
export function getDevicePosition(): Promise<{ latitude: number; longitude: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
      () => resolve(null),
      { timeout: 8000, maximumAge: 300_000 },
    );
  });
}

interface Cached {
  key: string;
  at: string;
  envelope: Envelope;
  capturedQuestion?: string;
}

/** One fetch outcome, tagged with the key and attempt it answers. */
interface Result {
  key: string;
  nonce: number;
  envelope: Envelope | null;
  capturedQuestion: string | null;
  fetchedAt: string | null;
  error: string | null;
}

const KEY = "orca.home.conditions";
const TTL_MS = 15 * 60 * 1000;
const CONDITIONS_QUERY = "What are the tide, weather and sea conditions near my fishing location?";

function readCache(): Cached | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Cached) : null;
  } catch {
    return null;
  }
}

export interface HomeConditions {
  state: "no_home" | "loading" | "ready" | "error";
  envelope: Envelope | null;
  capturedQuestion: string | null;
  fetchedAt: string | null;
  error: string | null;
  refresh: () => void;
}

export function useHomeConditions(): HomeConditions {
  const home = useHomeLocation();
  const { lang } = useLang();
  const key = home ? `${home.latitude.toFixed(4)},${home.longitude.toFixed(4)}` : null;
  const [nonce, setNonce] = useState(0);
  // Seeded from this tab's cache so a return to the dashboard does not refetch.
  const [result, setResult] = useState<Result | null>(() => {
    const c = readCache();
    if (!c || Date.now() - new Date(c.at).getTime() >= TTL_MS) return null;
    return { key: c.key, nonce: 0, envelope: c.envelope, capturedQuestion: c.capturedQuestion ?? null, fetchedAt: c.at, error: null };
  });

  const current = result && result.key === key && result.nonce === nonce ? result : null;

  useEffect(() => {
    if (!key || !home || current) return;
    let cancelled = false;
    const { latitude, longitude } = home;
    query({ query: CONDITIONS_QUERY, preferred_language: lang, user_location: { latitude, longitude } })
      .then((r) => {
        if (cancelled) return;
        const at = new Date().toISOString();
        setResult({ key, nonce, envelope: r.envelope, capturedQuestion: r.capturedQuestion ?? null, fetchedAt: at, error: null });
        try {
          sessionStorage.setItem(KEY, JSON.stringify({ key, at, envelope: r.envelope, capturedQuestion: r.capturedQuestion } satisfies Cached));
        } catch {
          /* fine */
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setResult({ key, nonce, envelope: null, capturedQuestion: null, fetchedAt: null, error: e instanceof ApiError ? e.code : "network" });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, nonce, current === null]);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  if (!key) return { state: "no_home", envelope: null, capturedQuestion: null, fetchedAt: null, error: null, refresh };
  if (!current) return { state: "loading", envelope: null, capturedQuestion: null, fetchedAt: null, error: null, refresh };
  if (current.error) return { state: "error", envelope: null, capturedQuestion: null, fetchedAt: null, error: current.error, refresh };
  return { state: "ready", envelope: current.envelope, capturedQuestion: current.capturedQuestion, fetchedAt: current.fetchedAt, error: null, refresh };
}
