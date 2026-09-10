"use client";

/**
 * 13 EMERGENCY (WORKS OFFLINE).
 *
 * GPS position in large monospace, the vessel name, one-tap calls, and the
 * nearest safe harbour with its distance and bearing -- all computed on the
 * phone from the bundled harbour list and the live fix. No network.
 *
 * The design's contact list carries a sample family number. That is never
 * rendered: contacts are the published helplines plus whatever the user saved
 * in the vessel profile. See docs/APP_DESIGN_DEVIATIONS.md #6.
 */

import React from "react";
import { color, touch } from "@/lib/design/tokens";
import { type LangCode } from "@/lib/i18n/app";
import { formatCoordinate, formatNumber, localiseDigits } from "@/lib/i18n/digits";
import type { GeofencePosition } from "@/lib/geofence";
import { EMERGENCY_CONTACTS, haversineKm } from "@/lib/offline/tripCard";
import type { VesselProfile } from "@/lib/offline/store";
import { Body, Card, Header, Icon, Num, Screen, sans } from "../primitives";

interface Harbour { name: string; lat: number; lon: number }

interface Props {
  position: GeofencePosition | null; profile: VesselProfile | null; harbours: Harbour[];
  lang: LangCode; t: (k: string) => string; onBack: () => void;
}

function bearing(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const φ1 = (a.lat * Math.PI) / 180, φ2 = (b.lat * Math.PI) / 180, Δλ = ((b.lon - a.lon) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2), x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export function EmergencyScreen({ position, profile, harbours, lang, t, onBack }: Props) {
  const nearest = position && harbours.length
    ? harbours.map((h) => ({ h, km: haversineKm(position.lat, position.lon, h.lat, h.lon) })).sort((a, b) => a.km - b.km)[0]
    : null;
  const fixAge = position ? Math.round((Date.now() - new Date(position.at).getTime()) / 1000) : null;

  return (
    <Screen>
      <div style={{ flex: "none", background: "#c62828", padding: "14px 16px", display: "flex", alignItems: "center", gap: 11, minHeight: 56 }}>
        <button onClick={onBack} aria-label="back" style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", margin: "-8px 0 -8px -8px" }}>
          <Icon name="back" size={26} color={color.headerText} stroke={2.4} />
        </button>
        <span style={{ ...sans(21, 700, 1), color: color.headerText }}>{t("emergency")}</span>
        <span style={{ marginLeft: "auto", ...sans(12, 600, 1), color: color.dangerHeaderMuted, textAlign: "right" }}>{t("worksOffline")}</span>
      </div>
      <Body pad={14}>
        <Card style={{ boxShadow: "0 2px 8px rgba(18,48,58,.06)", padding: 15 }}>
          <div style={{ ...sans(13, 600, 1, ".06em"), color: color.inkFaint, marginBottom: 10 }}>{t("position")}</div>
          {position ? (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <Num size={26} weight={700} color={color.ink}>{formatCoordinate(position.lat, "lat", lang)}</Num>
                <Num size={26} weight={700} color={color.ink}>{formatCoordinate(position.lon, "lon", lang)}</Num>
              </div>
              <div style={{ display: "flex", gap: 14, marginTop: 11, flexWrap: "wrap" }}>
                {position.accuracy != null && <Num size={13} weight={500} color={color.inkMuted}>±{formatNumber(position.accuracy, lang, 0)} m</Num>}
                {fixAge != null && <Num size={13} weight={500} color={color.inkMuted}>{localiseDigits(String(fixAge), lang)}s</Num>}
                {profile?.name && <span style={{ ...sans(13, 600, 1), color: color.inkMuted }}>{profile.name}</span>}
              </div>
            </>
          ) : (
            <div style={{ ...sans(16, 500, 1.3), color: color.inkMuted }}>{t("noFix")}</div>
          )}
        </Card>

        {EMERGENCY_CONTACTS.map((ct) => {
          const label = ct.name.startsWith("offline.contact.") ? t(ct.name) : ct.name;
          const hasNumber = ct.number.trim().length > 0;
          const inner = (
            <>
              <div style={{ width: 48, height: 48, flex: "none", borderRadius: 12, background: hasNumber ? "#c62828" : color.lineStrong, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="phone" size={24} color={color.headerText} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ ...sans(18, 600, 1.15), color: color.ink }}>{label}</div>
                <Num size={16} weight={600} color={hasNumber ? color.dangerText : color.inkFaint} style={{ marginTop: 5 }}>{hasNumber ? ct.number : t("offline.contact.seeBoard")}</Num>
              </div>
              {hasNumber && <span style={{ ...sans(12, 600, 1, ".08em"), color: color.inkMuted }}>{t("call")}</span>}
            </>
          );
          const style: React.CSSProperties = { minHeight: touch.contact, borderRadius: 14, border: `1px solid ${hasNumber ? color.dangerBorder : color.lineSoft}`, background: hasNumber ? "#fff5f5" : color.card, display: "flex", alignItems: "center", gap: 13, padding: "0 15px", textDecoration: "none", width: "100%" };
          return hasNumber
            ? <a key={ct.name} href={`tel:${ct.number.replace(/\s/g, "")}`} style={style}>{inner}</a>
            : <div key={ct.name} style={style}>{inner}</div>;
        })}

        {nearest && position && (
          <div style={{ border: `1px solid ${color.harbourBorder}`, borderRadius: 16, background: color.onlineBg, padding: 15, display: "flex", alignItems: "center", gap: 13 }}>
            <Icon name="pin" size={26} color={color.onlineText} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ ...sans(17, 600, 1.2), color: color.harbourText }}>{t("nearestHarbour")}</div>
              <div style={{ ...sans(14, 400, 1.2), color: color.harbourMuted, marginTop: 4 }}>{nearest.h.name}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <Num size={23} weight={700} color={color.onlineText}>{formatNumber(nearest.km, lang, 1)}</Num>
              <div style={{ marginTop: 4 }}><Num size={12} weight={500} color={color.onlineMuted}>km · {localiseDigits(String(Math.round(bearing(position, nearest.h))), lang)}°</Num></div>
            </div>
          </div>
        )}
      </Body>
    </Screen>
  );
}
