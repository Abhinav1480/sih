/**
 * Same-origin auth gateway. The browser never sees a token.
 *
 * When ORCA_API_BASE is set every action is proxied to the backend's
 * contract-1.5.0 endpoints (register, login, refresh, logout, me) and the
 * tokens are stored in httpOnly cookies. When it is not set, a local stand-in
 * with the same interface answers, so the rest of the app is built once and
 * swaps with one environment variable. The stand-in reports `mock: true` and
 * the UI says so on screen.
 */
import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import type { AuthUser, TokenResponse } from "@/lib/types";
import * as mock from "@/lib/auth/mockServer";

const BASE = process.env.ORCA_API_BASE?.replace(/\/$/, "") ?? "";
const IS_MOCK = !BASE;
const ACCESS = "orca_access";
const REFRESH = "orca_refresh";
const SECURE = process.env.NODE_ENV === "production";

type Action = "register" | "login" | "logout" | "me" | "refresh";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

async function setTokens(t: TokenResponse) {
  const jar = await cookies();
  jar.set(ACCESS, t.access_token, { httpOnly: true, sameSite: "lax", secure: SECURE, path: "/", maxAge: t.expires_in });
  jar.set(REFRESH, t.refresh_token, { httpOnly: true, sameSite: "lax", secure: SECURE, path: "/", maxAge: 60 * 60 * 24 * 30 });
}

async function clearTokens() {
  const jar = await cookies();
  jar.delete(ACCESS);
  jar.delete(REFRESH);
}

// --- backend transport -----------------------------------------------------

async function backend(path: string, init: RequestInit & { token?: string } = {}): Promise<{ status: number; body: unknown }> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (init.token) headers.authorization = `Bearer ${init.token}`;
  const res = await fetch(`${BASE}/api/auth/${path}`, { ...init, headers, cache: "no-store" });
  let body: unknown = null;
  try {
    body = res.status === 204 ? null : await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body };
}

async function refreshWithBackend(refreshToken: string): Promise<TokenResponse | null> {
  const r = await backend("refresh", { method: "POST", body: JSON.stringify({ refresh_token: refreshToken }) });
  if (r.status !== 200) return null;
  const t = r.body as TokenResponse;
  await setTokens(t);
  return t;
}

/** Proxy a token-returning call and store its cookies. */
async function tokenCall(path: "register" | "login", payload: unknown) {
  if (IS_MOCK) {
    const r = await mock.tokenCall(path, payload);
    if (r.status !== 200 && r.status !== 201) return json(r.body, r.status);
    await setTokens(r.body as TokenResponse);
    return json({ user: (r.body as TokenResponse).user, mock: true }, r.status);
  }
  let r: { status: number; body: unknown };
  try {
    r = await backend(path, { method: "POST", body: JSON.stringify(payload) });
  } catch {
    return json({ detail: "network" }, 502);
  }
  if (r.status !== 200 && r.status !== 201) return json(r.body ?? { detail: "server" }, r.status);
  await setTokens(r.body as TokenResponse);
  return json({ user: (r.body as TokenResponse).user, mock: false }, r.status);
}

async function me(req: NextRequest): Promise<Response> {
  const jar = await cookies();
  const access = jar.get(ACCESS)?.value;
  const refresh = jar.get(REFRESH)?.value;
  const method = req.method;
  const payload = method === "PATCH" ? await req.json().catch(() => ({})) : undefined;

  if (IS_MOCK) {
    if (!access) return json({ user: null, mock: true });
    const r = await mock.me(access, method, payload);
    if (r.status === 401) {
      await clearTokens();
      return method === "GET" ? json({ user: null, mock: true }) : json(r.body, 401);
    }
    return json({ user: r.body as AuthUser, mock: true }, r.status);
  }

  if (!access && !refresh) return json({ user: null, mock: false });
  let token = access;
  const attempt = async (tok: string) =>
    backend("me", { method, token: tok, body: payload ? JSON.stringify(payload) : undefined });
  try {
    let r = token ? await attempt(token) : { status: 401, body: null };
    if (r.status === 401 && refresh) {
      const t = await refreshWithBackend(refresh);
      if (t) {
        token = t.access_token;
        r = await attempt(token);
      }
    }
    if (r.status === 401) {
      await clearTokens();
      return method === "GET" ? json({ user: null, mock: false }) : json({ detail: "token_invalid" }, 401);
    }
    if (r.status !== 200) return json(r.body ?? { detail: "server" }, r.status);
    return json({ user: r.body as AuthUser, mock: false });
  } catch {
    return method === "GET" ? json({ user: null, mock: false, offline: true }) : json({ detail: "network" }, 502);
  }
}

async function logout(): Promise<Response> {
  const jar = await cookies();
  const refresh = jar.get(REFRESH)?.value;
  if (refresh) {
    if (IS_MOCK) await mock.logout(refresh);
    else {
      try {
        await backend("logout", { method: "POST", body: JSON.stringify({ refresh_token: refresh }) });
      } catch {
        /* 204 always, per contract; a network failure still clears the cookies */
      }
    }
  }
  await clearTokens();
  return new NextResponse(null, { status: 204 });
}

async function handle(req: NextRequest, action: Action): Promise<Response> {
  switch (action) {
    case "register":
    case "login":
      return tokenCall(action, await req.json().catch(() => ({})));
    case "logout":
      return logout();
    case "me":
      return me(req);
    case "refresh": {
      const jar = await cookies();
      const refresh = jar.get(REFRESH)?.value;
      if (!refresh) return json({ detail: "refresh_invalid" }, 401);
      const t = IS_MOCK ? await mock.refresh(refresh) : await refreshWithBackend(refresh).catch(() => null);
      if (!t) {
        await clearTokens();
        return json({ detail: "refresh_invalid" }, 401);
      }
      if (IS_MOCK) await setTokens(t);
      return json({ user: t.user, mock: IS_MOCK });
    }
    default:
      return json({ detail: "not_found" }, 404);
  }
}

const ACTIONS: readonly string[] = ["register", "login", "logout", "me", "refresh"];

async function route(req: NextRequest, ctx: { params: Promise<{ action: string }> }) {
  const { action } = await ctx.params;
  if (!ACTIONS.includes(action)) return json({ detail: "not_found" }, 404);
  return handle(req, action as Action);
}

export const GET = route;
export const POST = route;
export const PATCH = route;
