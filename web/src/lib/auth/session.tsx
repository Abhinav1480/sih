"use client";

/**
 * One session, shared by every page.
 *
 *   signed_out  no session; public pages and the entrance
 *   guest       chose "try as guest"; everything works except what needs an account
 *   signed_in   has an account; tokens live in httpOnly cookies set by the
 *               same-origin route handlers under /api/auth, never in JS storage
 *
 * The browser talks only to /api/auth/*. Those handlers proxy the backend's
 * contract-1.5.0 auth endpoints when ORCA_API_BASE is set, and otherwise run
 * a local stand-in with the same interface, so swapping is one env var.
 * Every failure is a state the screen renders; nothing here invents a user.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { AuthUser } from "@/lib/types";
import { readJSON, writeJSON } from "@/lib/storage";

export type SessionStatus = "loading" | "signed_out" | "guest" | "signed_in";

export type AuthErrorCode =
  | "identifier_invalid" | "identifier_taken" | "credentials_invalid" | "token_missing"
  | "token_invalid" | "refresh_invalid" | "network" | "server" | "validation";

export class AuthError extends Error {
  constructor(public code: AuthErrorCode, detail?: string) {
    super(detail ?? code);
  }
}

/** Profile fields the web app knows about. Free-form on the backend; never a measurement. */
export interface Profile {
  home_harbour?: { name?: string; latitude?: number; longitude?: number };
  vessel?: { name?: string; type?: string; length_m?: number };
  emergency_contacts?: { name: string; phone: string }[];
  onboarding_done?: boolean;
}

interface SessionCtx {
  status: SessionStatus;
  user: AuthUser | null;
  /** Profile for the current person: the account's, or the guest's local one. */
  profile: Profile;
  /** Display name: the account's name, or the guest's locally chosen one. */
  name: string | null;
  /** Whether sign-in is running against the local stand-in. */
  mock: boolean;
  signIn(identifier: string, password: string): Promise<AuthUser>;
  signUp(identifier: string, password: string, name: string, preferred_language: string): Promise<AuthUser>;
  signOut(): Promise<void>;
  continueAsGuest(name?: string): void;
  updateProfile(patch: Partial<Profile>, name?: string, preferred_language?: string): Promise<void>;
}

const Ctx = createContext<SessionCtx | null>(null);

const GUEST_KEY = "orca.guest";
const GUEST_PROFILE_KEY = "orca.guest.profile";

interface GuestRecord {
  name?: string;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/auth/${path}`, {
      ...init,
      headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
      credentials: "same-origin",
    });
  } catch {
    throw new AuthError("network");
  }
  if (res.status === 204) return undefined as T;
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* no body */
  }
  if (!res.ok) {
    const detail = body && typeof body === "object" && "detail" in body ? (body as { detail: unknown }).detail : null;
    if (typeof detail === "string") {
      const known: AuthErrorCode[] = ["identifier_invalid", "identifier_taken", "credentials_invalid", "token_missing", "token_invalid", "refresh_invalid"];
      throw new AuthError(known.includes(detail as AuthErrorCode) ? (detail as AuthErrorCode) : "server", detail);
    }
    if (res.status === 422) throw new AuthError("validation");
    if (res.status === 401) throw new AuthError("token_invalid");
    throw new AuthError("server", `HTTP ${res.status}`);
  }
  return body as T;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [guest, setGuest] = useState<GuestRecord | null>(null);
  const [guestProfile, setGuestProfile] = useState<Profile>({});
  const [mock, setMock] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const storedGuest = readJSON<GuestRecord>(GUEST_KEY);
      const storedProfile = readJSON<Profile>(GUEST_PROFILE_KEY) ?? {};
      try {
        const me = await call<{ user: AuthUser | null; mock: boolean }>("me", { method: "GET" });
        if (cancelled) return;
        setMock(me.mock);
        if (me.user) {
          setUser(me.user);
          setStatus("signed_in");
          return;
        }
      } catch {
        /* a failed probe is signed_out or guest, decided below */
      }
      if (cancelled) return;
      setGuestProfile(storedProfile);
      if (storedGuest) {
        setGuest(storedGuest);
        setStatus("guest");
      } else {
        setStatus("signed_out");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (identifier: string, password: string) => {
    const r = await call<{ user: AuthUser; mock: boolean }>("login", { method: "POST", body: JSON.stringify({ identifier, password }) });
    setMock(r.mock);
    setUser(r.user);
    setGuest(null);
    writeJSON(GUEST_KEY, null);
    setStatus("signed_in");
    return r.user;
  }, []);

  const signUp = useCallback(async (identifier: string, password: string, name: string, preferred_language: string) => {
    const r = await call<{ user: AuthUser; mock: boolean }>("register", {
      method: "POST",
      body: JSON.stringify({ identifier, password, name, preferred_language }),
    });
    setMock(r.mock);
    setUser(r.user);
    setGuest(null);
    writeJSON(GUEST_KEY, null);
    setStatus("signed_in");
    return r.user;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await call<void>("logout", { method: "POST", body: "{}" });
    } catch {
      /* the cookies are cleared server-side on any outcome; local state clears regardless */
    }
    setUser(null);
    setGuest(null);
    writeJSON(GUEST_KEY, null);
    setStatus("signed_out");
  }, []);

  const continueAsGuest = useCallback((name?: string) => {
    const rec: GuestRecord = { name };
    writeJSON(GUEST_KEY, rec);
    setGuest(rec);
    setUser(null);
    setStatus("guest");
  }, []);

  const updateProfile = useCallback(
    async (patch: Partial<Profile>, name?: string, preferred_language?: string) => {
      if (status === "signed_in" && user) {
        const body: Record<string, unknown> = { profile: patch };
        if (name !== undefined) body.name = name;
        if (preferred_language !== undefined) body.preferred_language = preferred_language;
        const r = await call<{ user: AuthUser }>("me", { method: "PATCH", body: JSON.stringify(body) });
        setUser(r.user);
        return;
      }
      const next = { ...guestProfile, ...patch };
      setGuestProfile(next);
      writeJSON(GUEST_PROFILE_KEY, next);
      if (name !== undefined) {
        const rec = { ...(guest ?? {}), name };
        setGuest(rec);
        writeJSON(GUEST_KEY, rec);
      }
    },
    [status, user, guestProfile, guest],
  );

  const value = useMemo<SessionCtx>(() => {
    const profile: Profile = status === "signed_in" && user ? ((user.profile as Profile) ?? {}) : guestProfile;
    const name = status === "signed_in" && user ? user.name : status === "guest" ? (guest?.name ?? null) : null;
    return { status, user, profile, name, mock, signIn, signUp, signOut, continueAsGuest, updateProfile };
  }, [status, user, guestProfile, guest, mock, signIn, signUp, signOut, continueAsGuest, updateProfile]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSession outside SessionProvider");
  return v;
}
