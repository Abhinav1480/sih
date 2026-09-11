"use client";

/**
 * The conversation (P3-4): a persistent thread, the reader's turns and ORCA's
 * answers, scrollable, with a composer at the bottom -- text, send, and a
 * microphone that enters voice mode.
 *
 * A pending turn shows the checks; a failed turn shows the reason, Retry and
 * the offline offers named by their own question. No turn ever shows another
 * question's answer.
 */

import React, { useEffect, useRef, useState } from "react";
import { color, touch } from "@/lib/design/tokens";
import { CHECKS, type LangCode } from "@/lib/i18n/app";
import { localiseDigits } from "@/lib/i18n/digits";
import { formatAge } from "@/lib/offline/store";
import type { Envelope } from "@/lib/contract/envelope";
import type { OfflineOffer } from "@/lib/data/useAnalysis";
import type { Thread, Turn } from "@/lib/data/thread";
import { AnswerCard } from "../AnswerCard";
import { Icon, Num, Screen, btnReset, sans } from "../primitives";

type T = (k: string) => string;

interface Props {
  thread: Thread; lang: LangCode; t: T; asks: string[]; speakingTurnId: string | null;
  onSend: (q: string) => void; onVoice: () => void; onRetry: (turn: Turn) => void; onOffer: (offer: OfflineOffer) => void;
  onOpen: (env: Envelope) => void; onWhy: (env: Envelope) => void; onEvidence: (env: Envelope) => void; onListen: (env: Envelope, turnId: string) => void;
  onHistory: () => void; onNew: () => void;
}

function Pending({ t, lang, turn }: { t: T; lang: LangCode; turn: Turn }) {
  const rows = ((CHECKS as unknown as Record<string, string[][]>)[lang] ?? (CHECKS as unknown as Record<string, string[][]>).en) ?? [];
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => { const id = setInterval(() => setElapsed(Math.floor((Date.now() - new Date(turn.askedAt).getTime()) / 1000)), 250); return () => clearInterval(id); }, [turn.askedAt]);
  return (
    <div style={{ border: `1px solid ${color.lineSoft}`, borderRadius: 20, background: color.card, padding: "10px 14px", maxWidth: "94%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ ...sans(13, 600, 1), color: color.inkMuted }}>{t("checking")}</span>
        <Num size={12} weight={500} color={color.inkFaint} style={{ marginLeft: "auto" }}>{localiseDigits(String(elapsed), lang)}s</Num>
      </div>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0" }}>
          <i style={{ width: 9, height: 9, borderRadius: "50%", background: color.sea, animation: `orca-soft .9s ${i * 0.15}s infinite`, display: "block", flex: "none" }} />
          <span style={{ ...sans(15, 500, 1.2), color: color.ink }}>{r[0]}</span>
        </div>
      ))}
    </div>
  );
}

function Failed({ t, lang, turn, onRetry, onOffer }: { t: T; lang: LangCode; turn: Turn; onRetry: () => void; onOffer: (o: OfflineOffer) => void }) {
  const kind = turn.error?.kind ?? "network";
  const key = { timeout: "errorTimeout", network: "errorNetwork", http: "errorHttp", no_backend: "errorNoBackend", cached_mode: "errorCachedModeBody" }[kind];
  return (
    <div style={{ border: `1px solid ${color.dangerBorder}`, borderRadius: 20, background: color.dangerBg, padding: "12px 14px", maxWidth: "94%", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ ...sans(15, 600, 1.35), color: color.dangerText }}>{t("errorTitle")}</div>
      <div style={{ ...sans(14, 400, 1.45), color: color.dangerText }}>{t(key)}{turn.error?.detail ? <span className="num"> ({turn.error.detail})</span> : null}</div>
      {kind !== "cached_mode" && <button onClick={onRetry} style={{ ...btnReset, minHeight: 48, borderRadius: 12, background: color.sea, color: color.headerText, ...sans(15, 700, 1) }}>{t("retry")}</button>}
      {(turn.offers ?? []).length > 0 && <div style={{ ...sans(12, 600, 1, ".06em"), color: color.inkFaint, textTransform: "uppercase" }}>{t("offersTitle")}</div>}
      {(turn.offers ?? []).map((o) => (
        <button key={o.source} onClick={() => onOffer(o)} style={{ ...btnReset, textAlign: "left", border: `1px solid ${color.cautionBorder}`, background: color.cautionBg, borderRadius: 14, padding: "10px 12px", minHeight: touch.min, display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ ...sans(12, 600, 1), color: color.cautionText }}>{t(o.source === "cached" ? "offerSaved" : "offerExample")} · <span className="num">{localiseDigits(formatAge(o.savedAt, lang), lang)}</span></span>
          <span style={{ ...sans(15, 500, 1.3), color: color.ink, fontStyle: "italic" }}>&ldquo;{o.query}&rdquo;</span>
        </button>
      ))}
    </div>
  );
}

