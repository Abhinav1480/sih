"use client";

/**
 * Conversations, persisted in this browser. Each turn keeps the question, the
 * envelope exactly as it arrived, and (in capture mode) the question the
 * recording actually answered. The backend keeps the cross-turn context by
 * `conversation_id`; this store only remembers what was shown.
 */
import { useMemo } from "react";
import type { Envelope } from "@/lib/types";
import { readJSON, writeJSON, useStoredJSON } from "@/lib/storage";

export interface Turn {
  id: string;
  at: string;
  query: string;
  lang: string;
  envelope: Envelope | null;
  capturedQuestion?: string;
  /** Set when the call failed; the turn then has no envelope and says why. */
  error?: string;
}

export interface Conversation {
  id: string;
  /** The backend's session id, sent back as conversation_id on follow-ups. */
  backend_id: string | null;
  title: string;
  created_at: string;
  updated_at: string;
  turns: Turn[];
}

const KEY = "orca.conversations";
const CURRENT = "orca.conversation.current";
const MAX = 40;
const EMPTY: Conversation[] = [];

export function loadConversations(): Conversation[] {
  return readJSON<Conversation[]>(KEY) ?? [];
}

function saveAll(list: Conversation[]) {
  writeJSON(KEY, list.slice(0, MAX));
}

export function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function upsertConversation(c: Conversation) {
  const list = loadConversations().filter((x) => x.id !== c.id);
  list.unshift(c);
  saveAll(list);
}

export function deleteConversation(id: string) {
  saveAll(loadConversations().filter((x) => x.id !== id));
}

export function getCurrentId(): string | null {
  try {
    return sessionStorage.getItem(CURRENT);
  } catch {
    return null;
  }
}

export function setCurrentId(id: string | null) {
  try {
    if (id) sessionStorage.setItem(CURRENT, id);
    else sessionStorage.removeItem(CURRENT);
  } catch {
    /* fine */
  }
}

/** The most recent envelope anywhere in a list, for the Map and Alerts pages. */
export function latestEnvelopeIn(list: Conversation[]): { envelope: Envelope; query: string; conversationId: string } | null {
  for (const c of list) {
    for (let i = c.turns.length - 1; i >= 0; i--) {
      const t = c.turns[i];
      if (t.envelope) return { envelope: t.envelope, query: t.query, conversationId: c.id };
    }
  }
  return null;
}

export function useConversations(): Conversation[] {
  return useStoredJSON<Conversation[]>(KEY) ?? EMPTY;
}

export function useLatestEnvelope() {
  const list = useConversations();
  return useMemo(() => latestEnvelopeIn(list), [list]);
}
