"use client";

/**
 * Saved trips, in this browser. A trip records where, when, what the
 * conditions were and what ORCA advised: every field is copied from the
 * envelope the person was looking at when they saved it, never recomputed.
 * The backend has no trips endpoint at contract 1.5.0, so the page says the
 * trips live here.
 */
import { useMemo } from "react";
import type { Envelope } from "@/lib/types";
import { readJSON, writeJSON, useStoredJSON } from "@/lib/storage";
import { newId } from "./conversations";

export interface Trip {
  id: string;
  owner: string;
  saved_at: string;
  /** From meta.location. */
  where: { name: string; latitude: number; longitude: number };
  /** From meta.temporal. */
  when: { label: string; start_time: string; end_time: string };
  /** From answer and risk. */
  verdict: string;
  band: string | null;
  score: number | null;
  headline: string;
  /** The advisory card body when present. */
  advised: string | null;
  /** Wave and wind evidence values as sent, with units, or null. */
  wave: { value: string; unit: string; provider: string; provider_tier: string; status: string } | null;
  wind: { value: string; unit: string; provider: string; provider_tier: string; status: string } | null;
  query: string;
  conversation_id: string | null;
  request_id: string;
}

const KEY = "orca.trips";
const EMPTY: Trip[] = [];

export function tripFromEnvelope(env: Envelope, owner: string, query: string, conversationId: string | null): Trip {
  const ev = (re: RegExp) => env.evidence.find((e) => re.test(e.variable) || re.test(e.dataset));
  const pick = (re: RegExp) => {
    const e = ev(re);
    return e ? { value: e.value, unit: e.unit, provider: e.provider, provider_tier: e.provider_tier, status: e.status } : null;
  };
  const advisory = env.cards.find((c) => c.type === "advisory_text");
  return {
    id: newId(),
    owner,
    saved_at: new Date().toISOString(),
    where: { name: env.meta.location.name, latitude: env.meta.location.latitude, longitude: env.meta.location.longitude },
    when: { label: env.meta.temporal.label, start_time: env.meta.temporal.start_time, end_time: env.meta.temporal.end_time },
    verdict: env.answer.verdict,
    band: env.risk ? env.risk.band : null,
    score: env.risk ? env.risk.score : null,
    headline: env.answer.headline,
    advised: advisory && "body" in advisory ? String(advisory.body) : null,
    wave: pick(/wave height/i),
    wind: pick(/wind/i),
    query,
    conversation_id: conversationId,
    request_id: env.request_id,
  };
}

export function saveTrip(trip: Trip) {
  const all = readJSON<Trip[]>(KEY) ?? [];
  all.unshift(trip);
  writeJSON(KEY, all);
}

export function deleteTrip(id: string) {
  writeJSON(KEY, (readJSON<Trip[]>(KEY) ?? []).filter((t) => t.id !== id));
}

export function useTrips(owner: string | null): Trip[] {
  const all = useStoredJSON<Trip[]>(KEY) ?? EMPTY;
  return useMemo(() => (owner ? all.filter((t) => t.owner === owner) : EMPTY), [all, owner]);
}
