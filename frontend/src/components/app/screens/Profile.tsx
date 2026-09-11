"use client";

/**
 * Profile (P3-1): who is signed in, language, home harbour, where the
 * session is kept, finish-setup, sign out. Vessel and contacts live on
 * their own screens and are linked from here.
 */

import React from "react";
import { color, touch } from "@/lib/design/tokens";
import { type LangCode } from "@/lib/i18n/app";
import type { AuthUser } from "@/lib/auth/session";
import { BigButton, Body, Card, Header, Icon, Num, Screen, btnReset, sans } from "../primitives";

type T = (k: string) => string;

interface Props {
  t: T; lang: LangCode; langNative: string; user: AuthUser | null; isGuest: boolean; onboardingPending: boolean; storageKind: "keystore" | "preferences";
  onBack: () => void; onLanguage: () => void; onBoat: () => void; onEmergency: () => void; onOffline: () => void; onResumeOnboarding: () => void; onSignOut: () => void; onCreateAccount: () => void;
}

export function ProfileScreen({ t, lang, langNative, user, isGuest, onboardingPending, storageKind, onBack, onLanguage, onBoat, onEmergency, onOffline, onResumeOnboarding, onSignOut, onCreateAccount }: Props) {
  void lang;
  const harbour = (user?.profile as { home_harbour?: { name?: string } } | undefined)?.home_harbour?.name ?? null;
  const row = (icon: React.ReactNode, title: string, sub: string | null, go: () => void) => (
    <button key={title} onClick={go} style={{ ...btnReset, border: `1px solid ${color.lineSoft}`, borderRadius: 18, background: color.card, boxShadow: "0 1px 2px rgba(18,48,58,.05)", minHeight: 66, display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", textAlign: "left", width: "100%" }}>
      {icon}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ ...sans(16, 600, 1.2), color: color.ink }}>{title}</div>
        {sub && <div style={{ ...sans(13, 400, 1.3), color: color.inkMuted, marginTop: 3 }}>{sub}</div>}
      </div>
      <Icon name="chevron" size={16} color={color.inkGhost} stroke={2.4} />
    </button>
  );

  return (
    <Screen>
      <Header title={t("profileTitle")} onBack={onBack} />
      <Body pad={14}>
        <Card style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: color.seaTint, border: `1px solid ${color.seaTintBorder}`, display: "flex", alignItems: "center", justifyContent: "center", ...sans(22, 700, 1), color: color.seaDark, flex: "none" }}>
            {user ? user.name.trim().charAt(0).toUpperCase() : "?"}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ ...sans(19, 700, 1.15), color: color.ink }}>{user ? user.name : t("guestAccount")}</div>
            {user && <Num size={13} weight={500} color={color.inkMuted} style={{ marginTop: 4 }}>{user.identifier}</Num>}
            {isGuest && <div style={{ ...sans(13, 400, 1.3), color: color.inkMuted, marginTop: 4 }}>{t("guestNote")}</div>}
          </div>
        </Card>

        {isGuest && <BigButton variant="sea" minHeight={touch.min} onClick={onCreateAccount} style={{ justifyContent: "center" }}><span style={{ textAlign: "center", display: "block" }}>{t("createAccount")}</span></BigButton>}
        {onboardingPending && <BigButton variant="tint" minHeight={touch.min} onClick={onResumeOnboarding} style={{ justifyContent: "center" }}><span style={{ textAlign: "center", display: "block" }}>{t("resumeOnboarding")}</span></BigButton>}

        {row(<Icon name="globe" size={24} color={color.sea} />, t("language"), langNative, onLanguage)}
        {row(<Icon name="pin" size={24} color={color.sea} />, t("homeHarbour"), harbour ?? t("none"), onResumeOnboarding)}
        {row(<Icon name="boat" size={24} color={color.sea} />, t("profile"), null, onBoat)}
        {row(<Icon name="phone" size={24} color={color.sea} />, t("emergency"), null, onEmergency)}
        {row(<Icon name="save" size={24} color={color.sea} />, t("tripCache"), null, onOffline)}

        <div style={{ ...sans(12, 400, 1.35), color: color.inkFaint, padding: "0 4px" }}>{storageKind === "keystore" ? t("storageKeystore") : t("storagePrefs")}</div>

        <BigButton onClick={onSignOut} style={{ justifyContent: "center", color: color.dangerText, borderColor: color.dangerBorder }}><span style={{ textAlign: "center", display: "block" }}>{t("signOut")}</span></BigButton>
      </Body>
    </Screen>
  );
}
