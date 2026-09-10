"use client";

/**
 * 04 ANSWER / 14 ANSWER (SAFE DAY).
 *
 * One enormous verdict word, the plain sentence, a replay control, three
 * large numbers, and the two doors: Why, and Where this came from.
 *
 * The verdict word and colour come from lib/design/verdict.ts, which is a
 * keyed lookup on answer.verdict and risk.band. This screen never looks at
 * risk.score to choose anything. The three numbers come from evidence
 * records the API sent; a number it did not send is "Not measured".
 */

import React, { useMemo } from "react";
import { color, touch } from "@/lib/design/tokens";
import { verdictPresentation } from "@/lib/design/verdict";
import { type LangCode } from "@/lib/i18n/app";
import { formatNumber, localiseDigits } from "@/lib/i18n/digits";
import type { Envelope, EvidenceRecord } from "@/lib/contract/envelope";
import { BigButton, Icon, Screen, StatTile, sans } from "../primitives";

interface Props {
  envelope: Envelope;
  lang: LangCode;
  t: (k: string) => string;
  onWhy: () => void;
  onEvidence: () => void;
  onReplay: () => void;
  /** Index of the word currently being spoken, or -1. Drives the highlight. */
  spokenWordIndex: number;
  speaking: boolean;
  voiceUnavailableNote: string | null;
  cachedNote: string | null;
}

/** First evidence record whose variable mentions any of `needles`. Exact API value, no parsing. */
function evidenceMatching(evidence: EvidenceRecord[], needles: string[]): EvidenceRecord | null {
  const lower = needles.map((n) => n.toLowerCase());
  return evidence.find((e) => lower.some((n) => e.variable.toLowerCase().includes(n))) ?? null;
}

/** The numeric part of an evidence value, for localised display. Null if it is not a number. */
function numericOf(record: EvidenceRecord | null): number | null {
  if (!record) return null;
  const n = Number(String(record.value).trim().split(/\s/)[0]);
  return Number.isFinite(n) ? n : null;
}

export function AnswerScreen({ envelope, lang, t, onWhy, onEvidence, onReplay, spokenWordIndex, speaking, voiceUnavailableNote, cachedNote }: Props) {
  const verdict = verdictPresentation(envelope.answer?.verdict, envelope.risk?.band, lang);
  const words = useMemo(() => (envelope.answer?.narrative ?? "").split(/\s+/).filter(Boolean), [envelope]);

  const wave = evidenceMatching(envelope.evidence, ["wave"]);
  const wind = evidenceMatching(envelope.evidence, ["wind"]);
  const waveN = numericOf(wave);
  const windN = numericOf(wind);

  // The design's third tile is "Come back by". The contract carries no return
  // time, so the tile shows the answer's validity window end, labelled as
  // what it is. The backend stamps IST wall-clock as Z (label "05:00 - 11:00"
  // <-> end_time 11:00Z), so the UTC hour is the one the label means.
  // See docs/APP_DESIGN_DEVIATIONS.md #12.
  const windowEnd = envelope.meta?.temporal?.end_time ? new Date(envelope.meta.temporal.end_time) : null;
  const windowLabel = windowEnd && !Number.isNaN(windowEnd.getTime())
    ? localiseDigits(`${String(windowEnd.getUTCHours()).padStart(2, "0")}:${String(windowEnd.getUTCMinutes()).padStart(2, "0")}`, lang)
    : null;

  const heroInk = verdict?.icon === "stop" ? color.headerText : color.cautionHeaderInk;

  return (
    <Screen>
      {/* Hero band: the verdict, enormous, colour + word + icon. */}
      <div style={{ flex: "none", background: verdict?.hex ?? color.inkGhost, padding: "22px 20px 20px", display: "flex", alignItems: "center", gap: 16 }}>
        {verdict ? (
          <>
            <Icon name={verdict.icon === "unknown" ? "help" : verdict.icon} size={40} color={heroInk} stroke={2.4} />
            <div style={{ minWidth: 0 }}>
              <div style={{ ...sans(46, 700, 1, "-.01em"), color: heroInk, overflowWrap: "anywhere" }}>{verdict.word}</div>
              {verdict.isRaw && verdict.bandWord && (
                <div style={{ ...sans(14, 600, 1.2), color: heroInk, opacity: 0.85, marginTop: 6 }}>{verdict.bandWord}</div>
              )}
            </div>
          </>
        ) : (
          <div style={{ ...sans(24, 600, 1.2), color: color.headerText }}>{t("noVerdict")}</div>
        )}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "20px 18px 24px", display: "flex", flexDirection: "column" }}>
        {cachedNote && (
          <div style={{ ...sans(13, 500, 1.3), color: color.cautionText, background: color.cautionPanel, border: `1px solid ${color.cautionPanelBorder}`, borderRadius: 12, padding: "10px 12px", marginBottom: 14 }}>{cachedNote}</div>
        )}

        {/* The narrative, word by word, so speech can highlight it. */}
        <div style={{ display: "flex", flexWrap: "wrap", fontSize: 0 }} aria-live="polite">
          {words.map((w, i) => {
            const lit = speaking && i === spokenWordIndex;
            return (
              <span key={i} style={{ ...sans(26, 500, 1.5), color: lit ? color.seaDark : color.ink, background: lit ? color.seaTint : "transparent", borderRadius: 5, padding: "1px 3px", marginRight: 5 }}>{w}</span>
            );
          })}
        </div>

        <BigButton variant="tint" minHeight={touch.replay} onClick={onReplay} style={{ marginTop: 18, borderRadius: 18, justifyContent: "center" }}
          icon={<Icon name="speaker" size={24} color={color.seaDark} stroke={2.2} />} disabled={!!voiceUnavailableNote}>
          <span style={{ textAlign: "center", display: "block" }}>{t("listenAgain")}</span>
        </BigButton>
        {voiceUnavailableNote && (
          <div style={{ ...sans(14, 400, 1.4), color: color.inkMuted, marginTop: 8 }}>{voiceUnavailableNote}</div>
        )}

        <div style={{ display: "flex", gap: 9, marginTop: 18 }}>
          <StatTile value={formatNumber(waveN, lang, 1)} unit={wave?.unit ?? "m"} label={t("waveL")} hex={verdict?.hex ?? color.ink}
            icon={<Icon name="wave" size={22} color={color.inkFaint} />} />
          <StatTile value={formatNumber(windN, lang, 0)} unit={wind?.unit ?? "kt"} label={t("windL")} hex={color.ink}
            icon={<Icon name="wind" size={22} color={color.inkFaint} />} />
          <StatTile value={windowLabel ?? formatNumber(null, lang)} unit="" label={t("validUntil")} hex={color.ink}
            icon={<Icon name="clock" size={22} color={color.inkFaint} />} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 18 }}>
          <BigButton minHeight={touch.answerAction} onClick={onWhy} icon={<Icon name="help" size={24} color={color.sea} />} trailing={<Icon name="chevron" size={18} color={color.inkGhost} />}>{t("why")}</BigButton>
          <BigButton minHeight={touch.answerAction} onClick={onEvidence} icon={<Icon name="list" size={24} color={color.sea} />} trailing={<Icon name="chevron" size={18} color={color.inkGhost} />}>{t("evidence")}</BigButton>
        </div>
      </div>
    </Screen>
  );
}
