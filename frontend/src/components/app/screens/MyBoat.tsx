"use client";

/**
 * 09 MY BOAT.
 *
 * The vessel card with the facts the fisherman typed, rows to the other
 * parts of the app, and the emergency button. The design's "Safe wave" stat
 * is a threshold and is not shown here: the backend judges, the app does
 * not. See deviations #10.
 */

import React, { useState } from "react";
import { color, touch } from "@/lib/design/tokens";
import { type LangCode } from "@/lib/i18n/app";
import { formatNumber } from "@/lib/i18n/digits";
import type { VesselProfile } from "@/lib/offline/store";
import { Body, Card, Icon, Num, Screen, btnReset, sans } from "../primitives";

interface Props {
  profile: VesselProfile | null; lang: LangCode; langNative: string; t: (k: string) => string;
  onSave: (p: VesselProfile) => Promise<void>; onLanguage: () => void; onTrips: () => void; onOffline: () => void; onEmergency: () => void;
  demoActive: boolean; onDemo: () => void;
}

const field = (label: string, value: string, set: (v: string) => void, mono = false, inputMode: "text" | "decimal" | "numeric" = "text") => (
  <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 45%", minWidth: 120 }}>
    <span style={{ ...sans(12, 500, 1), color: color.inkFaint }}>{label}</span>
    <input value={value} onChange={(e) => set(e.target.value)} inputMode={inputMode}
      style={{ minHeight: 48, borderRadius: 10, border: `1px solid ${color.lineStrong}`, padding: "0 12px", fontFamily: mono ? "'JetBrains Mono', monospace" : "inherit", fontSize: 16, color: color.ink, background: color.card, width: "100%" }} />
  </label>
);

