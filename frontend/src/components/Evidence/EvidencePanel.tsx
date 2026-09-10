"use client";

import React, { useEffect, useRef } from "react";
import { X, MapPin, ExternalLink, ArrowLeft, Sigma, ShieldCheck, Info } from "lucide-react";
import { EvidenceRecord } from "@/lib/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { NUM, bandTone } from "@/components/ui/tone";
import { useEvidence } from "./evidenceContext";
import {
  FIELD_MISSING,
  SOURCE_UNAVAILABLE,
  extendedField,
} from "./evidenceUtils";

/** A labelled metadata row. Values are monospace for technical provenance. */
const MetaRow: React.FC<{
  label: string;
  value?: string;
  mono?: boolean;
  muted?: boolean;
  children?: React.ReactNode;
}> = ({ label, value, mono = false, muted = false, children }) => (
  <div className="py-2 border-b border-orca-border/40 last:border-0">
    <div className="text-[10px] font-semibold uppercase tracking-wider text-orca-dim mb-0.5">
      {label}
    </div>
    {children ?? (
      <div
        className={`text-[12.5px] leading-snug break-words ${
          mono ? NUM : ""
        } ${muted ? "text-orca-muted italic" : "text-slate-200"}`}
      >
        {value}
      </div>
    )}
  </div>
);

/**
 * provider_tier rendered EXACTLY as sent. ISRO: accent outline. NATIONAL: muted
 * badge. FALLBACK: plain muted text. Missing: "source unavailable". Never a
 * default, never an upgrade.
 */
export const TierBadge: React.FC<{ tier?: string; className?: string }> = ({ tier, className = "" }) => {
  const t = (tier || "").trim();
  const base = `inline-flex items-center px-1.5 py-px rounded text-[10px] ${NUM} tracking-wider ${className}`;
  if (!t) return <span className={`${base} text-[#7a94a3] italic`}>source unavailable</span>;
  // Render `t`, never a matching literal. The badge text is the tier the
  // response actually carried; the comparison only picks the styling.
  if (t === "ISRO") {
    return <span className={`${base} border border-[#38e8d0] text-[#38e8d0] font-semibold`}>{t}</span>;
  }
  if (t === "NATIONAL") {
    return <span className={`${base} border border-[#7a94a3]/60 text-[#7a94a3]`}>{t}</span>;
  }
  // FALLBACK or any other literal value: plain muted text, verbatim.
  return <span className={`${base} text-[#7a94a3]`}>{t}</span>;
};

