"use client";

/**
 * 02 LISTENING.
 *
 * A live waveform, and the words forming in the reader's own script as they
 * are spoken. Partial results are large subtitles. The bottom control is the
 * hold-to-speak bar; releasing it ends the utterance.
 */

import React, { useEffect, useState } from "react";
import { color } from "@/lib/design/tokens";
import { type LangCode } from "@/lib/i18n/app";
import { localiseDigits } from "@/lib/i18n/digits";
import { Icon, Num, Screen, sans } from "../primitives";

interface Props {
  lang: LangCode; t: (k: string) => string;
  partial: string; level: number; startedAt: number;
  onRelease: () => void;
  /** The recogniser wants microphone permission: `message` explains why, `onAllow` asks the OS. */
  requesting: boolean; message: string; onAllow: () => void; onCancel: () => void;
}

const BARS = 24;

export function ListeningScreen({ lang, t, partial, level, startedAt, onRelease, requesting, message, onAllow, onCancel }: Props) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 250);
    return () => clearInterval(id);
  }, [startedAt]);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0"), ss = String(elapsed % 60).padStart(2, "0");

  return (
    <Screen>
      <div style={{ flex: "none", background: color.header, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, minHeight: 56 }}>
        <i style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff6b6b", animation: "orca-soft 1.1s infinite", display: "block" }} />
        <span style={{ ...sans(15, 600, 1), color: color.headerText }}>{t("listening")}</span>
        <Num size={13} weight={500} color={color.headerMuted} style={{ marginLeft: "auto" }}>{localiseDigits(`${mm}:${ss}`, lang)}</Num>
      </div>
      {requesting ? (
        <div style={{ flex: 1, minHeight: 0, padding: "26px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          <Icon name="mic" size={44} color={color.sea} />
          <div style={{ ...sans(24, 600, 1.4), color: color.ink, textWrap: "pretty" as never }}>{message}</div>
          <button onClick={onAllow} style={{ border: "none", cursor: "pointer", width: "100%", minHeight: 64, borderRadius: 16, background: color.sea, color: color.headerText, ...sans(19, 700, 1), marginTop: "auto" }}>{t("micAllow")}</button>
          <button onClick={onCancel} style={{ border: `1px solid ${color.lineStrong}`, cursor: "pointer", width: "100%", minHeight: 56, borderRadius: 16, background: color.card, color: color.ink, ...sans(17, 600, 1) }}>{t("cancel")}</button>
        </div>
      ) : (
      <div style={{ flex: 1, minHeight: 0, padding: "26px 20px", display: "flex", flexDirection: "column" }}>
        <div style={{ ...sans(13, 500, 1), color: color.inkFaint, marginBottom: 14 }}>{t("youSaid")}</div>
        <div aria-live="polite" style={{ ...sans(32, 600, 1.35), color: color.ink, textWrap: "pretty" as never, overflowWrap: "anywhere" }}>
          {partial}<span style={{ color: color.sea, animation: "orca-soft 1s infinite" }}>|</span>
        </div>
        <div style={{ marginTop: "auto", border: `1px solid ${color.lineSoft}`, borderRadius: 20, background: color.card, boxShadow: "0 2px 8px rgba(18,48,58,.06)", padding: 16 }}>
          <div style={{ height: 72, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
            {Array.from({ length: BARS }, (_, i) => {
              const seed = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
              const scale = 0.22 + Math.max(0, Math.min(1, level)) * (0.5 + seed * 0.5);
              return <i key={i} style={{ display: "block", width: 6, height: 56, borderRadius: 3, background: color.sea, transformOrigin: "center", transform: `scaleY(${scale.toFixed(2)})`, transition: "transform 90ms linear" }} />;
            })}
          </div>
          <div style={{ textAlign: "center", ...sans(14, 500, 1.3), color: color.inkMuted, marginTop: 10 }}>{t("keepHolding")}</div>
        </div>
      </div>
      )}
      {!requesting && <div style={{ flex: "none", padding: "0 20px 24px" }}>
        <button onPointerUp={onRelease} onPointerCancel={onRelease} onClick={onRelease}
          style={{ border: "none", cursor: "pointer", width: "100%", minHeight: 88, borderRadius: 18, background: color.sea, display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <Icon name="mic" size={26} color={color.headerText} />
          <span style={{ ...sans(20, 700, 1), color: color.headerText }}>{t("holding")}</span>
        </button>
      </div>}
    </Screen>
  );
}
