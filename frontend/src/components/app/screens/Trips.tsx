"use client";

/**
 * 15 MY TRIPS.
 *
 * Every answer the fisherman saved for a trip, newest first: the date, the
 * verdict word via the keyed lookup, the wave and wind the answer carried.
 * The design shows "hours out" and "catch noted"; the app records neither,
 * so those columns are not drawn. See deviations #11.
 */

import React, { useState } from "react";
import { color, touch } from "@/lib/design/tokens";
import { verdictPresentation } from "@/lib/design/verdict";
import { type LangCode } from "@/lib/i18n/app";
import { formatNumber, localiseDigits } from "@/lib/i18n/digits";
import type { TripCard } from "@/lib/offline/tripCard";
import { BigButton, Body, EmptyState, Icon, Num, Screen, btnReset, sans } from "../primitives";

interface Props { trips: TripCard[] | null; canAdd: boolean; lang: LangCode; t: (k: string) => string; onAdd: () => void }

const day = (iso: string, lang: LangCode) => { const d = new Date(iso); return localiseDigits(`${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`, lang); };

export function TripsScreen({ trips, canAdd, lang, t, onAdd }: Props) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  return (
    <Screen>
      <div style={{ flex: "none", background: color.header, padding: "13px 16px", display: "flex", alignItems: "center", gap: 12, minHeight: 56 }}>
        <span style={{ ...sans(18, 600, 1), color: color.headerText }}>{t("trips")}</span>
        <span style={{ marginLeft: "auto", ...sans(13, 500, 1), color: color.headerMuted }}>{trips ? `${localiseDigits(String(trips.length), lang)}` : ""}</span>
      </div>
      {trips === null ? (
        <EmptyState title="…" />
      ) : trips.length === 0 ? (
        <EmptyState icon={<Icon name="list" size={40} color={color.inkGhost} />} title={t("tripsEmpty")} body={t("tripsEmptyBody")}
          action={canAdd ? <BigButton variant="sea" onClick={onAdd} icon={<Icon name="save" size={22} color={color.headerText} />}>{t("addTrip")}</BigButton> : undefined} />
      ) : (
        <Body pad={14} style={{ gap: 9 }}>
          <div style={{ ...sans(13, 400, 1.3), color: color.inkMuted, marginBottom: 2 }}>{t("tripsHint")}</div>
          {trips.map((tr, i) => {
            const v = verdictPresentation(tr.verdict, tr.band, lang);
            const open = openIdx === i;
            return (
              <button key={tr.savedAt + i} onClick={() => setOpenIdx(open ? null : i)} style={{ ...btnReset, border: `1px solid ${color.lineSoft}`, borderRadius: 18, background: color.card, boxShadow: "0 1px 2px rgba(18,48,58,.05)", padding: "13px 14px", textAlign: "left", width: "100%", minHeight: touch.min }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Num size={17} weight={700} color={color.ink}>{day(tr.savedAt, lang)}</Num>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ ...sans(16, 700, 1.1), color: v?.hex ?? color.inkMuted }}>{v?.word ?? t("offline.trip.noVerdict")}</div>
                    <div style={{ ...sans(13, 400, 1.3), color: color.inkMuted, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tr.location?.name ?? tr.queryText}</div>
                  </div>
                  <div style={{ textAlign: "right", flex: "none" }}>
                    <Num size={16} weight={700} color={color.ink}>{formatNumber(tr.conditions.wave_m ?? null, lang, 1)}</Num> <Num size={11} weight={500} color={color.inkGhost}>m</Num>
                    <div><Num size={13} weight={500} color={color.inkSoft}>{formatNumber(tr.conditions.wind_kt ?? null, lang, 0)}</Num> <Num size={11} weight={500} color={color.inkGhost}>kt</Num></div>
                  </div>
                </div>
                {open && (
                  <div style={{ marginTop: 12, borderTop: `1px solid ${color.lineFaint}`, paddingTop: 10, ...sans(14, 400, 1.45), color: color.inkSoft }}>
                    <div style={{ marginBottom: 6 }}>{tr.queryText}</div>
                    {tr.temporal?.label && <div style={{ color: color.inkFaint }}>{tr.temporal.label}</div>}
                    {tr.decisionExplanation && <div style={{ marginTop: 6 }}>{tr.decisionExplanation}</div>}
                    {tr.score != null && <div style={{ marginTop: 6 }}><Num size={14} weight={700} color={color.ink}>{formatNumber(tr.score, lang, 0)}</Num> <Num size={11} weight={500} color={color.inkGhost}>/{localiseDigits("100", lang)}</Num></div>}
                  </div>
                )}
              </button>
            );
          })}
          {canAdd && <BigButton variant="sea" onClick={onAdd} icon={<Icon name="save" size={22} color={color.headerText} />} style={{ marginTop: 6 }}>{t("addTrip")}</BigButton>}
        </Body>
      )}
    </Screen>
  );
}