export function AskScreen({ thread, lang, t, asks, speakingTurnId, onSend, onVoice, onRetry, onOffer, onOpen, onWhy, onEvidence, onListen, onHistory, onNew }: Props) {
  const [text, setText] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => { const el = scroller.current; if (el) el.scrollTop = el.scrollHeight; }, [thread.turns.length, thread.turns[thread.turns.length - 1]?.state]);
  const send = () => { const q = text.trim(); if (!q) return; setText(""); onSend(q); };

  return (
    <Screen>
      <div style={{ flex: "none", background: color.header, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, minHeight: 56 }}>
        <span style={{ ...sans(18, 600, 1), color: color.headerText, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{thread.title || t("askTitle")}</span>
        <button onClick={onNew} aria-label={t("newThread")} style={{ ...btnReset, minWidth: 44, minHeight: 44, borderRadius: 10, border: "1px solid rgba(255,255,255,.35)", color: color.headerText, ...sans(20, 600, 1) }}>+</button>
        <button onClick={onHistory} aria-label={t("history")} style={{ ...btnReset, minWidth: 44, minHeight: 44, borderRadius: 10, border: "1px solid rgba(255,255,255,.35)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="clock" size={22} color={color.headerText} /></button>
      </div>

      <div ref={scroller} style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "14px 12px", display: "flex", flexDirection: "column", gap: 12 }}>
        {thread.turns.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
            <div style={{ ...sans(16, 500, 1.4), color: color.inkMuted, padding: "0 6px" }}>{t("askOrTap")}</div>
            {asks.map((q) => (
              <button key={q} onClick={() => onSend(q)} style={{ ...btnReset, minHeight: touch.min, borderRadius: 999, border: `1px solid ${color.lineSoft}`, background: color.card, color: color.ink, ...sans(17, 500, 1.2), display: "flex", alignItems: "center", gap: 12, padding: "0 18px", textAlign: "left", width: "100%", flex: "none" }}>
                <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q}</span>
                <Icon name="chevron" size={17} color={color.inkGhost} stroke={2.4} />
              </button>
            ))}
          </div>
        )}
        {thread.turns.map((turn) => (
          <React.Fragment key={turn.id}>
            <div style={{ alignSelf: "flex-end", maxWidth: "86%", background: color.seaTint, border: `1px solid ${color.seaTintBorder}`, borderRadius: "18px 18px 4px 18px", padding: "10px 14px", flex: "none" }}>
              <div style={{ ...sans(17, 500, 1.4), color: color.seaDark }}>{turn.query}</div>
              <Num size={11} weight={500} color={color.inkFaint} style={{ display: "block", marginTop: 4, textAlign: "right" }}>{localiseDigits(formatAge(turn.askedAt, lang), lang)}</Num>
            </div>
            <div style={{ alignSelf: "flex-start", width: "100%", display: "flex", flex: "none" }}>
              {turn.state === "checking" && <Pending t={t} lang={lang} turn={turn} />}
              {turn.state === "error" && <Failed t={t} lang={lang} turn={turn} onRetry={() => onRetry(turn)} onOffer={onOffer} />}
              {turn.state === "answer" && turn.envelope && (
                <AnswerCard envelope={turn.envelope} lang={lang} t={t} onOpen={() => onOpen(turn.envelope!)} onWhy={() => onWhy(turn.envelope!)} onEvidence={() => onEvidence(turn.envelope!)}
                  onListen={() => onListen(turn.envelope!, turn.id)} speaking={speakingTurnId === turn.id} />
              )}
            </div>
          </React.Fragment>
        ))}
      </div>

      <div style={{ flex: "none", display: "flex", gap: 8, padding: "10px 12px 12px", background: color.card, borderTop: `1px solid ${color.line}`, alignItems: "flex-end" }}>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={1} placeholder={t("typePlaceholder")} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          style={{ flex: 1, minHeight: touch.min, maxHeight: 120, borderRadius: 16, border: `1px solid ${color.lineStrong}`, padding: "14px 14px", ...sans(17, 500, 1.35), color: color.ink, background: color.card, resize: "none" }} />
        <button onClick={send} disabled={!text.trim()} aria-label={t("send")} style={{ ...btnReset, width: touch.min, height: touch.min, borderRadius: 16, border: `1px solid ${color.lineStrong}`, background: text.trim() ? color.sea : color.card, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="chevron" size={24} color={text.trim() ? color.headerText : color.inkGhost} stroke={2.6} />
        </button>
        <button onClick={onVoice} aria-label={t("hold")} style={{ ...btnReset, width: touch.voice, height: touch.voice, borderRadius: 20, background: color.sea, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(11,107,125,.28)" }}>
          <Icon name="mic" size={30} color={color.headerText} />
        </button>
      </div>
    </Screen>
  );
}
