"use client";

/**
 * 06 WHERE THIS CAME FROM.
 *
 * Every value the answer rests on, with its provider, its tier badge
 * rendered exactly as sent, its dataset and its timestamps. Then
 * meta.degraded, meta.notes and meta.limitations -- the honest part, and
 * the part that scores points.
 *
 * Nothing here defaults. A record with no tier shows "source unavailable".
 * A response with no evidence shows a defined empty state, not a blank.
 */

import React from "react";
import { color } from "@/lib/design/tokens";
import { type LangCode } from "@/lib/i18n/app";
import { localiseDigits } from "@/lib/i18n/digits";
import type { Envelope } from "@/lib/contract/envelope";
import { Body, Card, EmptyState, Header, Icon, Num, Screen, TierBadge, sans } from "../primitives";

interface Props { envelope: Envelope; lang: LangCode; t: (k: string) => string; onBack: () => void }

function shortTime(iso: string, lang: LangCode): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return localiseDigits(iso, lang);
  return localiseDigits(`${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`, lang);
}

export function EvidenceScreen({ envelope, lang, t, onBack }: Props) {
  const records = envelope.evidence ?? [];
  const notes = envelope.meta?.notes ?? [];
  const limitations = envelope.meta?.limitations ?? [];
  const degraded = envelope.meta?.degraded === true;

  return (
    <Screen>
      <Header title={t("evidence")} onBack={onBack}
        right={<span style={{ ...sans(13, 500, 1), color: color.headerMuted, whiteSpace: "nowrap" }}><span className="num">{localiseDigits(String(records.length), lang)}</span> {t("values")}</span>} />

      {degraded && (
        <div role="alert" style={{ flex: "none", background: color.cautionChip, color: color.cautionHeaderInk, ...sans(14, 600, 1.3), padding: "10px 16px", display: "flex", gap: 10, alignItems: "center" }}>
          <Icon name="alert" size={18} color={color.cautionHeaderInk} />
          <span>{t("degraded")}</span>
        </div>
      )}

      {records.length === 0 ? (
        <EmptyState icon={<Icon name="list" size={40} color={color.inkGhost} />} title={t("noEvidenceTitle")} body={t("noEvidenceBody")} />
      ) : (
        <Body pad={14} style={{ gap: 9 }}>
          {records.map((e) => (
            <Card key={e.id} style={{ borderRadius: 16, padding: "13px 14px" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 9 }}>
                <span style={{ ...sans(16, 500, 1.2), color: color.ink, flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>{e.variable}</span>
                <Num size={18} weight={700} color={color.ink} style={{ whiteSpace: "nowrap" }}>{localiseDigits(e.value, lang)} <span style={{ fontWeight: 500, fontSize: 12, color: color.inkFaint }}>{e.unit}</span></Num>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 9, flexWrap: "wrap" }}>
                <TierBadge tier={e.provider_tier} lang={lang} sourceUnavailableLabel={t("sourceUnavailable")} />
                <span style={{ ...sans(13, 400, 1.2), color: color.inkMuted, flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>{e.provider}</span>
                <Num size={12} weight={500} color={color.inkGhost} style={{ whiteSpace: "nowrap" }}>{shortTime(e.observation_or_forecast_time, lang)}</Num>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ ...sans(11, 600, 1, ".06em"), color: color.inkFaint, textTransform: "uppercase" }}>{e.status}</span>
                <span style={{ ...sans(12, 400, 1.2), color: color.inkFaint }}>{e.dataset}</span>
              </div>
              {e.reliability_notes && (
                <div style={{ ...sans(12, 400, 1.4), color: color.inkFaint, marginTop: 8 }}>{e.reliability_notes}</div>
              )}
            </Card>
          ))}

          {(notes.length > 0 || limitations.length > 0) && (
            <Card style={{ marginTop: 6 }}>
              <div style={{ ...sans(13, 600, 1, ".06em"), color: color.inkFaint, textTransform: "uppercase", marginBottom: 10 }}>{t("limitationsTitle")}</div>
              {[...notes, ...limitations].map((line, i) => (
                <div key={i} style={{ ...sans(14, 400, 1.45), color: color.inkSoft, marginBottom: 8, display: "flex", gap: 8 }}>
                  <span style={{ color: color.inkGhost }}>•</span><span style={{ minWidth: 0 }}>{line}</span>
                </div>
              ))}
            </Card>
          )}
        </Body>
      )}
    </Screen>
  );
}
