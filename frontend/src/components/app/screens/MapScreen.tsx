"use client";

/**
 * 07 MAP and 08 FISHING SPOT.
 *
 * The map with the answer's layers as toggles, a north/zoom column, and the
 * hourly forecast strip from a timeseries_chart card when the answer has one.
 * Tapping a numbered zone opens the spot card: rank, the API's own advisory
 * wording, its suitability score, three of its numbers, and the evidence it
 * cites. "Show the way" draws the straight line between the phone and the
 * spot with the API's distance and bearing -- a picture of two numbers, not
 * a route.
 *
 * Layer names are the API's. The design lists five fixed layer names; the
 * contract sends whatever layers the answer has. See deviations #9.
 */

import React, { useMemo, useRef, useState } from "react";
import { color } from "@/lib/design/tokens";
import { type LangCode } from "@/lib/i18n/app";
import { formatNumber, localiseDigits } from "@/lib/i18n/digits";
import { cardOfType, evidenceFor, type Envelope, type FishingZone } from "@/lib/contract/envelope";
import { AppMap, type MapFocus } from "../AppMap";
import { Icon, Num, Screen, btnReset, sans } from "../primitives";

interface Props {
  envelope: Envelope | null; position: { lat: number; lon: number } | null; center: { lat: number; lon: number };
  lang: LangCode; t: (k: string) => string; onSpeak: (text: string) => void;
}

const hourLabel = (iso: string, lang: LangCode) => localiseDigits(String(new Date(iso).getUTCHours()).padStart(2, "0"), lang);

