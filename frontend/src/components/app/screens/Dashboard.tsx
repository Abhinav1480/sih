"use client";

/**
 * Dashboard (P3-2): the place the reader lands.
 *
 * In priority order: conditions now for the home location (verdict word,
 * band colour, wave, wind, updated when), active alerts, quick asks, the
 * next saved trip, and one honest line about data freshness and tier. Every
 * card is tappable through to the thing it summarises; every part has its own
 * loading, empty and error state. Missing values render as unavailable.
 *
 * Not in the design file; drawn in its language (deviations #26).
 */

import React from "react";
import { color, touch } from "@/lib/design/tokens";
import { verdictPresentation } from "@/lib/design/verdict";
import { type LangCode } from "@/lib/i18n/app";
import { formatNumber, localiseDigits } from "@/lib/i18n/digits";
import { formatAge } from "@/lib/offline/store";
import type { Envelope, EvidenceRecord } from "@/lib/contract/envelope";
import type { TripCard } from "@/lib/offline/tripCard";
import type { Part } from "@/lib/data/useDashboard";
import { BigButton, Card, ConnectivityStrip, Icon, Num, Screen, TierBadge, btnReset, sans } from "../primitives";

type T = (k: string) => string;

/** The alerts endpoint's own shape (docs/examples/alerts.json). Rendered as sent. */
export interface MarineAlert {
  alert_id?: string; id?: string; source?: string; sector?: string; severity?: string; title?: string;
  description?: string; issued_at?: string; valid_until?: string | null; recommended_action?: string | null;
}

interface Props {
  t: T; lang: LangCode; langNative: string; avatar: string | null; online: boolean;
  homeName: string; conditions: Part<Envelope>; alerts: Part<MarineAlert[]>; trip: TripCard | null; quickAsks: string[]; lastSyncAt: string | null;
  onReload: () => void; onOpenConditions: (env: Envelope) => void; onAsk: (q: string) => void; onTrip: () => void; onProfile: () => void; onLanguage: () => void; onEmergency: () => void;
}

const SEVERITY_TONE: Record<string, { bg: string; border: string; fg: string }> = {
  INFO: { bg: color.cardMuted, border: color.lineSoft, fg: color.inkSoft },
  ADVISORY: { bg: color.cautionBg, border: color.cautionBorder, fg: color.cautionText },
  WARNING: { bg: color.cautionBg, border: color.cautionBorder, fg: color.cautionText },
  SEVERE: { bg: color.dangerBg, border: color.dangerBorder, fg: color.dangerText },
  EMERGENCY: { bg: color.dangerBg, border: color.dangerBorder, fg: color.dangerText },
};

function firstNumber(evidence: EvidenceRecord[], needle: string): { n: number | null; unit: string } {
  const rec = evidence.find((e) => e.variable.toLowerCase().includes(needle));
  const n = rec ? Number(String(rec.value).trim().split(/\s/)[0]) : NaN;
  return { n: Number.isFinite(n) ? n : null, unit: rec?.unit ?? "" };
}

function Pending({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 2px" }}>
      <i style={{ width: 11, height: 11, borderRadius: "50%", background: color.sea, animation: "orca-soft .9s infinite", display: "block" }} />
      <span style={{ ...sans(14, 500, 1), color: color.inkMuted }}>{label}</span>
    </div>
  );
}

function Failed({ t, kind, detail, onRetry }: { t: T; kind: string; detail: string; onRetry: () => void }) {
  const key = { timeout: "errorTimeout", network: "errorNetwork", http: "errorHttp", no_backend: "errorNoBackend", offline_mode: "errorCachedModeBody" }[kind] ?? "errorHttp";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ ...sans(14, 400, 1.45), color: color.dangerText }}>{t(key)}{detail ? <span className="num"> ({detail})</span> : null}</div>
      <button onClick={onRetry} style={{ ...btnReset, minHeight: 48, borderRadius: 12, border: `1px solid ${color.lineStrong}`, ...sans(15, 600, 1), color: color.sea, padding: "0 14px", alignSelf: "flex-start" }}>{t("retry")}</button>
    </div>
  );
}

function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "4px 2px 0" }}>
      <span style={{ ...sans(13, 600, 1, ".06em"), color: color.inkFaint, textTransform: "uppercase" }}>{children}</span>
      <span style={{ marginLeft: "auto" }}>{right}</span>
    </div>
  );
}

