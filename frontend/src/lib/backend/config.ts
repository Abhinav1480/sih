"use client";
import { useEffect, useState } from "react";
import { isNative } from "../native";
import { getJSON, setJSON, KEYS } from "../offline/store";

export type BackendMode = "local" | "deployed" | "cached";

export interface BackendConfig {
  mode: BackendMode;
  localUrl: string;
  deployedUrl: string;
}

export const DEFAULT_LOCAL_URL = "http://10.134.47.190:8001"; // laptop LAN IP, editable in settings
export const DEFAULT_DEPLOYED_URL =
  process.env.NEXT_PUBLIC_DEPLOYED_API_URL || "https://orca-backend.onrender.com";
/** Web-dev base: what api.ts used before mode switching existed (env or same origin). */
const WEB_LOCAL_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "";

function defaultConfig(): BackendConfig {
  const native = isNative();
  return {
    mode: native ? "local" : process.env.NEXT_PUBLIC_DEPLOYED_API_URL ? "deployed" : "local",
    localUrl: native ? DEFAULT_LOCAL_URL : WEB_LOCAL_URL,
    deployedUrl: DEFAULT_DEPLOYED_URL,
  };
}

// In-memory copy so api.ts/stream.ts can read synchronously.
let current: BackendConfig = defaultConfig();
let ready = false;
const listeners = new Set<(c: BackendConfig) => void>();

function emit() {
  listeners.forEach((l) => l(current));
}

export function subscribe(listener: (c: BackendConfig) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const getBackendConfig = (): BackendConfig => current;
export const getBackendMode = (): BackendMode => current.mode;

/** Base URL for API calls; "" in cached mode (callers must not fetch). */
export function getApiBase(): string {
  if (current.mode === "cached") return "";
  return (current.mode === "deployed" ? current.deployedUrl : current.localUrl).replace(/\/+$/, "");
}

let loading: Promise<BackendConfig> | null = null;
export function loadBackendConfig(): Promise<BackendConfig> {
  if (loading) return loading;
  loading = (async () => {
    const d = defaultConfig();
    const [mode, localUrl, deployedUrl] = await Promise.all([
      getJSON<BackendMode>(KEYS.BACKEND_MODE),
      getJSON<string>(KEYS.BACKEND_LOCAL_URL),
      getJSON<string>(KEYS.BACKEND_DEPLOYED_URL),
    ]);
    current = { mode: mode ?? d.mode, localUrl: localUrl ?? d.localUrl, deployedUrl: deployedUrl ?? d.deployedUrl };
    ready = true;
    emit();
    return current;
  })();
  return loading;
}

export async function saveBackendConfig(c: BackendConfig): Promise<void> {
  current = { ...c };
  emit();
  await Promise.all([
    setJSON(KEYS.BACKEND_MODE, c.mode),
    setJSON(KEYS.BACKEND_LOCAL_URL, c.localUrl),
    setJSON(KEYS.BACKEND_DEPLOYED_URL, c.deployedUrl),
  ]);
}

export function useBackendConfig() {
  const [config, setState] = useState<BackendConfig>(current);
  const [isReady, setReady] = useState(ready);
  useEffect(() => {
    const unsub = subscribe((c) => {
      setState(c);
      setReady(true);
    });
    loadBackendConfig();
    return unsub;
  }, []);
  const setConfig = (next: BackendConfig | ((prev: BackendConfig) => BackendConfig)) =>
    saveBackendConfig(typeof next === "function" ? next(current) : next);
  return { config, setConfig, ready: isReady };
}

/** GET {url}/health with a 4 s timeout. The backend serves /health at the root, not under /api. */
export async function pingBackend(url: string): Promise<{ ok: boolean; ms: number; detail?: string }> {
  const t0 = Date.now();
  try {
    const res = await fetch(`${url.replace(/\/+$/, "")}/health`, { signal: AbortSignal.timeout(4000) });
    return { ok: res.ok, ms: Date.now() - t0, detail: res.ok ? undefined : `HTTP ${res.status}` };
  } catch (err: any) {
    const timeout = err?.name === "TimeoutError" || err?.name === "AbortError";
    return { ok: false, ms: Date.now() - t0, detail: timeout ? "timeout" : err?.message || "unreachable" };
  }
}
