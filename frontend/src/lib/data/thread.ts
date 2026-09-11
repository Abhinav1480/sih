"use client";

/**
 * Conversation threads (P3-4).
 *
 * A thread is the reader's turns and ORCA's answers, in order. Follow-ups
 * carry the backend's `session_id` back as `conversation_id`, which is how
 * "what about tomorrow?" resolves against the earlier turn. Threads persist
 * on the phone (Preferences) so history works offline and a thread can be
 * reopened; the server keeps its own copy under /api/conversations.
 *
 * A turn is exactly one of: checking, answered, failed. A failed turn keeps
 * its reason and the offline offers; it is never quietly replaced by another
 * question's answer.
 */

import type { Envelope } from "@/lib/contract/envelope";
import { getJSON, setJSON } from "@/lib/offline/store";
import type { FailureKind, OfflineOffer, Source } from "./useAnalysis";

export interface Turn {
  id: string;
  query: string;
  askedAt: string;
  state: "checking" | "answer" | "error";
  envelope?: Envelope;
  source?: Source;
  savedAt?: string | null;
  error?: { kind: FailureKind; detail: string };
  /** Offers are runtime-only (they hold whole envelopes); not persisted. */
  offers?: OfflineOffer[];
}

export interface Thread {
  id: string;
  /** The backend's session id once the first answer has arrived. */
  conversationId: string | null;
  title: string;
  createdAt: string;
  updatedAt: string;
  turns: Turn[];
}

const KEY = "orca.threads";
const MAX_THREADS = 20;

export const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

export function newThread(): Thread {
  const now = new Date().toISOString();
  return { id: newId(), conversationId: null, title: "", createdAt: now, updatedAt: now, turns: [] };
}

export async function loadThreads(): Promise<Thread[]> {
  return (await getJSON<Thread[]>(KEY)) ?? [];
}

/** Persist a thread (only answered/failed turns, without runtime offers). Newest first, capped. */
export async function saveThread(thread: Thread): Promise<Thread[]> {
  const durable: Thread = {
    ...thread,
    turns: thread.turns.filter((t) => t.state !== "checking").map(({ offers: _o, ...rest }) => rest),
  };
  if (durable.turns.length === 0) return loadThreads();
  const others = (await loadThreads()).filter((t) => t.id !== thread.id);
  const next = [durable, ...others].slice(0, MAX_THREADS);
  await setJSON(KEY, next);
  return next;
}

export async function deleteThread(id: string): Promise<Thread[]> {
  const next = (await loadThreads()).filter((t) => t.id !== id);
  await setJSON(KEY, next);
  return next;
}
