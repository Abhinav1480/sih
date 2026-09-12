"use client";

/**
 * Onboarding (P3-1): three short steps -- language, home harbour, boat.
 * Each skippable, each resumable later from the profile. Nothing here is a
 * measurement; it is what the fisherman tells us about themselves.
 */

import React, { useEffect, useMemo, useState } from "react";
import { color, touch } from "@/lib/design/tokens";
import { LANGS, type LangCode } from "@/lib/i18n/app";
import { formatNumber } from "@/lib/i18n/digits";
import { HARBOURS, type Harbour } from "@/lib/data/harbours";
import { haversineKm } from "@/lib/offline/tripCard";
import type { VesselProfile } from "@/lib/offline/store";
import { BigButton, Icon, Num, Screen, btnReset, sans } from "../primitives";

type T = (k: string) => string;
export interface OnboardingResult { language: LangCode; harbour: Harbour | null; vessel: VesselProfile | null }

interface Props {
  t: T; lang: LangCode; position: { lat: number; lon: number } | null; initialVessel: VesselProfile | null;
  onLanguage: (l: LangCode) => void; onDone: (r: OnboardingResult) => void;
  /** The shell hands hardware Back here. Returns true when consumed. */
  registerBack?: (fn: () => boolean) => void;
}

const input = (label: string, value: string, set: (v: string) => void, mono = false, inputMode: "text" | "decimal" | "numeric" = "text") => (
  <label style={{ display: "flex", flexDirection: "column", gap: 6, flex: "1 1 45%", minWidth: 130 }}>
    <span style={{ ...sans(13, 500, 1), color: color.inkFaint }}>{label}</span>
    <input value={value} onChange={(e) => set(e.target.value)} inputMode={inputMode}
      style={{ minHeight: touch.min, borderRadius: 12, border: `1px solid ${color.lineStrong}`, padding: "0 14px", fontFamily: mono ? "'JetBrains Mono', monospace" : "inherit", fontSize: 18, color: color.ink, background: color.card, width: "100%" }} />
  </label>
);

