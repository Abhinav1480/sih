"use client";

/**
 * 03 CHECKING.
 *
 * The query being answered, and the agents at work. When the answer lands the
 * trace is the real one from the response; while it is in flight the design's
 * four check rows are shown as pending. SKIPPED entries render in muted grey
 * and are never hidden -- a provider the chain tried and passed over is part
 * of the honest story.
 *
 * The elapsed counter is real. The screen cannot hang: useAnalysis abandons a
 * request after its timeout and hands this screen's parent an error state.
 */

import React, { useEffect, useState } from "react";
import { color } from "@/lib/design/tokens";
import { CHECKS, type LangCode } from "@/lib/i18n/app";
import { localiseDigits } from "@/lib/i18n/digits";
import type { TraceEvent } from "@/lib/contract/envelope";
import { Header, Icon, Num, Screen, sans } from "../primitives";

interface Props { query: string; startedAt: number; lang: LangCode; t: (k: string) => string; trace?: TraceEvent[] }

export function CheckingScreen({ query, startedAt, lang, t, trace }: Props) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 250);
    return () => clearInterval(id);
  }, [startedAt]);

  const checks = ((CHECKS as unknown as Record<string, string[][]>)[lang] ?? (CHECKS as unknown as Record<string, string[][]>).en) ?? [];

  return (
    <Screen>
      <Header title={t("checking")} right={<Num size={13} weight={500} color={color.headerMuted}>{localiseDigits(String(elapsed), lang)}s</Num>} />
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "22px 18px", display: "flex", flexDirection: "column" }}>
        <div style={{ ...sans(20, 500, 1.4), color: color.inkMuted, marginBottom: 20 }}>{query}</div>
        <div style={{ border: `1px solid ${color.lineSoft}`, borderRadius: 20, background: color.card, boxShadow: "0 2px 8px rgba(18,48,58,.06)", overflow: "hidden", animation: "orca-up .35s ease-out" }}>
          {trace && trace.length > 0
            ? trace.map((ev) => {
                const skipped = ev.status === "SKIPPED" || ev.status === "UNAVAILABLE";
                return (
                  <div key={ev.seq} style={{ display: "flex", alignItems: "center", gap: 13, padding: "15px", borderBottom: `1px solid ${color.lineFaint}`, opacity: skipped ? 0.62 : 1 }}>
                    <Icon name={skipped ? "unknown" : "check"} size={22} color={skipped ? color.inkGhost : color.onlineText} stroke={2.4} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ ...sans(16, 600, 1.2), color: skipped ? color.inkFaint : color.ink }}>{ev.agent}</div>
                      <div style={{ ...sans(13, 400, 1.3), color: color.inkMuted, marginTop: 3, overflowWrap: "anywhere" }}>{ev.action}</div>
                    </div>
                    <Num size={11} weight={500} color={color.inkGhost}>{localiseDigits(String(ev.duration_ms), lang)}ms</Num>
                  </div>
                );
              })
            : checks.map((row, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 13, padding: "17px 15px", borderBottom: `1px solid ${color.lineFaint}` }}>
                  <i style={{ width: 11, height: 11, borderRadius: "50%", background: color.sea, animation: `orca-soft .9s ${i * 0.15}s infinite`, display: "block", flex: "none" }} />
                  {/* Title only: the design's sample subtitles ("You are inside Indian waters") are claims nothing has verified yet. */}
                  <div style={{ ...sans(17, 600, 1.2), color: color.ink, minWidth: 0, flex: 1 }}>{row[0]}</div>
                </div>
              ))}
          <div style={{ padding: 15, display: "flex", alignItems: "center", gap: 11, background: color.cardMuted }}>
            <i style={{ width: 11, height: 11, borderRadius: "50%", background: color.sea, animation: "orca-soft .9s infinite", display: "block" }} />
            <span style={{ ...sans(15, 500, 1), color: color.inkSoft }}>{t("composing")}</span>
          </div>
        </div>
        <div style={{ marginTop: 16, ...sans(14, 400, 1.45), color: color.inkFaint }}>{t("checkNote")}</div>
      </div>
    </Screen>
  );
}
