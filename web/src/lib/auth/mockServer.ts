/**
 * The local stand-in for the backend auth endpoints. Server-side only.
 *
 * Same request and response shapes, same error codes and status numbers as
 * docs/API_CONTRACT.md section 12, so the route handler above it does not
 * branch on anything but which transport it is talking to. Users persist to
 * a JSON file next to the project (gitignored) so a dev restart keeps them.
 * Passwords are scrypt-hashed; tokens are random and expire.
 *
 * Nothing here is user-visible data about the sea.
 */
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { AuthUser, TokenResponse } from "@/lib/types";

interface StoredUser extends AuthUser {
  salt: string;
  hash: string;
}
interface Store {
  users: StoredUser[];
  access: Record<string, { user_id: string; expires_at: number }>;
  refresh: Record<string, { user_id: string; expires_at: number }>;
}

const DIR = join(process.cwd(), ".orca-local");
const FILE = join(DIR, "mock-auth.json");
const ACCESS_TTL_S = 3600;
const REFRESH_TTL_S = 60 * 60 * 24 * 30;
const LANGS = ["en", "te", "hi", "ta", "kn", "ml", "mr", "bn", "gu", "or"];

function load(): Store {
  try {
    if (existsSync(FILE)) return JSON.parse(readFileSync(FILE, "utf8")) as Store;
  } catch {
    /* corrupt file: start clean */
  }
  return { users: [], access: {}, refresh: {} };
}

function save(s: Store) {
  mkdirSync(DIR, { recursive: true });
  writeFileSync(FILE, JSON.stringify(s, null, 2));
}

function normaliseIdentifier(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (s.includes("@")) {
    const e = s.toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
  }
  const digits = s.replace(/[\s\-()]/g, "");
  return /^\+?\d{10,15}$/.test(digits) ? digits : null;
}

function publicUser(u: StoredUser): AuthUser {
  return { id: u.id, identifier: u.identifier, name: u.name, preferred_language: u.preferred_language, profile: u.profile, created_at: u.created_at };
}

function issue(s: Store, u: StoredUser): TokenResponse {
  const now = Date.now();
  // prune expired
  for (const k of Object.keys(s.access)) if (s.access[k].expires_at < now) delete s.access[k];
  for (const k of Object.keys(s.refresh)) if (s.refresh[k].expires_at < now) delete s.refresh[k];
  const access_token = "mock." + randomBytes(24).toString("base64url");
  const refresh_token = randomBytes(32).toString("base64url");
  s.access[access_token] = { user_id: u.id, expires_at: now + ACCESS_TTL_S * 1000 };
  s.refresh[refresh_token] = { user_id: u.id, expires_at: now + REFRESH_TTL_S * 1000 };
  return { user: publicUser(u), access_token, refresh_token, token_type: "bearer", expires_in: ACCESS_TTL_S };
}

export async function tokenCall(path: "register" | "login", payload: unknown): Promise<{ status: number; body: unknown }> {
  const p = (payload ?? {}) as Record<string, unknown>;
  const s = load();
  const identifier = normaliseIdentifier(p.identifier);
  const password = typeof p.password === "string" ? p.password : "";
  if (path === "register") {
    if (!identifier) return { status: 422, body: { detail: "identifier_invalid" } };
    if (password.length < 8 || password.length > 128) return { status: 422, body: { detail: [{ loc: ["body", "password"], msg: "8-128 characters" }] } };
    const name = typeof p.name === "string" ? p.name.trim() : "";
    if (!name) return { status: 422, body: { detail: [{ loc: ["body", "name"], msg: "required" }] } };
    const lang = typeof p.preferred_language === "string" && LANGS.includes(p.preferred_language) ? p.preferred_language : null;
    if (!lang) return { status: 422, body: { detail: [{ loc: ["body", "preferred_language"], msg: "unsupported" }] } };
    if (s.users.some((u) => u.identifier === identifier)) return { status: 409, body: { detail: "identifier_taken" } };
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(password, salt, 32).toString("hex");
    const u: StoredUser = {
      id: randomUUID(), identifier, name, preferred_language: lang, profile: {},
      created_at: new Date().toISOString(), salt, hash,
    };
    s.users.push(u);
    const t = issue(s, u);
    save(s);
    return { status: 201, body: t };
  }
  const u = identifier ? s.users.find((x) => x.identifier === identifier) : undefined;
  if (!u) return { status: 401, body: { detail: "credentials_invalid" } };
  const hash = scryptSync(password, u.salt, 32);
  if (!timingSafeEqual(hash, Buffer.from(u.hash, "hex"))) return { status: 401, body: { detail: "credentials_invalid" } };
  const t = issue(s, u);
  save(s);
  return { status: 200, body: t };
}

export async function me(access: string, method: string, payload?: unknown): Promise<{ status: number; body: unknown }> {
  const s = load();
  const a = s.access[access];
  if (!a || a.expires_at < Date.now()) return { status: 401, body: { detail: "token_invalid" } };
  const u = s.users.find((x) => x.id === a.user_id);
  if (!u) return { status: 401, body: { detail: "token_invalid" } };
  if (method === "PATCH") {
    const p = (payload ?? {}) as Record<string, unknown>;
    if (typeof p.name === "string" && p.name.trim()) u.name = p.name.trim();
    if (typeof p.preferred_language === "string" && LANGS.includes(p.preferred_language)) u.preferred_language = p.preferred_language;
    if (p.profile && typeof p.profile === "object") u.profile = { ...u.profile, ...(p.profile as Record<string, unknown>) };
    save(s);
  }
  return { status: 200, body: publicUser(u) };
}

export async function refresh(token: string): Promise<TokenResponse | null> {
  const s = load();
  const r = s.refresh[token];
  if (!r || r.expires_at < Date.now()) return null;
  const u = s.users.find((x) => x.id === r.user_id);
  if (!u) return null;
  delete s.refresh[token];
  const t = issue(s, u);
  save(s);
  return t;
}

export async function logout(token: string): Promise<void> {
  const s = load();
  delete s.refresh[token];
  save(s);
}