export function MyBoatScreen({ profile, lang, langNative, t, onSave, onLanguage, onTrips, onOffline, onEmergency, demoActive, onDemo }: Props) {
  const [name, setName] = useState(profile?.name ?? "");
  const [type, setType] = useState(profile?.type ?? "");
  const [len, setLen] = useState(profile?.length_m != null ? String(profile.length_m) : "");
  const [crew, setCrew] = useState(profile?.crew != null ? String(profile.crew) : "");
  const [reg, setReg] = useState(profile?.registration ?? "");
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(!profile?.name);

  const num = (s: string) => { const n = Number(s); return s.trim() && Number.isFinite(n) ? n : undefined; };
  const save = async () => {
    await onSave({ name: name.trim() || undefined, type: type.trim() || undefined, length_m: num(len), crew: num(crew), registration: reg.trim() || undefined });
    setSaved(true); setEditing(false); setTimeout(() => setSaved(false), 1500);
  };

  const rows: { icon: React.ReactNode; title: string; sub: string; go: () => void }[] = [
    { icon: <Icon name="list" size={24} color={color.sea} />, title: t("trips"), sub: t("tripsHint"), go: onTrips },
    { icon: <Icon name="save" size={24} color={color.sea} />, title: t("tripCache"), sub: t("bundledTiles"), go: onOffline },
    { icon: <Icon name="globe" size={24} color={color.sea} />, title: t("language"), sub: langNative, go: onLanguage },
  ];

  return (
    <Screen>
      <div style={{ flex: "none", background: color.header, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, minHeight: 56 }}>
        <span style={{ ...sans(18, 600, 1), color: color.headerText }}>{t("profile")}</span>
        <button onClick={onLanguage} style={{ ...btnReset, marginLeft: "auto", minHeight: 44, padding: "0 14px", display: "flex", alignItems: "center", gap: 8, borderRadius: 9, border: "1px solid rgba(255,255,255,.35)", background: "rgba(255,255,255,.1)" }}>
          <Icon name="globe" size={16} color={color.headerText} stroke={1.9} />
          <span style={{ ...sans(14, 600, 1), color: color.headerText }}>{langNative}</span>
        </button>
      </div>
      <Body pad={14}>
        <Card style={{ padding: 0, overflow: "hidden", boxShadow: "0 2px 8px rgba(18,48,58,.06)" }}>
          <div style={{ height: 96, background: "#e6f2f4", display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 8 }}><Icon name="boat" size={64} color={color.sea} stroke={1.4} /></div>
          <div style={{ padding: "14px 15px 16px" }}>
            {editing ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {field(t("boatName"), name, setName)}
                {field(t("boatTypeL"), type, setType)}
                {field(t("boatLength") + " (m)", len, setLen, true, "decimal")}
                {field(t("boatCrew"), crew, setCrew, true, "numeric")}
                {field(t("boatReg"), reg, setReg, true)}
                <button onClick={save} style={{ ...btnReset, flex: "1 1 100%", minHeight: touch.min, borderRadius: 14, background: color.sea, color: color.headerText, ...sans(17, 700, 1), marginTop: 4 }}>{saved ? t("boatSaved") : t("boatSave")}</button>
                {!profile?.name && <div style={{ ...sans(13, 400, 1.4), color: color.inkMuted, flex: "1 1 100%" }}>{t("boatEmpty")}</div>}
              </div>
            ) : (
              <button onClick={() => setEditing(true)} style={{ ...btnReset, width: "100%", textAlign: "left" }}>
                <div style={{ ...sans(21, 700, 1), color: profile?.name ? color.ink : color.inkFaint, textTransform: "uppercase" }}>{profile?.name || t("boatName")}</div>
                <div style={{ ...sans(14, 400, 1.2), color: color.inkMuted, marginTop: 5 }}>{[profile?.type, profile?.registration].filter(Boolean).join(" · ")}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "12px 10px", marginTop: 14 }}>
                  {/* Typed by the fisherman, not measured: an empty field says "none yet", not "Not measured". */}
                  {[{ v: profile?.length_m != null ? formatNumber(profile.length_m, lang, 1) : t("none"), u: profile?.length_m != null ? "m" : "", l: t("boatLength") }, { v: profile?.crew != null ? formatNumber(profile.crew, lang, 0) : t("none"), u: "", l: t("boatCrew") }].map((s, i) => (
                    <div key={i} style={{ width: "calc(33.33% - 7px)", borderLeft: `3px solid ${color.lineStrong}`, paddingLeft: 10 }}>
                      <Num size={18} weight={700} color={color.ink}>{s.v}</Num> <Num size={11} weight={500} color={color.inkGhost}>{s.u}</Num>
                      <div style={{ ...sans(12, 400, 1.25), color: color.inkMuted, marginTop: 5 }}>{s.l}</div>
                    </div>
                  ))}
                </div>
                <div style={{ ...sans(13, 400, 1.3), color: color.inkFaint, marginTop: 12 }}>{t("boatNote")}</div>
              </button>
            )}
          </div>
        </Card>

        {rows.map((r) => (
          <button key={r.title} onClick={r.go} style={{ ...btnReset, border: `1px solid ${color.lineSoft}`, borderRadius: 18, background: color.card, boxShadow: "0 1px 2px rgba(18,48,58,.05)", minHeight: 66, display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", textAlign: "left", width: "100%" }}>
            {r.icon}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ ...sans(16, 600, 1.2), color: color.ink }}>{r.title}</div>
              <div style={{ ...sans(13, 400, 1.3), color: color.inkMuted, marginTop: 3 }}>{r.sub}</div>
            </div>
            <Icon name="chevron" size={16} color={color.inkGhost} stroke={2.4} />
          </button>
        ))}

        <button onClick={onEmergency} style={{ ...btnReset, minHeight: 64, borderRadius: 14, border: "2px solid #c62828", background: color.dangerBg, color: color.dangerText, ...sans(18, 700, 1), display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <Icon name="alert" size={22} color={color.dangerText} />{t("emergency")}
        </button>

        <button onClick={onDemo} style={{ ...btnReset, minHeight: 48, borderRadius: 12, border: `1px dashed ${color.lineStrong}`, color: color.inkMuted, ...sans(14, 500, 1) }}>
          {demoActive ? t("demoStop") : t("demoDrive")}
        </button>
      </Body>
    </Screen>
  );
}