/** Full provenance detail for a single evidence record. */
const RecordDetail: React.FC<{ rec: EvidenceRecord }> = ({ rec }) => {
  const { viewOnMap, canViewOnMap } = useEvidence();

  const provider = rec.provider?.trim();
  const dataset = rec.dataset?.trim();
  const coordinates = rec.coordinates?.trim();
  const location = rec.location?.trim();
  const observed = rec.observation_or_forecast_time?.trim();
  const retrieved = rec.retrieval_time?.trim();
  const reliability = rec.reliability_notes?.trim();
  const providerTier = extendedField(rec, "provider_tier");
  const sourceUrl = extendedField(rec, "source_url");

  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-orca-cyan/80 mb-1">
        Evidence record <span className={NUM}>{rec.id}</span>
      </div>
      <h3 className="font-display font-bold text-[17px] text-white leading-tight">
        {rec.variable || "Measurement"}
      </h3>
      <div className={`mt-1.5 flex items-end gap-2 ${NUM}`}>
        <span className="text-[28px] font-bold text-white leading-none">{rec.value}</span>
        {rec.unit && <span className="text-sm text-orca-muted mb-0.5">{rec.unit}</span>}
      </div>
      <div className="mt-2.5 flex items-center gap-2">
        <StatusBadge status={rec.status} size="md" />
        <TierBadge tier={providerTier} />
      </div>

      <div className="mt-3">
        <MetaRow label="Provider" value={provider || SOURCE_UNAVAILABLE} muted={!provider} />
        <MetaRow label="Provider tier">
          <TierBadge tier={providerTier} />
        </MetaRow>
        <MetaRow label="Dataset" value={dataset || FIELD_MISSING} muted={!dataset} />
        <MetaRow label="Variable" value={rec.variable || FIELD_MISSING} muted={!rec.variable} />
        <MetaRow label="Location" value={location || FIELD_MISSING} muted={!location} />

        <MetaRow label="Coordinates">
          {coordinates ? (
            <div className="flex items-center justify-between gap-2">
              <span className={`text-[12.5px] ${NUM} text-slate-200 break-words`}>{coordinates}</span>
              {canViewOnMap(rec) && (
                <button
                  type="button"
                  onClick={() => viewOnMap(rec)}
                  className="inline-flex items-center gap-1 text-[10.5px] font-medium text-orca-cyan hover:text-white rounded-md px-1.5 py-0.5 border border-orca-cyan/30 hover:bg-orca-cyan/10 transition flex-shrink-0 focus:outline-none focus-visible:ring-1 focus-visible:ring-orca-cyan/60"
                >
                  <MapPin className="w-3 h-3" />
                  View on map
                </button>
              )}
            </div>
          ) : (
            <span className="text-[12.5px] text-orca-muted italic">{FIELD_MISSING}</span>
          )}
        </MetaRow>

        <MetaRow label="Observation / forecast time" value={observed || FIELD_MISSING} mono muted={!observed} />
        <MetaRow label="Retrieval time" value={retrieved || FIELD_MISSING} mono muted={!retrieved} />
        <MetaRow label="Status">
          <StatusBadge status={rec.status} size="sm" />
        </MetaRow>
        <MetaRow label="Reliability notes" value={reliability || FIELD_MISSING} muted={!reliability} />

        {sourceUrl && (
          <MetaRow label="Source link">
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[12.5px] text-orca-cyan hover:text-white break-all"
            >
              View source <ExternalLink className="w-3 h-3 flex-shrink-0" />
            </a>
          </MetaRow>
        )}
      </div>
    </div>
  );
};

/** Consolidated list of every source for the current result (or a card's subset). */
const RegistryList: React.FC = () => {
  const { records, focusRecord, filterIds, backToRegistry } = useEvidence();
  const shown = filterIds ? records.filter((r) => filterIds.includes(r.id)) : records;

  if (records.length === 0) {
    return (
      <div className="text-[12.5px] text-orca-muted italic py-6 text-center">
        No evidence records were provided for this result.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className={`text-[11px] text-orca-muted ${NUM}`}>
        {filterIds ? (
          <>
            {shown.length} of {records.length} records back this card.{" "}
            <button type="button" onClick={backToRegistry} className="text-orca-cyan hover:text-white underline underline-offset-2">
              show all
            </button>
          </>
        ) : (
          <>{records.length} {records.length === 1 ? "source" : "sources"} support this result.</>
        )}
      </div>
      {shown.map((rec) => (
        <button
          key={rec.id}
          type="button"
          onClick={() => focusRecord(rec.id)}
          className="w-full text-left p-2.5 rounded-lg bg-white/[0.02] border border-orca-border/60 hover:border-orca-cyan/40 hover:bg-white/[0.04] transition focus:outline-none focus-visible:ring-1 focus-visible:ring-orca-cyan/60"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12.5px] font-semibold text-white truncate">
              {rec.variable || "Measurement"}
            </span>
            <span className={`text-[11px] ${NUM} text-slate-300 flex-shrink-0`}>
              {rec.value} {rec.unit}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-orca-dim min-w-0">
            <TierBadge tier={extendedField(rec, "provider_tier")} />
            <StatusBadge status={rec.status} size="sm" showIcon={false} />
            <span className="truncate text-slate-400">{rec.provider?.trim() || SOURCE_UNAVAILABLE}</span>
          </div>
        </button>
      ))}
    </div>
  );
};

