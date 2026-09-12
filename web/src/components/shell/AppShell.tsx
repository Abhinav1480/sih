"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n";
import { useSession } from "@/lib/auth/session";
import { CONTRACT_VERSION } from "@/lib/types";
import { API_MODE, API_BASE, CAPTURE_DATE } from "@/lib/api/client";
import { Navbar } from "./Navbar";
import { Skeleton } from "@/components/ui";
import { CommandPalette } from "./CommandPalette";

/**
 * The frame every signed-in or guest page sits in. A visitor with no session
 * sees the entrance in place of the page, one click from guest mode, so a
 * deep link still lands somewhere useful.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const t = useT();
  const { status, continueAsGuest } = useSession();
  return (
    <>
      <Navbar />
      <CommandPalette />
      <main id="main" className="mx-auto w-full max-w-[1400px] flex-1 px-6 pb-16" style={{ paddingTop: "calc(var(--nav-h) + 28px)" }}>
        {status === "loading" && (
          <div className="space-y-4" aria-busy="true" aria-label={t("common.loading")}>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        )}
        {status === "signed_out" && (
          <div className="mx-auto mt-16 max-w-md surface p-8 text-center arrive">
            <h1 className="text-2xl font-bold">{t("app.name")}</h1>
            <p className="mt-2 text-text-2">{t("auth.guestNote")}</p>
            <div className="mt-6 flex flex-col gap-2">
              <button type="button" className="btn btn-primary" onClick={() => continueAsGuest()}>{t("auth.guest")}</button>
              <Link href="/signin" className="btn">{t("auth.signin")}</Link>
              <Link href="/signup" className="btn btn-quiet">{t("auth.signup")}</Link>
            </div>
          </div>
        )}
        {(status === "guest" || status === "signed_in") && children}
      </main>
      <Footer />
    </>
  );
}

export function Footer() {
  const t = useT();
  return (
    <footer className="mx-auto w-full max-w-[1400px] px-6 py-6 text-xs text-text-3 flex flex-wrap items-center gap-x-6 gap-y-1">
      <span>{t("footer.honesty")}</span>
      <span className="mono">{t("footer.contract")} {CONTRACT_VERSION}</span>
      <span className="mono">{API_MODE === "captures" ? t("ai.captureNote", { date: CAPTURE_DATE }) : t("ai.liveNote", { base: API_BASE })}</span>
      <Link href="/about-data" className="underline underline-offset-2">{t("nav.about")}</Link>
    </footer>
  );
}
