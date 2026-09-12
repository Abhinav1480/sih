"use client";

/**
 * Small, honest localStorage wrapper. Every read and write is guarded: a
 * private window, a blocked origin or a full quota returns null / false
 * rather than throwing inside a render. Nothing here is ever a measurement;
 * it holds preferences, guest details, conversations and trips.
 *
 * `useStoredJSON` exposes a key as an external store, so components read it
 * with useSyncExternalStore: no effect, no setState-after-mount, and every
 * tab sees a write (via the storage event) as well as the writing tab (via
 * the listeners below).
 */
import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

export function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeJSON(key: string, value: unknown): boolean {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
    listeners.forEach((l) => l());
    return true;
  } catch {
    return false;
  }
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  const onStorage = () => cb();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

/** Parsed snapshots keyed by raw text, so an unchanged key returns the same object. */
const cache = new Map<string, { raw: string | null; value: unknown }>();

function snapshot<T>(key: string): T | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    raw = null;
  }
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.value as T | null;
  let value: T | null = null;
  try {
    value = raw ? (JSON.parse(raw) as T) : null;
  } catch {
    value = null;
  }
  cache.set(key, { raw, value });
  return value;
}

/** A localStorage key as React state. Null on the server and when absent. */
export function useStoredJSON<T>(key: string): T | null {
  return useSyncExternalStore(subscribe, () => snapshot<T>(key), () => null);
}

/** The current minute as a stable snapshot, for "upcoming versus past" splits. Zero on the server. */
export function useNow(intervalMs = 60_000): number {
  return useSyncExternalStore(
    (cb) => {
      const id = setInterval(cb, intervalMs);
      return () => clearInterval(id);
    },
    () => Math.floor(Date.now() / intervalMs) * intervalMs,
    () => 0,
  );
}
