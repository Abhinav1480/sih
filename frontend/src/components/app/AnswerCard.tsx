"use client";

/**
 * ORCA's turn in a thread: the rich answer, compact.
 *
 * Verdict word and band colour by keyed lookup; the headline from
 * answer.headline; wave and wind from evidence; the cached/degraded notes;
 * doors to the full answer, Why and Evidence. Nothing is decided here.
 */

import React from "react";
import { color, touch } from "@/lib/design/tokens";
import { verdictPresentation } from "@/lib/design/verdict";
import { type LangCode } from "@/lib/i18n/app";
import { formatNumber, localiseDigits } from "@/lib/i18n/digits";
import { formatAge } from "@/lib/offline/store";
import type { Envelope, EvidenceRecord } from "@/lib/contract/envelope";
import { Icon, Num, btnReset, sans } from "./primitives";

type T = (k: string) => string;

function firstNumber(evidence: EvidenceRecord[], needle: string): { n: number | null; unit: string } {
  const rec = evidence.find((e) => e.variable.toLowerCase().includes(needle));
  const n = rec ? Number(String(rec.value).trim().split(/\s/)[0]) : NaN;
  return { n: Number.isFinite(n) ? n : null, unit: rec?.unit ?? "" };
}

export function AnswerCard({ envelope, lang, t, onOpen, onWhy, onEvidence, onListen, speaking }: {
  envelope: Envelope; lang: LangCode; t: T; onOpen: () => void; onWhy: () => void; onEvidence: () => void; onListen?: () => void; speaking?: boolean;
}) {
  const v = verdictPresentation(envelope.answer?.verdict, envelope.risk?.band, lang);
  const wave = firstNumber(envelope.evidence, "wave"), wind = firstNumber(envelope.evidence, "wind");
  const heroInk = v?.icon === "alert" ? color.cautionHeaderInk : color.headerText;
  return (
    <div style={{ border: `1px solid ${color.lineSoft}`, borderRadius: 20, background: color.card, boxShadow: "0 2px 8px rgba(18,48,58,.06)", overflow: "hidden", maxWidth: "94%" }}>
      <button onClick={onOpen} style={{ ...btnReset, width: "100%", textAlign: "left" }}>
        <div style={{ background: v?.hex ?? color.inkGhost, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
          <Icon name={v ? (v.icon === "unknown" ? "help" : v.icon) : "help"} size={30} color={heroInk} stroke={2.4} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ ...sans(28, 700, 1, "-.01em"), color: heroInk, overflowWrap: "anywhere" }}>{v?.word ?? t("noVerdict")}</div>
            {v?.isRaw && v.bandWord && <div style={{ ...sans(12, 600, 1.2), color: heroInk, opacity: 0.85, marginTop: 4 }}>{v.bandWord}</div>}
          </div>
          <Icon name="chevron" size={18} color={heroInk} />
        </div>
        <div style={{ padding: "12px 14px 4px" }}>
          {envelope.meta?.cached && envelope.meta.cached_at && (
            <div style={{ ...sans(12, 600, 1.3), color: color.dangerText, marginBottom: 8 }}>{t("offline.cached").replace("{age}", localiseDigits(formatAge(envelope.meta.cached_at, lang), lang))}</div>
          )}
          {envelope.meta?.degraded && <div style={{ ...sans(12, 500, 1.3), color: color.cautionText, marginBottom: 8 }}>{t("degraded")}</div>}
          <div style={{ ...sans(17, 500, 1.4), color: color.ink }}>{envelope.answer?.headline}</div>
          <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap", alignItems: "baseline" }}>
            <span><Num size={20} weight={700}>{formatNumber(wave.n, lang, 1)}</Num> <Num size={11} weight={500} color={color.inkGhost}>{wave.unit}</Num> <span style={{ ...sans(12, 400, 1), color: color.inkSoft }}>{t("waveL")}</span></span>
            <span><Num size={20} weight={700}>{formatNumber(wind.n, lang, 0)}</Num> <Num size={11} weight={500} color={color.inkGhost}>{wind.unit}</Num> <span style={{ ...sans(12, 400, 1), color: color.inkSoft }}>{t("windL")}</span></span>
          </div>
        </div>
      </button>
      <div style={{ display: "flex", gap: 6, padding: "8px 10px 10px" }}>
        {onListen && <button onClick={onListen} aria-label={t("listenAgain")} style={{ ...btnReset, minWidth: 48, minHeight: 48, borderRadius: 12, background: speaking ? color.seaTint : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="speaker" size={22} color={color.sea} /></button>}
        <button onClick={onWhy} style={{ ...btnReset, flex: 1, minHeight: 48, borderRadius: 12, border: `1px solid ${color.lineSoft}`, ...sans(14, 600, 1), color: color.sea }}>{t("why")}</button>
        <button onClick={onEvidence} style={{ ...btnReset, flex: 1, minHeight: 48, borderRadius: 12, border: `1px solid ${color.lineSoft}`, ...sans(14, 600, 1), color: color.sea }}>{t("evidence")}</button>
      </div>
      <div style={{ height: 0, minHeight: touch.min * 0 }} />
    </div>
  );
}