export function OnboardingScreen({ t, lang, position, initialVessel, onLanguage, onDone, registerBack }: Props) {
  const [step, setStep] = useState(0);
  const [harbour, setHarbour] = useState<Harbour | null>(null);
  const [name, setName] = useState(initialVessel?.name ?? ""); const [type, setType] = useState(initialVessel?.type ?? "");
  const [len, setLen] = useState(initialVessel?.length_m != null ? String(initialVessel.length_m) : ""); const [crew, setCrew] = useState(initialVessel?.crew != null ? String(initialVessel.crew) : "");
  const [filter, setFilter] = useState("");

  // Nearest harbours first when a fix exists: a suggestion, not a decision.
  const harbours = useMemo(() => {
    const list = HARBOURS.filter((h) => h.name.toLowerCase().includes(filter.toLowerCase()));
    if (!position) return list.map((h) => ({ h, km: null as number | null }));
    return list.map((h) => ({ h, km: haversineKm(position.lat, position.lon, h.lat, h.lon) })).sort((a, b) => a.km! - b.km!);
  }, [position, filter]);

  const num = (s: string) => { const n = Number(s); return s.trim() && Number.isFinite(n) ? n : undefined; };
  const vessel = (): VesselProfile | null => {
    const v: VesselProfile = { name: name.trim() || undefined, type: type.trim() || undefined, length_m: num(len), crew: num(crew) };
    return Object.values(v).some((x) => x !== undefined) ? v : null;
  };
  const finish = () => onDone({ language: lang, harbour, vessel: vessel() });
  const next = () => (step < 2 ? setStep(step + 1) : finish());
  // Back never discards: it steps back, and from the first step it finishes with what is chosen.
  // Registered through a ref so the shell always calls the current render's closure, never a stale one.
  const backRef = React.useRef<() => boolean>(() => false);
  backRef.current = () => { console.info("[onb] back at step", step); if (step > 0) setStep(step - 1); else finish(); return true; };
  useEffect(() => { registerBack?.(() => backRef.current()); }, [registerBack]);

  const titles = [t("onbLanguage"), t("onbHarbour"), t("onbBoat")];
  return (
    <Screen>
      <div style={{ flex: "none", background: color.header, padding: "13px 16px", minHeight: 56, display: "flex", alignItems: "center", gap: 12 }}>
        {step > 0 && <button onClick={() => setStep(step - 1)} aria-label="back" style={{ ...btnReset, minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", margin: "-8px 0 -8px -8px" }}><Icon name="back" size={26} color={color.headerText} stroke={2.4} /></button>}
        <span style={{ ...sans(18, 600, 1), color: color.headerText, flex: 1 }}>{titles[step]}</span>
        <Num size={13} weight={500} color={color.headerMuted}>{step + 1}/3</Num>
      </div>
      <div style={{ flex: "none", height: 4, background: color.lineSoft }}><div style={{ height: "100%", width: `${((step + 1) / 3) * 100}%`, background: color.sea, transition: "width .2s" }} /></div>

      <div className="orca-body" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "18px 16px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
        {step === 0 && LANGS.map((l) => {
          const active = l.code === lang;
          return (
            <button key={l.code} onClick={() => onLanguage(l.code as LangCode)} aria-pressed={active}
              style={{ ...btnReset, minHeight: touch.min + 8, borderRadius: 16, border: `${active ? 2 : 1}px solid ${active ? color.sea : color.lineStrong}`, background: active ? color.seaTint : color.card, display: "flex", alignItems: "center", gap: 14, padding: "0 16px", textAlign: "left" }}>
              <span style={{ ...sans(22, 600, 1.2), color: color.ink, flex: 1 }}>{l.native}</span>
              {active && <Icon name="check" size={22} color={color.sea} stroke={2.6} />}
            </button>
          );
        })}

        {step === 1 && (
          <>
            <div style={{ ...sans(15, 400, 1.45), color: color.inkMuted }}>{t("onbHarbourBody")}</div>
            <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={t("searchHarbour")}
              style={{ minHeight: touch.min, borderRadius: 12, border: `1px solid ${color.lineStrong}`, padding: "0 14px", fontSize: 17, color: color.ink, background: color.card }} />
            {harbours.map(({ h, km }) => {
              const active = harbour?.name === h.name;
              return (
                <button key={h.name} onClick={() => setHarbour(h)} aria-pressed={active}
                  style={{ ...btnReset, minHeight: touch.min, borderRadius: 14, border: `${active ? 2 : 1}px solid ${active ? color.sea : color.lineSoft}`, background: active ? color.seaTint : color.card, display: "flex", alignItems: "center", gap: 12, padding: "0 14px", textAlign: "left" }}>
                  <Icon name="pin" size={20} color={active ? color.sea : color.inkGhost} />
                  <span style={{ ...sans(17, 500, 1.2), color: color.ink, flex: 1 }}>{h.name}</span>
                  {km !== null && <Num size={13} weight={500} color={color.inkFaint}>{formatNumber(km, lang, 0)} km</Num>}
                </button>
              );
            })}
          </>
        )}

        {step === 2 && (
          <>
            <div style={{ ...sans(15, 400, 1.45), color: color.inkMuted }}>{t("onbBoatBody")}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {input(t("boatName"), name, setName)}
              {input(t("boatTypeL"), type, setType)}
              {input(t("boatLength") + " (m)", len, setLen, true, "decimal")}
              {input(t("boatCrew"), crew, setCrew, true, "numeric")}
            </div>
          </>
        )}
      </div>

      <div style={{ flex: "none", padding: "10px 16px 20px", display: "flex", gap: 10, borderTop: `1px solid ${color.line}`, background: color.card }}>
        <button onClick={next} style={{ ...btnReset, minHeight: touch.min, padding: "0 18px", borderRadius: 14, color: color.inkMuted, ...sans(16, 500, 1) }}>{t("skip")}</button>
        <BigButton variant="sea" minHeight={touch.min} onClick={next} style={{ flex: 1, justifyContent: "center" }}><span style={{ textAlign: "center", display: "block" }}>{step < 2 ? t("next") : t("finish")}</span></BigButton>
      </div>
    </Screen>
  );
}