export function DashboardScreen({ t, lang, langNative, avatar, online, homeName, conditions, alerts, trip, quickAsks, lastSyncAt, onReload, onOpenConditions, onAsk, onTrip, onProfile, onLanguage, onEmergency }: Props) {
  const env = conditions.status === "ready" ? conditions.data : null;
  const fetchedAt = conditions.status === "ready" ? conditions.fetchedAt : null;
  const verdict = env ? verdictPresentation(env.answer?.verdict, env.risk?.band, lang) : null;
  const wave = env ? firstNumber(env.evidence, "wave") : null;
  const wind = env ? firstNumber(env.evidence, "wind") : null;
  const tier = env?.evidence?.[0]?.provider_tier ?? null;
  const age = (iso: string) => localiseDigits(formatAge(iso, lang), lang);

  return (
    <Screen>
      <div style={{ flex: "none", background: color.header, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, minHeight: 56 }}>
        <span style={{ ...sans(19, 700, 1, ".12em"), color: color.headerText }}>ORCA</span>
        <span style={{ ...sans(13, 400, 1.2), color: color.headerMuted, borderLeft: "1px solid rgba(255,255,255,.25)", paddingLeft: 12, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t("tagline")}</span>
        <button onClick={onLanguage} style={{ ...btnReset, minWidth: touch.min, minHeight: 44, borderRadius: 8, border: "1px solid rgba(255,255,255,.35)", background: "rgba(255,255,255,.10)", color: color.headerText, ...sans(14, 600, 1), padding: "0 12px" }}>{langNative}</button>
        <button onClick={onProfile} aria-label="profile" style={{ ...btnReset, width: 44, height: 44, borderRadius: "50%", border: "1px solid rgba(255,255,255,.35)", background: "rgba(255,255,255,.10)", color: color.headerText, ...sans(16, 700, 1), display: "flex", alignItems: "center", justifyContent: "center" }}>
          {avatar ?? <Icon name="help" size={20} color={color.headerText} />}
        </button>
      </div>
      <ConnectivityStrip online={online} label={online ? t("online") : t("offline")} right={lastSyncAt ? age(lastSyncAt) : t("offline.neverSynced")} />

      <div className="orca-body" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "14px 14px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
        {/* 1. Conditions now */}
        <SectionTitle right={<span style={{ ...sans(13, 400, 1), color: color.inkFaint }}>{homeName}</span>}>{t("condNow")}</SectionTitle>
        {conditions.status === "loading" && <Card><Pending label={t("condLoading")} /></Card>}
        {conditions.status === "error" && <Card><Failed t={t} kind={conditions.kind} detail={conditions.detail} onRetry={onReload} /></Card>}
        {env && (
          <button onClick={() => onOpenConditions(env)} style={{ ...btnReset, textAlign: "left", width: "100%" }}>
            <Card style={{ display: "flex", flexDirection: "column", gap: 12, borderColor: verdict ? verdict.hex : color.lineSoft }}>
              <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
                <div style={{ width: 52, height: 52, flex: "none", borderRadius: 16, background: verdict?.hex ?? color.inkGhost, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name={verdict ? (verdict.icon === "unknown" ? "help" : verdict.icon) : "help"} size={28} color={color.headerText} stroke={2.2} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ ...sans(26, 700, 1.05, "-.01em"), color: verdict?.hex ?? color.ink, overflowWrap: "anywhere" }}>{verdict?.word ?? t("noVerdict")}</div>
                  <div style={{ ...sans(13, 400, 1.3), color: color.inkMuted, marginTop: 4 }}>{env.meta?.temporal?.label}</div>
                </div>
                <Icon name="chevron" size={18} color={color.inkGhost} />
              </div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "baseline" }}>
                <span><Num size={22} weight={700}>{formatNumber(wave?.n ?? null, lang, 1)}</Num> <Num size={11} weight={500} color={color.inkGhost}>{wave?.unit}</Num> <span style={{ ...sans(12, 400, 1), color: color.inkSoft }}>{t("waveL")}</span></span>
                <span><Num size={22} weight={700}>{formatNumber(wind?.n ?? null, lang, 0)}</Num> <Num size={11} weight={500} color={color.inkGhost}>{wind?.unit}</Num> <span style={{ ...sans(12, 400, 1), color: color.inkSoft }}>{t("windL")}</span></span>
                <span style={{ marginLeft: "auto", ...sans(12, 400, 1), color: color.inkFaint }}>{t("updated")} <span className="num">{fetchedAt ? age(fetchedAt) : ""}</span></span>
              </div>
              {env.meta?.degraded && <div style={{ ...sans(12, 500, 1.3), color: color.cautionText }}>{t("degraded")}</div>}
            </Card>
          </button>
        )}

        {/* 2. Alerts */}
        <SectionTitle>{t("alertsTitle")}</SectionTitle>
        {alerts.status === "loading" && <Card><Pending label={t("alertsLoading")} /></Card>}
        {alerts.status === "error" && <Card><Failed t={t} kind={alerts.kind} detail={alerts.detail} onRetry={onReload} /></Card>}
        {alerts.status === "ready" && alerts.data.length === 0 && (
          <Card tone="safe" style={{ display: "flex", alignItems: "center", gap: 12 }}><Icon name="check" size={22} color={color.onlineText} stroke={2.6} /><span style={{ ...sans(16, 600, 1.3), color: color.harbourText }}>{t("noAlerts")}</span></Card>
        )}
        {alerts.status === "ready" && alerts.data.map((a, i) => {
          const tone = SEVERITY_TONE[(a.severity ?? "").toUpperCase()] ?? SEVERITY_TONE.INFO;
          return (
            <div key={a.alert_id ?? a.id ?? i} style={{ border: `1px solid ${tone.border}`, background: tone.bg, borderRadius: 16, padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ ...sans(11, 700, 1, ".08em"), color: tone.fg, textTransform: "uppercase" }}>{a.severity}</span>
                {a.issued_at && <Num size={11} weight={500} color={color.inkFaint} style={{ marginLeft: "auto" }}>{age(a.issued_at)}</Num>}
              </div>
              <div style={{ ...sans(16, 600, 1.3), color: color.ink }}>{a.title}</div>
              {a.description && <div style={{ ...sans(13, 400, 1.45), color: color.inkSoft, marginTop: 6 }}>{a.description}</div>}
              {a.recommended_action && <div style={{ ...sans(13, 500, 1.4), color: tone.fg, marginTop: 8 }}>{a.recommended_action}</div>}
              {a.source && <div style={{ ...sans(12, 400, 1.3), color: color.inkFaint, marginTop: 8 }}>{a.source}</div>}
            </div>
          );
        })}

        {/* 3. Quick asks */}
        <SectionTitle>{t("quickAsks")}</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {quickAsks.map((q) => (
            <button key={q} onClick={() => onAsk(q)} style={{ ...btnReset, minHeight: touch.min, borderRadius: 999, border: `1px solid ${color.lineSoft}`, background: color.card, color: color.ink, ...sans(17, 500, 1.2), display: "flex", alignItems: "center", gap: 12, padding: "0 18px", textAlign: "left", width: "100%" }}>
              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q}</span>
              <Icon name="chevron" size={17} color={color.inkGhost} stroke={2.4} />
            </button>
          ))}
        </div>

        {/* 4. Next trip */}
        <SectionTitle>{t("nextTrip")}</SectionTitle>
        {trip ? (
          <button onClick={onTrip} style={{ ...btnReset, textAlign: "left", width: "100%" }}>
            <Card style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Icon name="list" size={24} color={color.sea} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ ...sans(16, 600, 1.2), color: color.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{trip.location?.name ?? trip.queryText}</div>
                <div style={{ ...sans(13, 400, 1.3), color: color.inkMuted, marginTop: 3 }}>{trip.temporal?.label ?? ""} · <span className="num">{age(trip.savedAt)}</span></div>
              </div>
              <span style={{ ...sans(14, 600, 1), color: color.sea }}>{t("resume")}</span>
            </Card>
          </button>
        ) : (
          <Card style={{ ...sans(14, 400, 1.4), color: color.inkFaint }}>{t("noTripYet")}</Card>
        )}

        {/* 5. Freshness */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 4px", flexWrap: "wrap" }}>
          <span style={{ ...sans(12, 400, 1.3), color: color.inkFaint }}>{t("lastSynced")} <span className="num">{lastSyncAt ? age(lastSyncAt) : t("offline.neverSynced")}</span></span>
          <span style={{ ...sans(12, 400, 1.3), color: color.inkFaint }}>· {t("dataFrom")}</span>
          <TierBadge tier={tier} lang={lang} sourceUnavailableLabel={t("sourceUnavailable")} />
        </div>

        <BigButton onClick={onEmergency} style={{ color: color.dangerText, borderColor: color.dangerBorder, justifyContent: "center" }} icon={<Icon name="alert" size={22} color={color.dangerText} />}><span style={{ textAlign: "center", display: "block" }}>{t("emergency")}</span></BigButton>
      </div>
    </Screen>
  );
}
