"use client";

/**
 * 12 -- the geofence interrupt.
 *
 * Full-width, persistent, requires acknowledgement. Distance and bearing in
 * large monospace. Fires from the local point-in-polygon test in
 * lib/geofence -- no network. The design titles this "BORDER WARNING"; the
 * backend has only marine protected area polygons, no IMBL or EEZ, so this
 * screen names the protected area and says protected area. Calling a
 * sanctuary edge a "sea border" would tell a fisherman he is near
 * international waters. See docs/APP_DESIGN_DEVIATIONS.md #7.
 */

import React from "react";
import { color, touch } from "@/lib/design/tokens";
import { type LangCode } from "@/lib/i18n/app";
import { formatNumber, localiseDigits } from "@/lib/i18n/digits";
import type { BoundaryFeature, GeofenceStatus } from "@/lib/geofence";
import { Icon, Num, sans } from "../primitives";

interface Props { status: GeofenceStatus; position: { lat: number; lon: number } | null; lang: LangCode; t: (k: string) => string; onAck: () => void }

const COMPASS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
const compass = (deg: number) => COMPASS[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];

/** Initial bearing from a to b, degrees clockwise from north. */
function bearingTo(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const φ1 = (a.lat * Math.PI) / 180, φ2 = (b.lat * Math.PI) / 180, Δλ = ((b.lon - a.lon) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2), x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Bearing to the boundary vertex nearest the phone -- geometry on the API's own polygon, no judgement. */
function bearingToNearestVertex(position: { lat: number; lon: number } | null, feature: BoundaryFeature | null): number | null {
  if (!position || !feature) return null;
  const ring = feature.geometry.type === "Polygon" ? feature.geometry.coordinates[0] : feature.geometry.coordinates;
  let best: { d: number; lat: number; lon: number } | null = null;
  for (const [lon, lat] of ring) {
    const d = (lat - position.lat) ** 2 + ((lon - position.lon) * Math.cos((position.lat * Math.PI) / 180)) ** 2;
    if (!best || d < best.d) best = { d, lat, lon };
  }
  return best ? bearingTo(position, best) : null;
}

export function BorderWarningOverlay({ status, position, lang, t, onAck }: Props) {
  const zone = status.inside ?? status.nearest?.feature ?? null;
  const bearingDeg = status.inside ? null : bearingToNearestVertex(position, zone);
  const zoneName = zone?.properties?.name ?? null;
  const distance = status.inside ? 0 : status.nearest?.distanceKm ?? null;

  return (
    <div role="alertdialog" aria-modal style={{ position: "absolute", inset: 0, background: color.scrim, display: "flex", flexDirection: "column", zIndex: 50 }}>
      <div style={{ background: "#c62828", padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <Icon name="stop" size={30} color={color.headerText} stroke={2.6} />
        <span style={{ ...sans(22, 700, 1.15), color: color.headerText }}>{t("paTitle")}</span>
      </div>
      <div style={{ marginTop: "auto", padding: "0 12px 12px" }}>
        <div style={{ border: "2px solid #c62828", borderRadius: 18, background: color.card, padding: 20 }}>
          <div style={{ ...sans(24, 600, 1.4), color: color.ink, marginBottom: 6, textWrap: "pretty" as never }}>{status.inside ? t("geoInside") : t("paBody")}</div>
          {zoneName && <div style={{ ...sans(16, 500, 1.3), color: color.dangerText, marginBottom: 16 }}>{zoneName}</div>}
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <div style={{ flex: 1, border: `1px solid ${color.dangerBorder}`, borderRadius: 13, background: color.dangerBg, padding: 14 }}>
              <Num size={34} weight={700} color={color.dangerText}>{formatNumber(distance, lang, 1)}</Num>
              <div style={{ ...sans(13, 500, 1), color: color.dangerMuted, marginTop: 6 }} className="num">km</div>
              <div style={{ ...sans(13, 400, 1.2), color: color.dangerMuted, marginTop: 8 }}>{t("paDistance")}</div>
            </div>
            <div style={{ flex: 1, border: `1px solid ${color.dangerBorder}`, borderRadius: 13, background: color.dangerBg, padding: 14 }}>
              <Num size={34} weight={700} color={color.dangerText}>{bearingDeg === null ? formatNumber(null, lang) : `${localiseDigits(String(Math.round(bearingDeg)), lang)}°`}</Num>
              <div style={{ ...sans(13, 500, 1), color: color.dangerMuted, marginTop: 6 }} className="num">{bearingDeg === null ? "" : compass(bearingDeg)}</div>
              <div style={{ ...sans(13, 400, 1.2), color: color.dangerMuted, marginTop: 8 }}>{t("bearing")}</div>
            </div>
          </div>
          <button onClick={onAck} style={{ width: "100%", minHeight: touch.ack, borderRadius: 14, border: "none", background: "#c62828", color: color.headerText, ...sans(19, 700, 1.2), cursor: "pointer" }}>{t("ack")}</button>
          <div style={{ textAlign: "center", ...sans(13, 400, 1.3), color: color.inkFaint, marginTop: 11 }}>{t("noDismiss")}</div>
        </div>
      </div>
    </div>
  );
}
