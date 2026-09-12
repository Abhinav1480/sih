"use client";

/**
 * A geofence warning is a full-width persistent interrupt. It stays until
 * acknowledged, and the acknowledgement is remembered for this tab only, per
 * response and card, so a new warning interrupts again.
 */
import { useState } from "react";
import { useFmt, useT } from "@/lib/i18n";
import type { Envelope, GeofenceWarningCard } from "@/lib/types";
import { SeverityChip, Unavailable, Mono } from "@/components/ui";
import { IconStop } from "@/components/ui/Icons";

const KEY = "orca.geofence.ack";

function ackSet(): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

export function GeofenceInterrupt({ envelope }: { envelope: Envelope | null }) {
  const t = useT();
  const f = useFmt();
  // Never rendered with an envelope on the server, so the lazy read cannot mismatch.
  const [acked, setAcked] = useState<Set<string>>(() => ackSet());
  if (!envelope) return null;
  const warnings = envelope.cards.filter((c): c is GeofenceWarningCard => c.type === "geofence_warning");
  const pending = warnings.filter((w) => !acked.has(`${envelope.request_id}:${w.id}`));
  if (pending.length === 0) return null;
  const ack = (w: GeofenceWarningCard) => {
    const next = new Set(acked);
    next.add(`${envelope.request_id}:${w.id}`);
    setAcked(next);
    try {
      sessionStorage.setItem(KEY, JSON.stringify([...next]));
    } catch {
      /* the banner still clears for this render */
    }
  };
  return (
    <div className="space-y-2" role="alertdialog" aria-live="assertive">
      {pending.map((w) => (
        <div key={w.id} className="risk-SEVERE flex flex-wrap items-start gap-4 rounded-[var(--radius)] border-2 p-4" style={{ borderColor: "currentColor" }}>
          <IconStop size={36} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-bold">{t("card.geofence.title")}</span>
              <SeverityChip severity={w.severity} />
            </div>
            <div className="mt-1 text-lg">{f.raw(w.zone_name)}</div>
            <p className="mt-1 text-sm text-text">{f.raw(w.detail)}</p>
            <p className="mt-1 text-sm text-text-2">
              {t("card.geofence.authority")}: {w.authority ? w.authority : <Unavailable />} · {t("card.geofence.restriction")}: {w.restriction_level ? w.restriction_level : <Unavailable />}
              {" · "}{t("card.zone.distance")}: {w.distance_km === null ? <Unavailable /> : <Mono>{f.num(w.distance_km)} {t("unit.km")}</Mono>}
              {" · "}{t("card.zone.bearing")}: {w.bearing_deg === null ? <Unavailable /> : <Mono>{f.num(w.bearing_deg, 0)}°</Mono>}
            </p>
            <p className="mt-1 text-xs text-text-2">{t("card.geofence.persist")}</p>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => ack(w)}>{t("card.geofence.ack")}</button>
        </div>
      ))}
    </div>
  );
}
