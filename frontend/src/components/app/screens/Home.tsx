"use client";

/**
 * 01 HOME.
 *
 * Header with the language button; connectivity strip; the last verdict as a
 * card with the sea-now row; the map; two suggested questions; and the
 * hold-to-speak bar with a Type alternative.
 *
 * Everything on the verdict card is from the last answer -- verdict word and
 * colour via the keyed lookup, numbers from evidence. With no answer yet the
 * card shows a defined empty state inviting a question, not a fake verdict.
 */

import React from "react";
import { color, touch } from "@/lib/design/tokens";
import { verdictPresentation } from "@/lib/design/verdict";
import { type LangCode } from "@/lib/i18n/app";
import { formatNumber, localiseDigits } from "@/lib/i18n/digits";
import type { Envelope, EvidenceRecord } from "@/lib/contract/envelope";
import { ConnectivityStrip, Icon, Num, Screen, btnReset, sans } from "../primitives";

interface Props {
  envelope: Envelope | null; cachedNote: string | null;
  online: boolean; syncLabel: string; stale: boolean; stripLabel: string;
  lang: LangCode; langNative: string; t: (k: string) => string;
  asks: string[]; onAsk: (q: string) => void; onHoldStart: () => void; onHoldEnd: () => void; onType: () => void; onLanguage: () => void; onProfile: () => void; avatar: string | null;
  onOpenAnswer: () => void; map: React.ReactNode;
}

function firstNumber(evidence: EvidenceRecord[], needle: string): { n: number | null; unit: string } {
  const rec = evidence.find((e) => e.variable.toLowerCase().includes(needle));
  const n = rec ? Number(String(rec.value).trim().split(/\s/)[0]) : NaN;
  return { n: Number.isFinite(n) ? n : null, unit: rec?.unit ?? "" };
}

