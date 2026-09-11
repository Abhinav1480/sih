"use client";

/**
 * The entrance (P3-1): Splash, Welcome, Sign up, Sign in, Forgot password.
 *
 * Not in the design file; drawn in its language (deviations #23). "Continue as
 * guest" is the most prominent control on Welcome because a fisherman at 05:00
 * and a judge with one tap both need to be inside the product, not at a wall.
 *
 * Every request has a defined pending, error and success state; the splash is
 * time-boxed and cannot hang.
 */

import React, { useEffect, useState } from "react";
import { color, touch } from "@/lib/design/tokens";
import { LANGS, type LangCode } from "@/lib/i18n/app";
import { AuthError, type AuthErrorCode } from "@/lib/auth/session";
import { BigButton, Icon, Screen, btnReset, sans } from "../primitives";

type T = (k: string) => string;

/** Brand, briefly. Resolves on its own after `ms` whatever else is happening. */
export function SplashScreen({ ms = 900, onDone }: { ms?: number; onDone: () => void }) {
  useEffect(() => { const id = setTimeout(onDone, ms); return () => clearTimeout(id); }, [ms, onDone]);
  return (
    <div style={{ position: "fixed", inset: 0, background: color.header, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
      <Icon name="wave" size={56} color={color.headerText} stroke={2} />
      <div style={{ ...sans(40, 700, 1, ".16em"), color: color.headerText }}>ORCA</div>
    </div>
  );
}

export function WelcomeScreen({ t, onGuest, onSignIn, onSignUp }: { t: T; onGuest: () => void; onSignIn: () => void; onSignUp: () => void }) {
  return (
    <Screen style={{ background: color.header }}>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 24px", gap: 12 }}>
        <Icon name="wave" size={48} color={color.headerMuted} stroke={2} />
        <div style={{ ...sans(40, 700, 1, ".16em"), color: color.headerText }}>ORCA</div>
        <div style={{ ...sans(20, 500, 1.4), color: color.headerText, opacity: 0.9, maxWidth: 320 }}>{t("welcomeLine")}</div>
      </div>
      <div style={{ flex: "none", padding: "0 20px 28px", display: "flex", flexDirection: "column", gap: 10 }}>
        <button onClick={onGuest} style={{ ...btnReset, minHeight: touch.voice, borderRadius: 18, background: color.card, color: color.seaDark, ...sans(19, 700, 1.2), display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <Icon name="chevron" size={20} color={color.seaDark} stroke={2.6} />{t("continueGuest")}
        </button>
        <div style={{ ...sans(13, 400, 1.35), color: color.headerMuted, textAlign: "center" }}>{t("guestNote")}</div>
        <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
          <button onClick={onSignIn} style={{ ...btnReset, flex: 1, minHeight: touch.min, borderRadius: 14, border: "1px solid rgba(255,255,255,.4)", color: color.headerText, ...sans(17, 600, 1) }}>{t("signIn")}</button>
          <button onClick={onSignUp} style={{ ...btnReset, flex: 1, minHeight: touch.min, borderRadius: 14, border: "1px solid rgba(255,255,255,.4)", color: color.headerText, ...sans(17, 600, 1) }}>{t("createAccount")}</button>
        </div>
      </div>
    </Screen>
  );
}

const field = (label: string, value: string, set: (v: string) => void, opts: { type?: string; inputMode?: "text" | "tel" | "email" | "numeric"; autoComplete?: string; mono?: boolean } = {}) => (
  <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    <span style={{ ...sans(13, 500, 1), color: color.inkFaint }}>{label}</span>
    <input value={value} onChange={(e) => set(e.target.value)} type={opts.type ?? "text"} inputMode={opts.inputMode} autoComplete={opts.autoComplete} autoCapitalize="off"
      style={{ minHeight: touch.min, borderRadius: 12, border: `1px solid ${color.lineStrong}`, padding: "0 14px", fontFamily: opts.mono ? "'JetBrains Mono', monospace" : "inherit", fontSize: 18, color: color.ink, background: color.card, width: "100%" }} />
  </label>
);

export function errorKey(err: unknown): string {
  const code: AuthErrorCode = err instanceof AuthError ? err.code : "server";
  return `authErr_${code}`;
}

function AuthFrame({ title, t, onBack, children }: { title: string; t: T; onBack: () => void; children: React.ReactNode }) {
  void t;
  return (
    <Screen>
      <div style={{ flex: "none", background: color.header, padding: "13px 16px", minHeight: 56, display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onBack} aria-label="back" style={{ ...btnReset, minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", margin: "-8px 0 -8px -8px" }}><Icon name="back" size={26} color={color.headerText} stroke={2.4} /></button>
        <span style={{ ...sans(18, 600, 1), color: color.headerText }}>{title}</span>
      </div>
      <div className="orca-body" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "22px 18px 28px", display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>
    </Screen>
  );
}

function ErrorLine({ k, t }: { k: string | null; t: T }) {
  if (!k) return null;
  return <div role="alert" style={{ ...sans(14, 500, 1.4), color: color.dangerText, background: color.dangerBg, border: `1px solid ${color.dangerBorder}`, borderRadius: 12, padding: "10px 12px" }}>{t(k)}</div>;
}

export function SignUpScreen({ t, lang, onBack, onSubmit, onSignIn }: {
  t: T; lang: LangCode; onBack: () => void; onSignIn: () => void;
  onSubmit: (identifier: string, password: string, name: string, language: string) => Promise<void>;
}) {
  const [identifier, setIdentifier] = useState(""); const [password, setPassword] = useState(""); const [name, setName] = useState("");
  const [language, setLanguage] = useState<string>(lang);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const valid = identifier.trim().length >= 3 && password.length >= 8 && name.trim().length > 0;
  const submit = async () => {
    setBusy(true); setErr(null);
    try { await onSubmit(identifier.trim(), password, name.trim(), language); } catch (e) { setErr(errorKey(e)); } finally { setBusy(false); }
  };
  return (
    <AuthFrame title={t("createAccount")} t={t} onBack={onBack}>
      {field(t("phoneOrEmail"), identifier, setIdentifier, { inputMode: "email", autoComplete: "username", mono: true })}
      {field(t("name"), name, setName, { autoComplete: "name" })}
      {field(t("password"), password, setPassword, { type: "password", autoComplete: "new-password" })}
      <div style={{ ...sans(12, 400, 1.3), color: color.inkFaint }}>{t("passwordRule")}</div>
      <div>
        <div style={{ ...sans(13, 500, 1), color: color.inkFaint, marginBottom: 8 }}>{t("language")}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {LANGS.map((l) => (
            <button key={l.code} onClick={() => setLanguage(l.code)} aria-pressed={language === l.code}
              style={{ ...btnReset, minHeight: 48, padding: "0 14px", borderRadius: 999, border: `${language === l.code ? 2 : 1}px solid ${language === l.code ? color.sea : color.lineStrong}`, background: language === l.code ? color.seaTint : color.card, ...sans(16, 600, 1), color: color.ink }}>{l.native}</button>
          ))}
        </div>
      </div>
      <ErrorLine k={err} t={t} />
      <BigButton variant="sea" minHeight={touch.answerAction} disabled={!valid || busy} onClick={submit} style={{ justifyContent: "center" }}><span style={{ textAlign: "center", display: "block" }}>{busy ? t("working") : t("createAccount")}</span></BigButton>
      <button onClick={onSignIn} style={{ ...btnReset, minHeight: 48, ...sans(15, 500, 1), color: color.sea }}>{t("haveAccount")}</button>
    </AuthFrame>
  );
}

export function SignInScreen({ t, onBack, onSubmit, onForgot, onSignUp }: {
  t: T; onBack: () => void; onForgot: () => void; onSignUp: () => void;
  onSubmit: (identifier: string, password: string) => Promise<void>;
}) {
  const [identifier, setIdentifier] = useState(""); const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const submit = async () => {
    setBusy(true); setErr(null);
    try { await onSubmit(identifier.trim(), password); } catch (e) { setErr(errorKey(e)); } finally { setBusy(false); }
  };
  return (
    <AuthFrame title={t("signIn")} t={t} onBack={onBack}>
      {field(t("phoneOrEmail"), identifier, setIdentifier, { inputMode: "email", autoComplete: "username", mono: true })}
      {field(t("password"), password, setPassword, { type: "password", autoComplete: "current-password" })}
      <ErrorLine k={err} t={t} />
      <BigButton variant="sea" minHeight={touch.answerAction} disabled={!identifier.trim() || !password || busy} onClick={submit} style={{ justifyContent: "center" }}><span style={{ textAlign: "center", display: "block" }}>{busy ? t("working") : t("signIn")}</span></BigButton>
      <button onClick={onForgot} style={{ ...btnReset, minHeight: 48, ...sans(15, 500, 1), color: color.sea }}>{t("forgotPassword")}</button>
      <button onClick={onSignUp} style={{ ...btnReset, minHeight: 48, ...sans(15, 500, 1), color: color.inkMuted }}>{t("noAccount")}</button>
    </AuthFrame>
  );
}

/**
 * Honest: there is no SMS or email channel in this build, so a reset code
 * cannot be sent. The screen says so and offers the two things that do work.
 */
export function ForgotScreen({ t, onBack, onGuest }: { t: T; onBack: () => void; onGuest: () => void }) {
  return (
    <AuthFrame title={t("forgotPassword")} t={t} onBack={onBack}>
      <Icon name="help" size={40} color={color.inkGhost} />
      <div style={{ ...sans(20, 600, 1.35), color: color.ink }}>{t("forgotTitle")}</div>
      <div style={{ ...sans(15, 400, 1.5), color: color.inkMuted }}>{t("forgotBody")}</div>
      <BigButton variant="sea" onClick={onGuest} style={{ justifyContent: "center" }}><span style={{ textAlign: "center", display: "block" }}>{t("continueGuest")}</span></BigButton>
      <BigButton onClick={onBack} style={{ justifyContent: "center" }}><span style={{ textAlign: "center", display: "block" }}>{t("backToSignIn")}</span></BigButton>
    </AuthFrame>
  );
}
