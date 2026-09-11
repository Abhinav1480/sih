"use client";

/** Conversation history (P3-4): every thread on the phone, newest first; tap to reopen. */

import React from "react";
import { color, touch } from "@/lib/design/tokens";
import { type LangCode } from "@/lib/i18n/app";
import { localiseDigits } from "@/lib/i18n/digits";
import { formatAge } from "@/lib/offline/store";
import type { Thread } from "@/lib/data/thread";
import { Body, EmptyState, Header, Icon, Num, Screen, btnReset, sans } from "../primitives";

type T = (k: string) => string;

export function HistoryScreen({ threads, currentId, lang, t, onOpen, onDelete, onBack }: {
  threads: Thread[] | null; currentId: string; lang: LangCode; t: T; onOpen: (th: Thread) => void; onDelete: (id: string) => void; onBack: () => void;
}) {
  return (
    <Screen>
      <Header title={t("history")} onBack={onBack} />
      {threads === null ? (
        <EmptyState title="…" />
      ) : threads.length === 0 ? (
        <EmptyState icon={<Icon name="clock" size={40} color={color.inkGhost} />} title={t("historyEmpty")} body={t("historyEmptyBody")} />
      ) : (
        <Body pad={14} style={{ gap: 9 }}>
          {threads.map((th) => (
            <div key={th.id} style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
              <button onClick={() => onOpen(th)} style={{ ...btnReset, flex: 1, minHeight: touch.min, textAlign: "left", border: `${th.id === currentId ? 2 : 1}px solid ${th.id === currentId ? color.sea : color.lineSoft}`, borderRadius: 16, background: color.card, padding: "12px 14px" }}>
                <div style={{ ...sans(16, 600, 1.3), color: color.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{th.title}</div>
                <div style={{ display: "flex", gap: 10, marginTop: 5 }}>
                  <Num size={12} weight={500} color={color.inkFaint}>{localiseDigits(String(th.turns.length), lang)} {t("turns")}</Num>
                  <Num size={12} weight={500} color={color.inkFaint}>{localiseDigits(formatAge(th.updatedAt, lang), lang)}</Num>
                </div>
              </button>
              <button onClick={() => onDelete(th.id)} aria-label={t("deleteThread")} style={{ ...btnReset, width: 48, borderRadius: 14, border: `1px solid ${color.lineSoft}`, color: color.inkFaint, ...sans(18, 600, 1) }}>✕</button>
            </div>
          ))}
        </Body>
      )}
    </Screen>
  );
}
