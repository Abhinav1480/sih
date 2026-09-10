"use client";

/**
 * 05 WHY.
 *
 * The gauge, one bar per factor with its `points_added`, a visible sum line,
 * and the triggered rules. Every number is the API's. The bar widths are
 * proportions of the API's own score -- a way of drawing the numbers, not a
 * judgement about them.
 */

import React from "react";
import { color } from "@/lib/design/tokens";
import { BAND_RAMP, type Band } from "@/lib/design/verdict";
import { type LangCode } from "@/lib/i18n/app";
import { formatInt, localiseDigits } from "@/lib/i18n/digits";
import type { Envelope } from "@/lib/contract/envelope";
import { Body, Card, EmptyState, Header, Icon, Num, Screen, mono, sans } from "../primitives";

interface Props { envelope: Envelope; lang: LangCode; t: (k: string) => string; onBack: () => void }

/** A 240-degree arc gauge, drawn from the score and coloured by the band. */
function Gauge({ score, hex, lang }: { score: number; hex: string; lang: LangCode }) {
  const R = 52, C = 64, sweep = 240, start = 150;
  const polar = (deg: number) => ({ x: C + R * Math.cos((deg * Math.PI) / 180), y: C + R * Math.sin((deg * Math.PI) / 180) });
  const arc = (from: number, to: number) => {
    const a = polar(from), b = polar(to);
    return `M ${a.x} ${a.y} A ${R} ${R} 0 ${to - from > 180 ? 1 : 0} 1 ${b.x} ${b.y}`;
  };
  const clamped = Math.max(0, Math.min(100, score));
  return (
    <svg width="150" height="120" viewBox="0 0 128 112" aria-label={`${score} / 100`}>
      <path d={arc(start, start + sweep)} fill="none" stroke={color.lineBar} strokeWidth="12" strokeLinecap="round" />
      {clamped > 0 && <path d={arc(start, start + (clamped / 100) * sweep)} fill="none" stroke={hex} strokeWidth="12" strokeLinecap="round" />}
      <text x="64" y="66" textAnchor="middle" style={{ ...mono(30, 700), fill: color.ink } as React.CSSProperties}>{formatInt(score, lang)}</text>
      <text x="64" y="84" textAnchor="middle" style={{ ...mono(11, 500), fill: color.inkFaint } as React.CSSProperties}>/ {localiseDigits("100", lang)}</text>
    </svg>
  );
}

export function WhyScreen({ envelope, lang, t, onBack }: Props) {
  const risk = envelope.risk;
  const band = risk?.band && risk.band in BAND_RAMP ? BAND_RAMP[risk.band as Band] : null;
  const hex = band?.hex ?? color.inkGhost;

  return (
    <Screen>
      <Header title={t("why")} onBack={onBack} />
      {!risk ? (
        <EmptyState icon={<Icon name="help" size={40} color={color.inkGhost} />} title={t("noVerdict")} body={t("noRiskBody")} />
      ) : (
        <Body>
          <div style={{ display: "flex", justifyContent: "center" }}><Gauge score={risk.score} hex={hex} lang={lang} /></div>
          <div style={{ textAlign: "center", ...sans(15, 400, 1.35), color: color.inkMuted, margin: "0 0 6px" }}>{t("scoreNote")}</div>

          {risk.factors.map((f, i) => {
            // Bar width is the factor's share of the API's own score; a drawing, not a judgement.
            const width = Math.min(100, (f.points_added / Math.max(risk.score, 1)) * 100);
            return (
              <div key={i}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
                  <span style={{ ...sans(16, 500, 1.2), color: color.ink, flex: 1, minWidth: 0 }}>{f.name}</span>
                  <Num size={14} weight={500} color={color.inkFaint}>{localiseDigits(f.value, lang)}</Num>
                  <Num size={16} weight={700} color={hex}>+{formatInt(f.points_added, lang)}</Num>
                </div>
                <div style={{ height: 14, borderRadius: 7, background: color.lineBar, overflow: "hidden" }}>
                  <i style={{ display: "block", height: "100%", borderRadius: 7, background: hex, width: `${width}%` }} />
                </div>
              </div>
            );
          })}

          {/* The sum line: factors must add to the score, and the reader can see that they do. */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, borderTop: `2px solid ${color.lineStrong}`, paddingTop: 14, marginTop: 4 }}>
            <span style={{ ...sans(16, 600, 1), color: color.ink }}>{t("sum")}</span>
            <Num size={13} weight={500} color={color.inkFaint}>{risk.factors.map((f) => formatInt(f.points_added, lang)).join(" + ")}</Num>
            <Num size={26} weight={700} color={hex} style={{ marginLeft: "auto" }}>{formatInt(risk.score, lang)}</Num>
            <Num size={14} weight={500} color={color.inkFaint}>/{localiseDigits("100", lang)}</Num>
          </div>

          {risk.triggered_rules.length > 0 && (
            <Card tone="caution" style={{ ...sans(15, 400, 1.45), color: color.cautionPanelText }}>
              {risk.triggered_rules.map((r, i) => <div key={i} style={{ marginBottom: i < risk.triggered_rules.length - 1 ? 8 : 0 }}>{r}</div>)}
            </Card>
          )}

          {risk.missing_inputs.length > 0 && (
            <div style={{ ...sans(13, 400, 1.4), color: color.inkFaint }}>{t("notMeasuredPrefix")} {risk.missing_inputs.join(", ")}</div>
          )}
        </Body>
      )}
    </Screen>
  );
}
