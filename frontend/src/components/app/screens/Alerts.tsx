"use client";

/**
 * Alerts (P3-5): the list from /api/alerts, severity and time as sent, with
 * loading, empty and error states. The geofence interrupt is a separate
 * full-screen, acknowledgement-only overlay (BorderWarning).
 */

import React from "react";
import { color } from "@/lib/design/tokens";
import { type LangCode } from "@/lib/i18n/app";
import { localiseDigits } from "@/lib/i18n/digits";
import { formatAge } from "@/lib/offline/store";
import type { Part } from "@/lib/data/useDashboard";
import type { MarineAlert } from "./Dashboard";
import { BigButton, Body, Card, EmptyState, Header, Icon, Num, Screen, sans } from "../primitives";

type T = (k: string) => string;

const TONE: Record<string, { bg: string; border: string; fg: string }> = {
  INFO: { bg: color.cardMuted, border: color.lineSoft, fg: color.inkSoft },
  ADVISORY: { bg: color.cautionBg, border: color.cautionBorder, fg: color.cautionText },
  WARNING: { bg: color.cautionBg, border: color.cautionBorder, fg: color.cautionText },
  SEVERE: { bg: color.dangerBg, border: color.dangerBorder, fg: color.dangerText },
  EMERGENCY: { bg: color.dangerBg, border: color.dangerBorder, fg: color.dangerText },
};

export function AlertsScreen({ alerts, lang, t, onReload, onBack }: { alerts: Part<MarineAlert[]>; lang: LangCode; t: T; onReload: () => void; onBack: () => void }) {
  const age = (iso: string) => localiseDigits(formatAge(iso, lang), lang);
  return (
    <Screen>
      <Header title={t("alertsTitle")} onBack={onBack} right={alerts.status === "ready" ? <Num size={13} weight={500} color={color.headerMuted}>{localiseDigits(String(alerts.data.length), lang)}</Num> : undefined} />
      {alerts.status === "loading" && <EmptyState title={t("alertsLoading")} />}
      {alerts.status === "error" && (
        <EmptyState icon={<Icon name="alert" size={40} color={color.cautionChip} />} title={t("errorTitle")}
          body={t({ timeout: "errorTimeout", network: "errorNetwork", http: "errorHttp", no_backend: "errorNoBackend", offline_mode: "errorCachedModeBody" }[alerts.kind])}
          action={<BigButton variant="sea" onClick={onReload}>{t("retry")}</BigButton>} />
      )}
      {alerts.status === "ready" && alerts.data.length === 0 && (
        <EmptyState icon={<Icon name="check" size={40} color={color.onlineText} stroke={2.6} />} title={t("noAlerts")} body={t("noAlertsBody")} />
      )}
      {alerts.status === "ready" && alerts.data.length > 0 && (
        <Body pad={14}>
          {alerts.data.map((a, i) => {
            const tone = TONE[(a.severity ?? "").toUpperCase()] ?? TONE.INFO;
            return (
              <Card key={a.alert_id ?? a.id ?? i} style={{ background: tone.bg, borderColor: tone.border }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ ...sans(11, 700, 1, ".08em"), color: tone.fg, textTransform: "uppercase" }}>{a.severity}</span>
                  {a.sector && <span style={{ ...sans(12, 400, 1), color: color.inkFaint }}>· {a.sector}</span>}
                  {a.issued_at && <Num size={11} weight={500} color={color.inkFaint} style={{ marginLeft: "auto" }}>{age(a.issued_at)}</Num>}
                </div>
                <div style={{ ...sans(17, 600, 1.3), color: color.ink }}>{a.title}</div>
                {a.description && <div style={{ ...sans(14, 400, 1.45), color: color.inkSoft, marginTop: 8 }}>{a.description}</div>}
                {a.recommended_action && <div style={{ ...sans(14, 500, 1.4), color: tone.fg, marginTop: 10 }}>{a.recommended_action}</div>}
                <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                  {a.source && <span style={{ ...sans(12, 400, 1.3), color: color.inkFaint }}>{a.source}</span>}
                  {a.valid_until && <Num size={12} weight={500} color={color.inkFaint}>{t("validUntil")} {localiseDigits(new Date(a.valid_until).toLocaleString(), lang)}</Num>}
                </div>
              </Card>
            );
          })}
        </Body>
      )}
    </Screen>
  );
}
