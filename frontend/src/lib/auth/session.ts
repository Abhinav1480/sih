"use client";

/**
 * Identity (P3-1): one session, persisted, shared by every screen.
 *
 * Three states a reader can be in:
 *   signed_out -- no session; the auth stack shows
 *   guest      -- chose "Continue as guest"; everything works except what needs an account
 *   signed_in  -- has tokens; refreshed silently when the access token expires
 *
 * Tokens live in the device keystore (@aparajita/capacitor-secure-storage) on
 * the phone. On the web there is no keystore; the same adapter falls back to
 * Preferences (localStorage) and says so in `storageKind`, so the web build
 * never pretends to a security it lacks.
 *
 * Every network failure is a state the screen renders; nothing here invents a
 * user or silently keeps a dead session alive.
 */

import { useCallback, useEffect, useState } from "react";
import { getApiBase } from "@/lib/backend/config";
import { getJSON, setJSON } from "@/lib/offline/store";
import { isNative } from "@/lib/native";

export interface AuthUser {
  id: string;
  identifier: string;
  name: string;
  preferred_language: string;
  profile: Record<string, unknown>;
  created_at: string;
}

interface StoredSession {
  kind: "guest" | "account";
  user?: AuthUser;
  access_token?: string;
  refresh_token?: string;
  /** Epoch ms when the access token expires. */
  expires_at?: number;
  /** Onboarding steps still to do, for a resumable flow. */
  onboarding_pending?: boolean;
}

export type SessionStatus = "loading" | "signed_out" | "guest" | "signed_in";

/** Stable error codes the UI localises; the server's `detail` codes pass straight through. */
export type AuthErrorCode =
  | "identifier_invalid" | "identifier_taken" | "credentials_invalid" | "token_missing"
  | "token_invalid" | "refresh_invalid" | "network" | "timeout" | "server" | "no_backend" | "validation";

export class AuthError extends Error {
  constructor(public code: AuthErrorCode, detail?: string) { super(detail ?? code); }
}

const KEY = "orca.session";
const REQUEST_TIMEOUT_MS = 20_000;

// --- storage adapter -------------------------------------------------------------

async function secure() {
  const m = await import("@aparajita/capacitor-secure-storage");
  return { store: m.SecureStorage };
}

export const storageKind = (): "keystore" | "preferences" => (isNative() ? "keystore" : "preferences");

async function loadStored(): Promise<StoredSession | null> {
  try {
    if (isNative()) {
      const raw = await (await secure()).store.getItem(KEY);
      return raw ? (JSON.parse(raw) as StoredSession) : null;
    }
    return await getJSON<StoredSession>(KEY);
  } catch {
    return null;
  }
}

async function saveStored(s: StoredSession | null): Promise<void> {
  if (isNative()) {
    const { store } = await secure();
    if (s) await store.setItem(KEY, JSON.stringify(s));
    else await store.removeItem(KEY);
    return;
  }
  await setJSON(KEY, s);
}

// --- http ------------------------------------------------------------------------

async function call<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const base = getApiBase();
  if (!base) throw new AuthError("no_backend");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${base}/api/auth${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
        ...(init.headers ?? {}),
      },
    });
    if (res.status === 204) return undefined as T;
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detail = typeof body?.detail === "string" ? body.detail : Array.isArray(body?.detail) ? "validation" : "server";
      const known: AuthErrorCode[] = ["identifier_invalid", "identifier_taken", "credentials_invalid", "token_missing", "token_invalid", "refresh_invalid"];
      throw new AuthError(known.includes(detail as AuthErrorCode) ? (detail as AuthErrorCode) : res.status === 422 ? "validation" : "server", detail);
    }
    return body as T;
  } catch (err) {
    if (err instanceof AuthError) throw err;
    if (controller.signal.aborted) throw new AuthError("timeout");
    throw new AuthError("network", err instanceof Error ? err.message : String(err));
  } finally {
    clearTimeout(timer);
  }
}

