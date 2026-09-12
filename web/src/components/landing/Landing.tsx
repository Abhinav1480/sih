"use client";

/**
 * The landing: one screen. What ORCA is in a sentence, a real captured answer
 * rendered in the real components, then sign in, create account and a
 * prominent try-as-guest. No marketing copy. A visitor who already has a
 * session goes straight to the dashboard.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useFmt, useT } from "@/lib/i18n";
import { useSession } from "@/lib/auth/session";
import { LANDING_EXAMPLE } from "@/lib/captures";
import { evidenceMatching } from "@/lib/types";
import { KeyNumber, VerdictBlock } from "@/components/answer/AnswerPanel";
import { WhyPanel } from "@/components/answer/WhyPanel";
import { Disclosure, Mono, Surface } from "@/components/ui";
import { LangSelect, ThemeToggle, Wordmark } from "@/components/shell/Navbar";
import { Footer } from "@/components/shell/AppShell";

export function Landing() {
  const t = useT();
  const f = useFmt();
  const router = useRouter();
  const { status, continueAsGuest } = useSession();
  const env = LANDING_EXAMPLE.response;
  const wave = evidenceMatching(env, /wave height/i);
  const wind = evidenceMatching(env, /wind/i);

  useEffect(() => {
    if (status === "signed_in" || status === "guest") router.replace("/dashboard");
  }, [status, router]);

  return (
    <>
      <header className="glass fixed inset-x-0 top-0 z-40" style={{ height: "var(--nav-h)" }}>
        <div className="mx-auto flex h-full max-w-[1400px] items-center justify-between px-6">
          <Wordmark />
          <div className="flex items-center gap-1"><LangSelect /><ThemeToggle /></div>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-[1400px] flex-1 px-6 pb-12" style={{ paddingTop: "calc(var(--nav-h) + 48px)" }}>
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <section className="lg:sticky lg:top-28">
            <h1 className="text-4xl font-bold tracking-tight">{t("app.name")}</h1>
            <p className="mt-2 text-xl text-text-2">{t("app.tagline")}</p>
            <p className="mt-6 max-w-prose leading-relaxed text-text-2">{t("app.what")}</p>
            <div className="mt-8 flex flex-col gap-2 sm:max-w-xs">
              <button type="button" className="btn btn-primary text-base" onClick={() => { continueAsGuest(); router.push("/dashboard"); }}>{t("nav.guest")}</button>
              <Link href="/signin" className="btn">{t("nav.signin")}</Link>
              <Link href="/signup" className="btn btn-quiet">{t("nav.signup")}</Link>
            </div>
            <p className="mt-4 max-w-prose text-sm text-text-3">{t("auth.guestNote")}</p>
          </section>

          <Surface as="section" className="p-5 space-y-4" aria-label={t("landing.example")}>
            <div>
              <div className="eyebrow">{t("landing.example")}</div>
              <p className="mt-1 text-sm text-text-2">{t("landing.exampleQuery")}: “{f.raw(LANDING_EXAMPLE.question)}”</p>
            </div>
            <VerdictBlock envelope={env} />
            <div className="grid gap-3 sm:grid-cols-3">
              <KeyNumber label={t("answer.wave")} value={wave ? wave.value : null} unit={wave?.unit} tier={wave?.provider_tier} status={wave?.status} note={wave ? f.raw(wave.observation_or_forecast_time) : undefined} />
              <KeyNumber label={t("answer.wind")} value={wind ? wind.value : null} unit={wind?.unit} tier={wind?.provider_tier} status={wind?.status} note={wind ? f.raw(wind.observation_or_forecast_time) : undefined} />
              <KeyNumber label={t("answer.validUntil")} value={env.meta.temporal.end_time ? f.dateTime(env.meta.temporal.end_time) : null} note={t("answer.validUntilNote")} />
            </div>
            <Disclosure title={t("answer.why")} summary={env.risk ? <Mono>{f.int(env.risk.score)} / 100</Mono> : null} open>
              <WhyPanel risk={env.risk} />
            </Disclosure>
            <p className="text-xs text-text-3">{t("ai.captureNote", { date: "2026-09-09" })} · {t("answer.mode.DEMO")}</p>
          </Surface>
        </div>
      </main>
      <Footer />
    </>
  );
}
