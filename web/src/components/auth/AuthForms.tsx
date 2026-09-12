"use client";

/**
 * Sign in, sign up, forgot password: centred, minimal, calm. Sign-up
 * collects name, phone or email, password and preferred language, so
 * everything after is already localised. Errors are the backend's stable
 * codes, localised; the mock stand-in says on screen that it is one.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLang, useT, LANGS, isLang, type Lang, type StringKey } from "@/lib/i18n";
import { AuthError, useSession } from "@/lib/auth/session";
import { Field, Surface } from "@/components/ui";
import { IconCaution } from "@/components/ui/Icons";
import { Wordmark, ThemeToggle, LangSelect } from "@/components/shell/Navbar";
import { Footer } from "@/components/shell/AppShell";

function errorKey(code: string): StringKey {
  switch (code) {
    case "credentials_invalid": return "auth.error.credentials_invalid";
    case "identifier_invalid": return "auth.error.identifier_invalid";
    case "identifier_taken": return "auth.error.identifier_taken";
    case "validation": return "auth.error.validation";
    case "network": return "auth.error.network";
    case "token_invalid": case "token_missing": case "refresh_invalid": return "auth.error.token_invalid";
    default: return "auth.error.server";
  }
}

export function AuthFrame({ title, children }: { title: string; children: React.ReactNode }) {
  const t = useT();
  const { mock } = useSession();
  return (
    <>
      <header className="glass fixed inset-x-0 top-0 z-40" style={{ height: "var(--nav-h)" }}>
        <div className="mx-auto flex h-full max-w-[1400px] items-center justify-between px-6">
          <Wordmark />
          <div className="flex items-center gap-1"><LangSelect /><ThemeToggle /></div>
        </div>
      </header>
      <main id="main" className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-12" style={{ paddingTop: "calc(var(--nav-h) + 56px)" }}>
        <Surface className="p-8 arrive">
          <h1 className="text-2xl font-bold">{title}</h1>
          <div className="mt-6">{children}</div>
        </Surface>
        {mock && <p className="mt-3 text-center text-xs text-text-3">{t("auth.mockNote")}</p>}
      </main>
      <Footer />
    </>
  );
}

function ErrorLine({ code }: { code: string | null }) {
  const t = useT();
  if (!code) return null;
  return <p role="alert" className="flex items-start gap-2 text-sm ink-HIGH"><IconCaution size={16} className="mt-0.5 shrink-0" />{t(errorKey(code))}</p>;
}

export function SignIn() {
  const t = useT();
  const router = useRouter();
  const { signIn, continueAsGuest } = useSession();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <AuthFrame title={t("auth.signin")}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            await signIn(identifier, password);
            router.push("/dashboard");
          } catch (err) {
            setError(err instanceof AuthError ? err.code : "server");
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label={t("auth.identifier")}><input className="field" autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required /></Field>
        <Field label={t("auth.password")}><input className="field" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></Field>
        <ErrorLine code={error} />
        <button type="submit" className="btn btn-primary w-full" disabled={busy}>{busy ? t("auth.working") : t("auth.signin")}</button>
        <div className="flex items-center justify-between text-sm">
          <Link href="/forgot" className="text-text-2 underline underline-offset-2">{t("auth.forgot")}</Link>
          <Link href="/signup" className="text-[var(--accent)]">{t("auth.none")} {t("auth.signup")}</Link>
        </div>
        <div className="border-t border-hairline pt-4">
          <button type="button" className="btn w-full" onClick={() => { continueAsGuest(); router.push("/dashboard"); }}>{t("auth.guest")}</button>
          <p className="mt-2 text-xs text-text-3">{t("auth.guestNote")}</p>
        </div>
      </form>
    </AuthFrame>
  );
}

export function SignUp() {
  const t = useT();
  const router = useRouter();
  const { lang, setLang } = useLang();
  const { signUp } = useSession();
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <AuthFrame title={t("auth.signup")}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            await signUp(identifier, password, name, lang);
            router.push("/onboarding");
          } catch (err) {
            setError(err instanceof AuthError ? err.code : "server");
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label={t("auth.name")}><input className="field" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required /></Field>
        <Field label={t("auth.identifier")}><input className="field" autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required /></Field>
        <Field label={t("auth.password")} hint={t("auth.passwordHint")}><input className="field" type="password" autoComplete="new-password" minLength={8} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} required /></Field>
        <Field label={t("auth.language")}>
          <select className="field" value={lang} onChange={(e) => { const l = e.target.value; if (isLang(l)) setLang(l as Lang); }}>
            {LANGS.map((l) => <option key={l} value={l}>{t(`lang.${l}`)}</option>)}
          </select>
        </Field>
        <ErrorLine code={error} />
        <button type="submit" className="btn btn-primary w-full" disabled={busy}>{busy ? t("auth.working") : t("auth.create")}</button>
        <p className="text-center text-sm"><Link href="/signin" className="text-[var(--accent)]">{t("auth.have")} {t("auth.signin")}</Link></p>
      </form>
    </AuthFrame>
  );
}

export function Forgot() {
  const t = useT();
  return (
    <AuthFrame title={t("auth.forgot")}>
      <p className="text-text-2">{t("auth.forgotNote")}</p>
      <div className="mt-6 flex flex-col gap-2">
        <Link href="/signin" className="btn btn-primary">{t("auth.signin")}</Link>
        <Link href="/" className="btn">{t("common.back")}</Link>
      </div>
    </AuthFrame>
  );
}
