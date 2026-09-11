"use client";

/**
 * 11 OFFLINE + SAVE TRIP.
 *
 * Connectivity, then what is actually on the phone: the last answer and its
 * age, the trip card, the bundled map, the bundled contacts and harbours. The
 * design lists sample items with sample sizes ("Sea border lines 1 MB"); those
 * are not rendered because the phone holds no such thing (deviations #19).
 * Age turns red past the stale threshold in lib/offline/store.
 */

import React from "react";
import { color, touch } from "@/lib/design/tokens";
import { type LangCode } from "@/lib/i18n/app";
import { formatNumber, localiseDigits } from "@/lib/i18n/digits";
import { formatAge, isStale } from "@/lib/offline/store";
import type { TripCard } from "@/lib/offline/tripCard";
import { BigButton, Body, Card, Header, Icon, Num, Screen, sans } from "../primitives";

interface Props {
  online: boolean; lastSyncAt: string | null; trip: TripCard | null; canSave: boolean;
  lang: LangCode; t: (k: string) => string; onSave: () => void; onBack: () => void;
}

export function OfflineScreen({ online, lastSyncAt, trip, canSave, lang, t, onSave, onBack }: Props) {
  const stale = lastSyncAt ? isStale(lastSyncAt) : false;
  const age = (iso: string) => localiseDigits(formatAge(iso, lang), lang);
  // What the phone really holds. Nothing here is a sample.
  const items: { label: string; value: string; have: boolean }[] = [
    { label: t("cacheAnswer"), value: lastSyncAt ? age(lastSyncAt) : t("none"), have: !!lastSyncAt },
    { label: t("cacheTrip"), value: trip ? age(trip.savedAt) : t("none"), have: !!trip },
    { label: t("cacheTiles"), value: t("bundled"), have: true },
    { label: t("cacheContacts"), value: t("bundled"), have: true },
  ];
  const tone = stale ? "danger" : online ? "online" : "caution";
  const stripBg = { danger: color.dangerBg, online: color.onlineBg, caution: color.cautionBg }[tone];
  const stripBorder = { danger: color.dangerBorder, online: color.onlineBorder, caution: color.cautionBorder }[tone];
  const stripFg = { danger: color.dangerText, online: color.onlineText, caution: color.cautionText }[tone];
  const stripLabel = stale ? t("offline.stale") : online ? t("online") : t("offline");

  return (
    <Screen>
      <Header title={t("tripCache")} onBack={onBack} />
      <div role="status" style={{ flex: "none", minHeight: 44, display: "flex", alignItems: "center", gap: 9, padding: "0 16px", background: stripBg, borderBottom: `1px solid ${stripBorder}` }}>
        <Icon name={tone === "online" ? "check" : "alert"} size={16} color={stripFg} stroke={2.4} />
        <span style={{ ...sans(14, 600, 1), color: stripFg }}>{stripLabel}</span>
        <span style={{ marginLeft: "auto", ...sans(13, 500, 1), color: stripFg, opacity: 0.85 }}>
          {lastSyncAt ? <span className="num">{age(lastSyncAt)}</span> : t("offline.neverSynced")}
        </span>
      </div>
      <Body pad={14}>
        <Card tone="safe" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Icon name="map" size={26} color={color.onlineText} />
          <div style={{ ...sans(15, 600, 1.3), color: color.harbourText }}>{t("bundledTiles")}</div>
        </Card>

        <Card>
          <div style={{ ...sans(13, 600, 1, ".06em"), color: color.inkFaint, marginBottom: 12, textTransform: "uppercase" }}>{t("tripCache")}</div>
          {items.map((it, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: i < items.length - 1 ? `1px solid ${color.lineFaint}` : "none" }}>
              <Icon name={it.have ? "check" : "unknown"} size={18} color={it.have ? color.onlineText : color.inkGhost} stroke={2.4} />
              <span style={{ ...sans(15, 500, 1.2), color: it.have ? color.ink : color.inkFaint, flex: 1, minWidth: 0 }}>{it.label}</span>
              <Num size={12} weight={500} color={it.have ? color.inkMuted : color.inkFaint}>{it.value}</Num>
            </div>
          ))}
          {trip && (
            <div style={{ marginTop: 12, ...sans(13, 400, 1.3), color: stale ? color.dangerText : color.inkMuted }}>
              {t("offline.trip.savedAt")}: <span className="num">{localiseDigits(new Date(trip.savedAt).toLocaleString(), lang)}</span>
              {trip.score != null && <> · <span className="num">{formatNumber(trip.score, lang, 0)}</span>/<span className="num">{localiseDigits("100", lang)}</span></>}
            </div>
          )}
        </Card>

        <BigButton variant="sea" minHeight={touch.answerAction} onClick={onSave} disabled={!canSave} icon={<Icon name="save" size={24} color={color.headerText} />}>
          {trip ? t("downloadTripAgain") : t("downloadTrip")}
        </BigButton>
        {!canSave && <div style={{ ...sans(13, 400, 1.4), color: color.inkFaint }}>{t("saveNeedsAnswer")}</div>}
      </Body>
    </Screen>
  );
}