/** meta.limitations[] and meta.notes[] verbatim — shown in every drawer view. */
const MetaNotes: React.FC = () => {
  const { envelope } = useEvidence();
  const limitations: string[] = envelope.meta?.limitations || [];
  const notes: string[] = envelope.meta?.notes || [];
  if (limitations.length === 0 && notes.length === 0) return null;
  return (
    <div className="mt-5 pt-3 border-t border-orca-border/60 space-y-3">
      {notes.length > 0 && (
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#ffb443] mb-1 flex items-center gap-1.5">
            <Info className="w-3 h-3" /> meta.notes ({notes.length})
          </div>
          <ul className="space-y-1">
            {notes.map((n, i) => (
              <li key={i} className="text-[11.5px] text-slate-300 leading-snug">{n}</li>
            ))}
          </ul>
        </div>
      )}
      {limitations.length > 0 && (
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-orca-dim mb-1">
            meta.limitations ({limitations.length})
          </div>
          <ul className="space-y-1 list-disc list-outside pl-3.5">
            {limitations.map((l, i) => (
              <li key={i} className="text-[11px] text-orca-muted leading-snug">{l}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

/** Derived-calculation view: distinguishes DERIVED CALCULATION from SOURCE EVIDENCE. */
const CalculationView: React.FC = () => {
  const { risk: legacy, envelope, records, openRegistry } = useEvidence();
  const env = envelope.risk;
  const score: number | undefined = env?.score ?? legacy?.overall_score;
  const band: string | undefined = env?.band ?? legacy?.category;
  const factors: any[] = env?.factors ?? legacy?.contributing_factors ?? [];
  const rules: string[] = env?.triggered_rules ?? legacy?.triggered_rules ?? [];
  const has = typeof score === "number";
  const sum = factors.reduce((a, f) => a + (Number(f.points_added) || 0), 0);
  const tone = bandTone(band);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-orca-cyan/80 mb-1 flex items-center gap-1.5">
          <Sigma className="w-3 h-3" /> Derived calculation
        </div>
        {has ? (
          <>
            <div className={`flex items-end gap-2 ${NUM}`}>
              <span className="text-[28px] font-bold text-white leading-none">{score}</span>
              <span className="text-sm text-orca-muted mb-0.5">/ 100</span>
              <span className="ml-auto text-[11px] self-center font-semibold" style={{ color: tone.hex }}>
                {tone.word}
              </span>
            </div>

            {factors.length > 0 ? (
              <div className="mt-3 space-y-1.5">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-orca-dim">
                  Contributing factors
                </div>
                {factors.map((f, idx) => (
                  <div key={idx} className="py-1.5 border-b border-orca-border/40 last:border-0">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[12.5px] text-slate-200 truncate">{f.name}</span>
                      <div className={`flex items-center gap-2 flex-shrink-0 ${NUM}`}>
                        <span className="text-[11.5px] text-slate-400">{f.value}</span>
                        <span className="text-[11px]" style={{ color: f.points_added > 0 ? "#ffb443" : "#7dd3a0" }}>
                          {f.points_added > 0 ? `+${f.points_added}` : f.points_added} pts
                        </span>
                      </div>
                    </div>
                    {f.description && (
                      <div className="text-[10.5px] text-orca-dim mt-0.5">{f.description}</div>
                    )}
                  </div>
                ))}
                <div
                  className={`pt-1 text-[11px] ${NUM}`}
                  style={{ color: sum === score ? "#7dd3a0" : "#ff5d5d" }}
                >
                  Σ {sum} {sum === score ? "=" : "≠"} score {score} {sum === score ? "✓" : "MISMATCH"}
                </div>
              </div>
            ) : (
              <div className="mt-3 text-[12px] text-orca-muted italic">Calculation details unavailable.</div>
            )}

            {rules.length > 0 && (
              <div className="mt-3 space-y-1">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-orca-dim">
                  Triggered rules
                </div>
                {rules.map((r, idx) => (
                  <div key={idx} className="text-[11.5px] text-[#ffb443]">• {r}</div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-[12px] text-orca-muted italic">Calculation details unavailable.</div>
        )}
      </div>

      <div className="pt-1">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400/80 mb-1.5 flex items-center gap-1.5">
          <ShieldCheck className="w-3 h-3" /> Source evidence
        </div>
        {records.length > 0 ? (
          <button
            type="button"
            onClick={openRegistry}
            className={`text-[12px] text-orca-cyan hover:text-white underline underline-offset-2 ${NUM}`}
          >
            View {records.length} source {records.length === 1 ? "record" : "records"} behind these factors
          </button>
        ) : (
          <div className="text-[12px] text-orca-muted italic">
            No source evidence records were provided for this calculation.
          </div>
        )}
      </div>
    </div>
  );
};

export const EvidencePanel: React.FC = () => {
  const { isOpen, mode, focusedId, records, close, backToRegistry } = useEvidence();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = "evidence-panel-title";

  const focused = focusedId ? records.find((r) => r.id === focusedId) ?? null : null;

  // Escape to close + focus trap while open.
  useEffect(() => {
    if (!isOpen) return;

    const node = panelRef.current;
    const focusables = () =>
      node
        ? Array.from(
            node.querySelectorAll<HTMLElement>(
              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            )
          ).filter((el) => !el.hasAttribute("disabled"))
        : [];

    const first = focusables()[0];
    if (first) first.focus();
    else node?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
        return;
      }
      if (e.key === "Tab") {
        const els = focusables();
        if (els.length === 0) return;
        const firstEl = els[0];
        const lastEl = els[els.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [isOpen, mode, focusedId, close]);

  if (!isOpen) return null;

  const heading =
    mode === "calculation"
      ? "How this was calculated"
      : mode === "record"
      ? "Evidence"
      : "Evidence & Data";

  return (
    <div className="fixed inset-0 z-[60]" role="presentation">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px] orca-evidence-fade"
        onClick={close}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="absolute bg-[#0a2432] border-[#12384a] flex flex-col outline-none
          orca-evidence-panel
          inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl border-t
          md:inset-y-0 md:right-0 md:left-auto md:bottom-auto md:max-h-none md:w-[380px] md:rounded-none md:rounded-l-2xl md:border-t-0 md:border-l"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#12384a] flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {mode === "record" && focused && records.length > 1 && (
              <button
                type="button"
                onClick={backToRegistry}
                aria-label="Back to all evidence sources"
                className="w-6 h-6 -ml-1 rounded-md flex items-center justify-center text-orca-muted hover:text-white hover:bg-white/5 transition focus:outline-none focus-visible:ring-1 focus-visible:ring-orca-cyan/60"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            )}
            <span id={titleId} className="text-[11px] font-semibold uppercase tracking-[0.14em] text-orca-muted">
              {heading}
            </span>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close evidence panel"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-orca-muted hover:text-white hover:bg-white/5 transition focus:outline-none focus-visible:ring-1 focus-visible:ring-orca-cyan/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
          {mode === "calculation" && <CalculationView />}
          {mode === "registry" && <RegistryList />}
          {mode === "record" && (focused ? <RecordDetail rec={focused} /> : <RegistryList />)}

          {mode === "record" && focused && records.length > 1 && (
            <button
              type="button"
              onClick={backToRegistry}
              className={`mt-4 inline-flex items-center gap-1.5 text-[11.5px] text-orca-cyan hover:text-white transition focus:outline-none focus-visible:ring-1 focus-visible:ring-orca-cyan/60 rounded ${NUM}`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              View all {records.length} sources
            </button>
          )}

          <MetaNotes />
        </div>
      </div>
    </div>
  );
};
