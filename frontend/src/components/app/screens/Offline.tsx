"use client";

/**
 * 11 OFFLINE + SAVE TRIP.
 *
 * Connectivity, the saved map, the trip card, and one button to save the
 * current answer for the trip. Age is shown to the minute and turns red past
 * the stale threshold in lib/offline/store; a stale card is never a silent
 * pass.
 */

import React from "react";
import { color, touch } from "@/lib/design/tokens";
import { CACHE_ITEMS, type LangCode } from "@/lib/i18n/app";
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
  const items = ((CACHE_ITEMS as unknown as Record<string, string[]>)[lang] ?? (CACHE_ITEMS as unknown as Record<string, string[]>).en) ?? [];

  return (
    <Screen>
      <Header title={t("tripCache")} onBack={onBack} />
      <div role="status" style={{ flex: "none", minHeight: 44, display: "flex", alignItems: "center", gap: 9, padding: "0 16px", background: online ? color.onlineBg : stale ? color.dangerBg : color.cautionBg, borderBottom: `1px solid ${online ? color.onlineBorder : stale ? color.dangerBorder : color.cautionBorder}` }}>
        <Icon name={online ? "check" : "alert"} size={16} color={online ? color.onlineText : stale ? color.dangerText : color.cautionText} stroke={2.4} />
        <span style={{ ...sans(14, 600, 1), color: online ? color.onlineText : stale ? color.dangerText : color.cautionText }}>{online ? t("online") : t("offline")}</span>
        <span style={{ marginLeft: "auto", ...sans(13, 500, 1), color: online ? color.onlineMuted : stale ? color.dangerMuted : color.cautionSoft }}>
          {lastSyncAt ? <span className="num">{localiseDigits(formatAge(lastSyncAt, lang), lang)}</span> : t("offline.neverSynced")}
        </span>
      </div>
      <Body pad={14}>
        <Card tone="safe" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Icon name="map" size={26} color={color.onlineText} />
          <div style={{ ...sans(15, 600, 1.3), color: color.harbourText }}>{t("bundledTiles")}</div>
        </Card>

        <Card>
          <div style={{ ...sans(13, 600, 1, ".06em"), color: color.inkFaint, marginBottom: 12, textTransform: "uppercase" }}>{t("tripCache")}</div>
          {items.map((label, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: i < items.length - 1 ? `1px solid ${color.lineFaint}` : "none" }}>
              <Icon name={trip ? "check" : "unknown"} size={18} color={trip ? color.onlineText : color.inkGhost} stroke={2.4} />
              <span style={{ ...sans(15, 500, 1.2), color: trip ? color.ink : color.inkFaint }}>{label}</span>
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