interface TokenOut { user: AuthUser; access_token: string; refresh_token: string; token_type: string; expires_in: number }

function fromTokens(t: TokenOut, onboarding_pending: boolean): StoredSession {
  return { kind: "account", user: t.user, access_token: t.access_token, refresh_token: t.refresh_token, expires_at: Date.now() + t.expires_in * 1000, onboarding_pending };
}

// --- module state, shared by every hook instance ----------------------------------

let current: StoredSession | null = null;
let loaded = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

async function commit(s: StoredSession | null) {
  current = s;
  await saveStored(s);
  notify();
}

/** A valid access token, refreshing first if it has expired. Null for guests. */
export async function accessToken(): Promise<string | null> {
  if (!current || current.kind !== "account" || !current.access_token) return null;
  if (current.expires_at && current.expires_at - Date.now() > 30_000) return current.access_token;
  if (!current.refresh_token) return null;
  try {
    const t = await call<TokenOut>("/refresh", { method: "POST", body: JSON.stringify({ refresh_token: current.refresh_token }) });
    await commit(fromTokens(t, !!current.onboarding_pending));
    return t.access_token;
  } catch (err) {
    if (err instanceof AuthError && err.code === "refresh_invalid") await commit(null); // the session is dead; say so
    return null;
  }
}

export function useSession() {
  const [, force] = useState(0);
  const [status, setStatus] = useState<SessionStatus>(loaded ? statusOf(current) : "loading");

  useEffect(() => {
    const fn = () => { force((n) => n + 1); setStatus(statusOf(current)); };
    listeners.add(fn);
    if (!loaded) {
      loadStored().then((s) => { current = s; loaded = true; notify(); });
    }
    return () => { listeners.delete(fn); };
  }, []);

  const signUp = useCallback(async (identifier: string, password: string, name: string, preferred_language: string) => {
    const t = await call<TokenOut>("/register", { method: "POST", body: JSON.stringify({ identifier, password, name, preferred_language }) });
    await commit(fromTokens(t, true));
    return t.user;
  }, []);

  const signIn = useCallback(async (identifier: string, password: string) => {
    const t = await call<TokenOut>("/login", { method: "POST", body: JSON.stringify({ identifier, password }) });
    await commit(fromTokens(t, false));
    return t.user;
  }, []);

  const continueAsGuest = useCallback(async () => { await commit({ kind: "guest" }); }, []);

  const signOut = useCallback(async () => {
    const refresh = current?.kind === "account" ? current.refresh_token : undefined;
    await commit(null);
    if (refresh) call<void>("/logout", { method: "POST", body: JSON.stringify({ refresh_token: refresh }) }).catch(() => {});
  }, []);

  /** Re-read the account from the server (e.g. after onboarding saved a profile). */
  const refreshUser = useCallback(async () => {
    const token = await accessToken();
    if (!token || !current) return null;
    const user = await call<AuthUser>("/me", { token });
    await commit({ ...current, user });
    return user;
  }, []);

  const updateProfile = useCallback(async (patch: { name?: string; preferred_language?: string; profile?: Record<string, unknown> }) => {
    const token = await accessToken();
    if (!token || !current) throw new AuthError("token_missing");
    const user = await call<AuthUser>("/me", { method: "PATCH", token, body: JSON.stringify(patch) });
    await commit({ ...current, user });
    return user;
  }, []);

  const finishOnboarding = useCallback(async () => {
    if (current) await commit({ ...current, onboarding_pending: false });
  }, []);

  return {
    status,
    user: current?.kind === "account" ? current.user ?? null : null,
    isGuest: current?.kind === "guest",
    onboardingPending: !!current?.onboarding_pending,
    storageKind: storageKind(),
    signUp, signIn, continueAsGuest, signOut, refreshUser, updateProfile, finishOnboarding,
  };
}

function statusOf(s: StoredSession | null): SessionStatus {
  if (!s) return "signed_out";
  return s.kind === "guest" ? "guest" : "signed_in";
}
