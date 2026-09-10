"use client";

import React, { useState } from "react";
import { Phone, Save, X } from "lucide-react";
import { t } from "@/lib/i18n";
import type { OrcaAnalysisResponse } from "@/lib/types";
import { buildTripCard, type TripCard as TripCardData } from "@/lib/offline/tripCard";
import { formatAge, saveTripCard } from "@/lib/offline/store";
import { bandTone, verdictTone } from "@/components/ui/tone";

interface Props {
  card: TripCardData;
  lang: string;
  onClose?: () => void;
}

const TAP = { minHeight: 56 } as const;

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="border-t border-border-base pt-2xs">
    <h3 className="text-[11px] uppercase tracking-wider text-muted mb-3xs">{title}</h3>
    {children}
  </section>
);

const Reading: React.FC<{ label: string; value?: number; unit: string }> = ({ label, value, unit }) => (
  <div className="flex-1 min-w-[80px] bg-raised/60 rounded-md px-2xs py-2xs">
    <div className="text-[11px] text-muted">{label}</div>
    <div className="num text-lg text-text">
      {value === undefined || value === null ? "—" : value}
      <span className="text-xs text-muted ml-3xs">{unit}</span>
    </div>
  </div>
);

export const TripCard: React.FC<Props> = ({ card, lang, onClose }) => {
  const v = card.verdict ? verdictTone(card.verdict) : null;
  const b = card.band ? bandTone(card.band) : null;
  const sum = card.factors.reduce((s, f) => s + (f.points_added || 0), 0);
  const c = card.conditions;

  return (
    <article className="bg-panel border border-border-base rounded-lg p-xs text-text space-y-2xs">
      <header className="flex items-start gap-2xs">
        <div className="flex-1">
          <h2 className="font-display text-base">{t("offline.trip.title", lang)}</h2>
          {card.queryText && <p className="text-xs text-muted">{card.queryText}</p>}
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={t("offline.trip.close", lang)}
            className="flex items-center justify-center w-14 rounded-md hover:bg-raised"
            style={TAP}
          >
            <X size={20} />
          </button>
        )}
      </header>

      {/* Destination + time */}
      <div className="grid grid-cols-2 gap-2xs text-sm">
        <div>
          <div className="text-[11px] text-muted">{t("offline.trip.destination", lang)}</div>
          <div className="font-medium">{card.location?.name ?? "—"}</div>
          {card.location && (
            <div className="num text-xs text-muted">
              {card.location.latitude.toFixed(4)}°N, {card.location.longitude.toFixed(4)}°E
            </div>
          )}
        </div>
        <div>
          <div className="text-[11px] text-muted">{t("offline.trip.when", lang)}</div>
          <div className="font-medium">{card.temporal?.label ?? "—"}</div>
          {card.temporal?.start_time && (
            <div className="num text-xs text-muted">
              {new Date(card.temporal.start_time).toLocaleString()}
            </div>
          )}
        </div>
      </div>

      {/* Verdict: colour always paired with the word */}
      <div
        className="rounded-md px-xs py-2xs border"
        style={{ borderColor: v?.hex ?? b?.hex ?? undefined, background: `${v?.hex ?? b?.hex ?? "#000"}22` }}
      >
        <div className="text-[11px] text-muted">{t("offline.trip.verdict", lang)}</div>
        <div className="flex items-baseline gap-2xs flex-wrap">
          <span className="font-display text-2xl font-bold" style={{ color: v?.hex }}>
            {card.verdict ? t(`verdict.${card.verdict}`, lang) : t("offline.trip.noVerdict", lang)}
          </span>
          {b && (
            <span className="text-sm font-medium" style={{ color: b.hex }}>
              {b.word}
              {card.score !== undefined && (
                <>
                  {" · "}
                  <span className="num">{card.score}</span>/100
                </>
              )}
            </span>
          )}
        </div>
        {card.forecastNote && <p className="text-xs text-muted mt-3xs">{card.forecastNote}</p>}
      </div>

      <Section title={t("offline.trip.conditions", lang)}>
        <div className="flex gap-2xs flex-wrap">
          <Reading label={t("cond.wave", lang)} value={c.wave_m} unit="m" />
          <Reading label={t("cond.wind", lang)} value={c.wind_kt} unit="kt" />
          <Reading label={t("cond.swell", lang)} value={c.swell_m} unit="m" />
          {c.visibility_km !== undefined && (
            <Reading label={t("cond.visibility", lang)} value={c.visibility_km} unit="km" />
          )}
        </div>
      </Section>

      <Section title={t("offline.trip.boundaries", lang)}>
        {card.boundaries.length === 0 ? (
          <p className="text-xs text-muted">{t("offline.trip.noBoundaries", lang)}</p>
        ) : (
          <ul className="text-sm space-y-3xs">
            {card.boundaries.map((z, i) => (
              <li key={i} className="flex justify-between gap-2xs">
                <span>
                  {z.name}
                  {z.restriction && <span className="text-xs text-hazard ml-3xs">{z.restriction}</span>}
                </span>
                {z.distance_km !== undefined && <span className="num text-muted">{z.distance_km} km</span>}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={t("offline.trip.contacts", lang)}>
        <ul className="space-y-3xs">
          {card.emergencyContacts.map((ct) => {
            const label = ct.name.startsWith("offline.contact.") ? t(ct.name, lang) : ct.name;
            const inner = (
              <>
                <Phone size={18} className="shrink-0" />
                <span className="flex-1 text-sm">{label}</span>
                <span className="num text-base">{ct.number || t("offline.contact.seeBoard", lang)}</span>
              </>
            );
            return (
              <li key={ct.name}>
                {ct.number ? (
                  <a
                    href={`tel:${ct.number.replace(/[^\d+]/g, "")}`}
                    className="flex items-center gap-2xs px-xs rounded-md bg-raised hover:bg-raised/80 text-accent"
                    style={TAP}
                  >
                    {inner}
                  </a>
                ) : (
                  <div className="flex items-center gap-2xs px-xs rounded-md bg-raised/50 text-muted" style={TAP}>
                    {inner}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title={t("offline.trip.why", lang)}>
        {card.decisionExplanation && <p className="text-sm mb-2xs">{card.decisionExplanation}</p>}
        {card.factors.length === 0 ? (
          <p className="text-xs text-muted">{t("offline.trip.noFactors", lang)}</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {card.factors.map((f, i) => (
                <tr key={i} className="border-t border-border-subtle">
                  <td className="py-3xs pr-2xs">{f.name}</td>
                  <td className="py-3xs num text-muted text-right whitespace-nowrap">{f.value}</td>
                  <td className="py-3xs num text-right w-12">+{f.points_added}</td>
                </tr>
              ))}
              <tr className="border-t border-border-strong font-medium">
                <td className="py-3xs" colSpan={2}>
                  {t("offline.trip.sum", lang)} = {t("offline.trip.score", lang)}
                </td>
                <td className="py-3xs num text-right">
                  {sum}
                  {card.score !== undefined && card.score !== sum && (
                    <span className="text-muted"> ≠ {card.score}</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </Section>

      <footer className="border-t border-border-base pt-2xs text-xs text-muted space-y-3xs">
        <div>
          {t("offline.trip.source", lang)}:{" "}
          {card.provider || card.provider_tier ? (
            <span className="text-text">
              {card.provider ?? "—"}
              {card.provider_tier && <span className="num"> [{card.provider_tier}]</span>}
            </span>
          ) : (
            t("offline.trip.sourceUnavailable", lang)
          )}
        </div>
        {card.degraded && <div className="text-caution">{t("offline.trip.degraded", lang)}</div>}
        <div>
          {t("offline.trip.savedAt", lang)}:{" "}
          <span className="num">{new Date(card.savedAt).toLocaleString()}</span> ·{" "}
          <span className="num">{formatAge(card.savedAt, lang)}</span>
        </div>
      </footer>
    </article>
  );
};

interface SaveProps {
  analysis: OrcaAnalysisResponse;
  lang: string;
  onSaved?: (card: TripCardData) => void;
}

/** One 56px button: build the card from the analysis, persist it, confirm. */
export const SaveTripCardButton: React.FC<SaveProps> = ({ analysis, lang, onSaved }) => {
  const [saved, setSaved] = useState(false);
  const onClick = async () => {
    const card = buildTripCard(analysis);
    await saveTripCard(card);
    setSaved(true);
    onSaved?.(card);
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center justify-center gap-2xs rounded-md font-medium border ${
        saved ? "border-calm text-calm bg-calm/10" : "border-accent text-accent bg-accent/10 hover:bg-accent/20"
      }`}
      style={TAP}
      aria-live="polite"
    >
      <Save size={20} />
      {saved ? t("offline.trip.saved", lang) : t("offline.trip.save", lang)}
    </button>
  );
};