export function MapScreen({ envelope, position, center, lang, t, onSpeak }: Props) {
  const layers = useMemo(() => envelope?.layers ?? [], [envelope]);
  const [visible, setVisible] = useState<boolean[]>(() => layers.map((l) => l.visible_by_default !== false));
  const [open, setOpen] = useState(true);
  const [zone, setZone] = useState<FishingZone | null>(null);
  const [lineTo, setLineTo] = useState<FishingZone | null>(null);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [hour, setHour] = useState(0);
  const api = useRef<{ zoomIn: () => void; north: () => void } | null>(null);

  // Toggle state follows the answer: a new answer resets to its defaults.
  const lastEnvelope = useRef(envelope);
  if (lastEnvelope.current !== envelope) { lastEnvelope.current = envelope; setVisible(layers.map((l) => l.visible_by_default !== false)); setZone(null); setLineTo(null); setHour(0); }

  const pfz = envelope ? cardOfType(envelope, "pfz_ranking") : null;
  const zones = pfz?.zones ?? [];
  const ts = envelope ? cardOfType(envelope, "timeseries_chart") : null;
  const points = ts?.points ?? [];
  const pt = points[hour];
  const maxWave = points.reduce((m, p) => Math.max(m, p.wave_height_m), 0) || 1;

  const wmsCount = layers.filter((l) => l.kind === "wms").length;

  return (
    <Screen>
      <div style={{ flex: "none", background: color.header, padding: "13px 16px", display: "flex", alignItems: "center", gap: 12, minHeight: 56 }}>
        <span style={{ ...sans(18, 600, 1), color: color.headerText }}>{t("mapTitle")}</span>
        <span style={{ marginLeft: "auto", ...sans(13, 500, 1), color: color.headerMuted }}>{zones.length ? t("tapZone") : ""}</span>
      </div>

      <div style={{ flex: 1, position: "relative", minHeight: 250, background: color.mapTint }}>
        <AppMap center={center} layers={layers} visible={visible} zones={zones} position={position} focus={focus} lineTo={lineTo}
          onZoneTap={(z) => { setZone(z); setFocus({ lat: z.latitude, lon: z.longitude, nonce: Date.now() }); }} onReady={(a) => { api.current = a; }} />

        {!zone && (
          <div style={{ position: "absolute", top: 12, left: 12, right: 12, display: "flex", gap: 10, alignItems: "flex-start", zIndex: 500 }}>
            <div style={{ flex: 1, minWidth: 0, border: `1px solid ${color.lineSoft}`, borderRadius: 18, background: "rgba(255,255,255,.97)", boxShadow: "0 4px 14px rgba(18,48,58,.10)", overflow: "hidden", maxHeight: "60%", display: "flex", flexDirection: "column" }}>
              <button onClick={() => setOpen((o) => !o)} style={{ ...btnReset, display: "flex", alignItems: "center", gap: 9, padding: "12px 13px", width: "100%", minHeight: 48, borderBottom: open ? `1px solid ${color.lineFaint}` : "none" }}>
                <Icon name="map" size={18} color={color.sea} />
                <span style={{ ...sans(15, 600, 1), color: color.ink }}>{t("layers")}</span>
                <span style={{ marginLeft: "auto", transform: open ? "rotate(-90deg)" : "rotate(90deg)", display: "flex" }}><Icon name="chevron" size={16} color={color.inkGhost} stroke={2.4} /></span>
              </button>
              {open && (layers.length === 0 ? (
                <div style={{ ...sans(14, 400, 1.4), color: color.inkMuted, padding: "12px 13px" }}>{envelope ? t("noLayers") : t("layersHint")}</div>
              ) : layers.map((l, i) => {
                const on = visible[i], wms = l.kind === "wms";
                const hex = typeof l.color === "string" && l.color ? l.color : color.sea;
                return (
                  <button key={i} disabled={wms} onClick={() => setVisible((v) => v.map((x, j) => (j === i ? !x : x)))}
                    style={{ ...btnReset, display: "flex", alignItems: "center", gap: 10, minHeight: 48, padding: "0 13px", width: "100%", borderBottom: `1px solid ${color.lineFaint}`, opacity: wms ? 0.5 : 1 }}>
                    <i style={{ width: 14, height: 14, borderRadius: 4, flex: "none", background: on ? hex : color.cardMuted, border: `1px solid ${on ? hex : color.lineStrong}` }} />
                    <span style={{ ...sans(15, 500, 1.2), color: on ? color.ink : color.inkFaint, flex: 1, minWidth: 0, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.name}</span>
                    <span style={{ width: 44, height: 26, borderRadius: 13, background: on && !wms ? color.sea : color.lineStrong, position: "relative", display: "block", flex: "none" }}>
                      <i style={{ position: "absolute", top: 3, left: on && !wms ? 21 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", display: "block", transition: "left .15s" }} />
                    </span>
                  </button>
                );
              }))}
              {open && wmsCount > 0 && <div style={{ ...sans(12, 400, 1.3), color: color.inkFaint, padding: "8px 13px" }}>{t("wmsNote")}</div>}
            </div>
            <div style={{ width: 52, flex: "none", display: "flex", flexDirection: "column", gap: 8 }}>
              <button onClick={() => api.current?.north()} style={{ ...btnReset, height: 52, borderRadius: 12, border: `1px solid ${color.lineSoft}`, background: "rgba(255,255,255,.97)", boxShadow: "0 4px 14px rgba(18,48,58,.10)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color.sea} strokeWidth="2"><path d="M12 21V3l6 12H6l6-12" /></svg>
                <Num size={10} weight={700} color={color.sea} style={{ marginTop: 2 }}>N</Num>
              </button>
              <button onClick={() => api.current?.zoomIn()} style={{ ...btnReset, height: 52, borderRadius: 12, border: `1px solid ${color.lineSoft}`, background: "rgba(255,255,255,.97)", boxShadow: "0 4px 14px rgba(18,48,58,.10)", ...sans(17, 700, 1), color: color.sea }}>+</button>
            </div>
          </div>
        )}

        {zone && (
          <div style={{ position: "absolute", left: 10, right: 10, bottom: 10, borderRadius: 20, border: `1px solid ${color.lineStrong}`, background: color.card, padding: 18, animation: "orca-up .3s ease-out", zIndex: 600, maxHeight: "80%", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
              <div style={{ width: 52, height: 52, flex: "none", borderRadius: "50%", background: zone.within_mpa ? "#c62828" : "#1f7a4c", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Num size={22} weight={700} color={color.headerText}>{localiseDigits(String(zone.rank), lang)}</Num>
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ ...sans(20, 600, 1.2), color: color.ink, overflowWrap: "anywhere" }}>{zone.name}</div>
                <div style={{ ...sans(14, 400, 1.3), color: zone.within_mpa ? color.dangerText : color.onlineText, marginTop: 3 }}>{zone.within_mpa && zone.mpa_name ? zone.mpa_name : zone.advisory_status}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <Num size={30} weight={700} color={zone.within_mpa ? color.dangerText : color.onlineText}>{formatNumber(zone.suitability_score, lang, 0)}</Num>
                <div style={{ marginTop: 3 }}><Num size={11} weight={500} color={color.inkGhost}>/{localiseDigits("100", lang)}</Num></div>
              </div>
              <button onClick={() => { setZone(null); setLineTo(null); }} aria-label="close" style={{ ...btnReset, minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center", margin: "-8px -10px -8px 0" }}><Icon name="stop" size={22} color={color.inkGhost} /></button>
            </div>
            <div style={{ display: "flex", gap: 9, margin: "16px 0 14px" }}>
              {[
                { v: formatNumber(zone.distance_km, lang, 1), u: "km", l: t("distanceL") },
                { v: formatNumber(zone.sst_c ?? null, lang, 1), u: "°C", l: t("sstL") },
                { v: formatNumber(zone.depth_m ?? null, lang, 0), u: "m", l: t("depthL") },
              ].map((s, i) => (
                <div key={i} style={{ flex: 1, minWidth: 0, border: `1px solid ${color.lineSoft}`, borderRadius: 12, background: color.cardMuted, padding: "12px 10px" }}>
                  <Num size={21} weight={700} color={color.ink} style={{ overflowWrap: "anywhere" }}>{s.v}</Num> <Num size={11} weight={500} color={color.inkGhost}>{s.u}</Num>
                  <div style={{ ...sans(12, 400, 1.2), color: color.inkMuted, marginTop: 6 }}>{s.l}</div>
                </div>
              ))}
            </div>
            {envelope && pfz && evidenceFor(envelope, pfz).slice(0, 4).map((e) => (
              <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 0", borderTop: `1px solid ${color.lineFaint}` }}>
                <Icon name="check" size={15} color={color.onlineText} stroke={2.6} />
                <span style={{ ...sans(14, 400, 1.3), color: color.ink, flex: 1, minWidth: 0 }}>{e.variable} <span className="num" style={{ fontWeight: 600 }}>{localiseDigits(e.value, lang)} {e.unit}</span></span>
                <Num size={12} weight={500} color={color.inkGhost}>{e.provider}</Num>
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button onClick={() => setLineTo(zone)} disabled={!position} style={{ ...btnReset, flex: 1, minHeight: 60, borderRadius: 16, background: color.sea, boxShadow: "0 2px 8px rgba(11,107,125,.28)", color: color.headerText, ...sans(17, 700, 1), opacity: position ? 1 : 0.5 }}>
                {t("route")} · <span className="num">{formatNumber(zone.distance_km, lang, 1)} km · {localiseDigits(String(Math.round(zone.bearing_deg)), lang)}°</span>
              </button>
              <button onClick={() => onSpeak(`${zone.name}. ${zone.advisory_status}.`)} style={{ ...btnReset, width: 74, minHeight: 60, borderRadius: 16, border: `1px solid ${color.lineStrong}`, background: color.card, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="speaker" size={24} color={color.sea} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Forecast strip: only when the answer carries a timeseries card. */}
      <div style={{ flex: "none", background: color.card, borderTop: `1px solid ${color.line}`, padding: "12px 14px 14px" }}>
        {points.length === 0 ? (
          <div style={{ ...sans(14, 400, 1.3), color: color.inkFaint }}>{t("noForecast")}</div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "baseline", gap: 9, marginBottom: 9 }}>
              <span style={{ ...sans(14, 600, 1), color: color.ink }}>{t("forecast")}</span>
              <Num size={18} weight={700} color={color.sea}>{pt ? hourLabel(pt.timestamp, lang) + ":00" : ""}</Num>
              <Num size={14} weight={500} color={color.inkSoft} style={{ marginLeft: "auto" }}>{pt ? `${formatNumber(pt.wave_height_m, lang, 1)} m · ${formatNumber(pt.wind_knots, lang, 0)} kt` : ""}</Num>
            </div>
            <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 58 }}>
              {points.map((p, i) => (
                <button key={i} onClick={() => setHour(i)} style={{ ...btnReset, flex: 1, minWidth: 0, height: 58, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 5 }}>
                  <i style={{ display: "block", width: "100%", borderRadius: 999, background: color.sea, height: `${Math.max(6, (p.wave_height_m / maxWave) * 40)}px`, opacity: i === hour ? 1 : 0.35 }} />
                  <Num size={10} weight={600} color={i === hour ? color.sea : color.inkGhost}>{hourLabel(p.timestamp, lang)}</Num>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </Screen>
  );
}