export function HomeScreen({ envelope, cachedNote, online, syncLabel, stale, stripLabel, lang, langNative, t, asks, onAsk, onHoldStart, onHoldEnd, onType, onLanguage, onProfile, avatar, onOpenAnswer, map }: Props) {
  const verdict = envelope ? verdictPresentation(envelope.answer?.verdict, envelope.risk?.band, lang) : null;
  const wave = envelope ? firstNumber(envelope.evidence, "wave") : null;
  const wind = envelope ? firstNumber(envelope.evidence, "wind") : null;
  const sst = envelope ? firstNumber(envelope.evidence, "temperature") : null;
  const place = envelope?.meta?.location?.name ?? null;

  return (
    <Screen>
      <div style={{ flex: "none", background: color.header, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, minHeight: 56 }}>
        <span style={{ ...sans(19, 700, 1, ".12em"), color: color.headerText }}>ORCA</span>
        <span style={{ ...sans(13, 400, 1.2), color: color.headerMuted, borderLeft: "1px solid rgba(255,255,255,.25)", paddingLeft: 12, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t("tagline")}</span>
        <button onClick={onLanguage} style={{ ...btnReset, minWidth: touch.min, minHeight: 44, borderRadius: 8, border: "1px solid rgba(255,255,255,.35)", background: "rgba(255,255,255,.10)", color: color.headerText, ...sans(14, 600, 1), padding: "0 12px" }}>{langNative}</button>
        <button onClick={onProfile} aria-label="profile" style={{ ...btnReset, width: 44, height: 44, borderRadius: "50%", border: "1px solid rgba(255,255,255,.35)", background: "rgba(255,255,255,.10)", color: color.headerText, ...sans(16, 700, 1), display: "flex", alignItems: "center", justifyContent: "center" }}>
          {avatar ?? <Icon name="help" size={20} color={color.headerText} />}
        </button>
      </div>
      <ConnectivityStrip online={online} stale={stale} label={stripLabel} right={syncLabel} />

      <div style={{ flex: "none", padding: "14px 14px 12px", background: color.card, borderBottom: `1px solid ${color.line}` }}>
        {envelope && verdict ? (
          <button onClick={onOpenAnswer} style={{ ...btnReset, width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 13, border: `1px solid ${color.cautionBorder}`, borderRadius: 20, background: color.cautionBg, padding: "12px 16px", boxShadow: "0 1px 2px rgba(18,48,58,.05)", minHeight: touch.min }}>
            <div style={{ width: 46, height: 46, flex: "none", borderRadius: 15, background: verdict.hex, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name={verdict.icon === "unknown" ? "help" : verdict.icon} size={26} color={color.headerText} stroke={2.2} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ ...sans(23, 700, 1.05, "-.01em"), color: verdict.hex, overflowWrap: "anywhere" }}>{verdict.word}</div>
              <div style={{ ...sans(14, 400, 1.3), color: color.cautionSoft, marginTop: 5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{place ?? t("loc")}</div>
              {cachedNote && <div style={{ ...sans(12, 500, 1.3), color: color.cautionLabel, marginTop: 4 }}>{cachedNote}</div>}
            </div>
            <Icon name="chevron" size={18} color={color.cautionLabel} />
          </button>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 13, border: `1px solid ${color.lineSoft}`, borderRadius: 20, background: color.cardMuted, padding: "14px 16px", minHeight: touch.min }}>
            <Icon name="help" size={28} color={color.inkGhost} />
            <div style={{ ...sans(16, 500, 1.3), color: color.inkMuted }}>{t("askOrTap")}</div>
          </div>
        )}
        {envelope && (
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "9px 6px 0", flexWrap: "wrap" }}>
            {[{ v: wave, l: t("waveL"), d: 1 }, { v: wind, l: t("windL"), d: 0 }, { v: sst, l: t("sstL"), d: 1 }].map(({ v, l, d }, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "baseline", gap: 6 }}>
                <Num size={17} weight={700} color={color.ink}>{formatNumber(v?.n ?? null, lang, d)}</Num>
                <Num size={11} weight={500} color={color.inkGhost}>{v?.unit ?? ""}</Num>
                <span style={{ ...sans(12, 400, 1), color: color.inkSoft }}>{l}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      <div style={{ flex: 1, position: "relative", minHeight: 200, background: color.mapTint }}>{map}</div>

      <div style={{ flex: "none", background: color.card, borderTop: `1px solid ${color.line}`, padding: "12px 14px 14px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
          {asks.slice(0, 2).map((q) => (
            <button key={q} onClick={() => onAsk(q)} style={{ ...btnReset, minHeight: touch.min, borderRadius: 999, border: `1px solid ${color.lineSoft}`, background: color.card, color: color.ink, ...sans(17, 500, 1.2), display: "flex", alignItems: "center", gap: 12, padding: "0 18px", textAlign: "left", width: "100%" }}>
              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q}</span>
              <Icon name="chevron" size={17} color={color.inkGhost} stroke={2.4} />
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {/* pointercancel is deliberately not a release: the WebView fires it ~500 ms into a
              long press, which would end the recording before a word is said. The recogniser
              finishes on its own at end of speech; the Listening screen's button also releases. */}
          <button onPointerDown={onHoldStart} onPointerUp={onHoldEnd} onContextMenu={(e) => e.preventDefault()}
            style={{ ...btnReset, flex: 1, minHeight: touch.voice, borderRadius: 18, background: color.sea, color: color.headerText, display: "flex", alignItems: "center", justifyContent: "center", gap: 12, touchAction: "none", userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none" } as React.CSSProperties}>
            <Icon name="mic" size={26} color={color.headerText} />
            <span style={{ ...sans(19, 700, 1) }}>{t("hold")}</span>
          </button>
          <button onClick={onType} style={{ ...btnReset, minWidth: touch.voice, minHeight: touch.voice, borderRadius: 18, border: `1px solid ${color.lineStrong}`, background: color.card, color: color.ink, ...sans(16, 600, 1), padding: "0 16px" }}>{t("type")}</button>
        </div>
      </div>
    </Screen>
  );
}
