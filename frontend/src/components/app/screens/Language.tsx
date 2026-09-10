"use client";

/**
 * 10 LANGUAGE.
 *
 * Every language in its own script, never an English name. A language with no
 * device voice says so on the row and again in the note below; it is still
 * selectable, and answers render in large text instead of being spoken in
 * English.
 */

import React from "react";
import { color, touch } from "@/lib/design/tokens";
import { LANGS, type LangCode } from "@/lib/i18n/app";
import { Body, Header, Icon, Screen, sans } from "../primitives";

interface Props {
  lang: LangCode; t: (k: string) => string; onPick: (l: LangCode) => void; onBack: () => void;
  /** Languages the device actually has a TTS voice for, from getSupportedLanguages(). Null until known. */
  deviceVoices: Set<string> | null;
}

export function LanguageScreen({ lang, t, onPick, onBack, deviceVoices }: Props) {
  return (
    <Screen>
      <Header title={t("language")} onBack={onBack} />
      <Body pad={14} style={{ gap: 9 }}>
        {LANGS.map((l) => {
          const active = l.code === lang;
          const designSaysVoice = l.voice;
          const deviceHasVoice = deviceVoices ? Array.from(deviceVoices).some((v) => v.toLowerCase().startsWith(l.code)) : null;
          const voiceOk = designSaysVoice && deviceHasVoice !== false;
          return (
            <button key={l.code} onClick={() => onPick(l.code as LangCode)} aria-pressed={active}
              style={{ minHeight: touch.min + 8, borderRadius: 16, border: `${active ? 2 : 1}px solid ${active ? color.sea : color.lineStrong}`, background: active ? color.seaTint : color.card, display: "flex", alignItems: "center", gap: 14, padding: "0 16px", cursor: "pointer", width: "100%", textAlign: "left" }}>
              <span style={{ ...sans(22, 600, 1.2), color: color.ink, flex: 1, minWidth: 0 }}>{l.native}</span>
              <span style={{ ...sans(12, 500, 1, ".04em"), color: voiceOk ? color.onlineText : color.inkFaint, display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Icon name="speaker" size={16} color={voiceOk ? color.onlineText : color.inkGhost} />
                {voiceOk ? t("voiceYes") : t("voiceNo")}
              </span>
              {active && <Icon name="check" size={22} color={color.sea} stroke={2.6} />}
            </button>
          );
        })}
        <div style={{ ...sans(14, 400, 1.45), color: color.inkMuted, marginTop: 6, padding: "0 4px" }}>{t("voiceNote")}</div>
      </Body>
    </Screen>
  );
}
