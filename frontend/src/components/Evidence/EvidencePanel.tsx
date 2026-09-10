"use client";

import React, { useEffect, useRef } from "react";
import { X, MapPin, ExternalLink, ArrowLeft, Sigma, ShieldCheck } from "lucide-react";
import { EvidenceRecord } from "@/lib/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
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
          mono ? "font-mono" : ""
        } ${muted ? "text-orca-muted italic" : "text-slate-200"}`}
      >
        {value}
      </div>
    )}
  </div>
);

/** Full provenance detail for a single evidence record. */
const RecordDetail: React.FC<{ rec: EvidenceRecord }> = ({ rec }) => {
  const { viewOnMap, canViewOnMap } = useEvidence();

  // Core contract fields (always present, may be empty string).
  const provider = rec.provider?.trim();
  const dataset = rec.dataset?.trim();
  const location = rec.coordinates?.trim() || rec.location?.trim();
  const observed = rec.observation_or_forecast_time?.trim();
  const retrieved = rec.retrieval_time?.trim();
  const reliability = rec.reliability_notes?.trim();

  // Extended / idealized fields — rendered ONLY if a backend actually sends
  // them (never fabricated). Absent in the current contract.
  const providerTier = extendedField(rec, "provider_tier");
  const sourceUrl = extendedField(rec, "source_url");
  const validFrom = extendedField(rec, "valid_from");
  const validTo = extendedField(rec, "valid_to");

  return (
    <div>
      {/* Variable + value */}
      <div className="text-[10px] font-semibold uppercase tracking-wider text-orca-cyan/80 mb-1">
        Significant value
      </div>
      <h3 className="font-display font-bold text-[17px] text-white leading-tight">
        {rec.variable || "Measurement"}
      </h3>
      <div className="mt-1.5 flex items-end gap-2">
        <span className="font-display text-[30px] font-bold text-white leading-none">
          {rec.value}
        </span>
        {rec.unit && <span className="text-sm text-orca-muted mb-0.5">{rec.unit}</span>}
      </div>
      <div className="mt-2.5">
        <StatusBadge status={rec.status} size="md" />
      </div>

      {/* Provenance metadata */}
      <div className="mt-3">
        <MetaRow
          label="Source"
          value={provider || SOURCE_UNAVAILABLE}
          muted={!provider}
        />
        {providerTier && <MetaRow label="Provider Tier" value={providerTier} mono />}
        <MetaRow label="Dataset" value={dataset || FIELD_MISSING} muted={!dataset} />

        {/* Location + optional "View on map" into the persistent map */}
        <MetaRow label="Location">
          {location ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12.5px] font-mono text-slate-200 break-words">
                {location}
              </span>
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

        <MetaRow
          label="Observed / Issued"
          value={observed || FIELD_MISSING}
          mono
          muted={!observed}
        />
        {(validFrom || validTo) && (
          <MetaRow
            label="Valid"
            value={[validFrom, validTo].filter(Boolean).join(" – ")}
            mono
          />
        )}
        <MetaRow
          label="Retrieved"
          value={retrieved || FIELD_MISSING}
          mono
          muted={!retrieved}
        />
        <MetaRow
          label="Reliability"
          value={reliability || FIELD_MISSING}
          muted={!reliability}
        />

        {/* Source link only when present — never a broken link. */}
        {sourceUrl && (
          <MetaRow label="Source">
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

/** Consolidated list of every source for the current result. */
const RegistryList: React.FC = () => {
  const { records, focusRecord } = useEvidence();

  if (records.length === 0) {
    return (
      <div className="text-[12.5px] text-orca-muted italic py-6 text-center">
        No evidence records were provided for this result.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-[11px] text-orca-muted">
        {records.length} {records.length === 1 ? "source" : "sources"} support this result.
        Select one to inspect its provenance.
      </div>
      {records.map((rec) => (
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
            <StatusBadge status={rec.status} size="sm" showIcon={false} />
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-orca-dim">
            <span className="text-slate-300 font-medium">
              {rec.provider?.trim() || SOURCE_UNAVAILABLE}
            </span>
            {rec.dataset?.trim() && (
              <>
                <span>·</span>
                <span className="truncate">{rec.dataset}</span>
              </>
            )}
          </div>
        </button>
      ))}
    </div>
  );
};

/** Derived-calculation view: distinguishes DERIVED CALCULATION from SOURCE EVIDENCE. */
const CalculationView: React.FC = () => {
  const { risk, records, openRegistry } = useEvidence();

  const factors = risk?.contributing_factors ?? [];

  return (
    <div className="space-y-4">
      {/* Derived score */}
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-orca-cyan/80 mb-1 flex items-center gap-1.5">
          <Sigma className="w-3 h-3" /> Derived calculation
        </div>
        {risk ? (
          <>
            <div className="flex items-end gap-2">
              <span className="font-display text-[30px] font-bold text-white leading-none">
                {risk.overall_score}
              </span>
              <span className="text-sm text-orca-muted mb-0.5">/ 100</span>
              <span className="ml-auto text-[11px] font-mono text-orca-dim self-center">
                {risk.category}
              </span>
            </div>

            {factors.length > 0 ? (
              <div className="mt-3 space-y-1.5">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-orca-dim">
                  Contributing factors
                </div>
                {factors.map((f, idx) => (
                  <div
                    key={idx}
                    className="py-1.5 border-b border-orca-border/40 last:border-0"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[12.5px] text-slate-200 truncate">{f.name}</span>
                      <div className="flex items-center gap-2 flex-shrink-0 font-mono">
                        <span className="text-[11.5px] text-slate-400">{f.value}</span>
                        <span
                          className={`text-[11px] ${
                            f.points_added > 0 ? "text-rose-400" : "text-emerald-400"
                          }`}
                        >
                          {f.points_added > 0 ? `+${f.points_added}` : f.points_added}
                        </span>
                      </div>
                    </div>
                    {f.description && (
                      <div className="text-[10.5px] text-orca-dim mt-0.5">{f.description}</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 text-[12px] text-orca-muted italic">
                Calculation details unavailable.
              </div>
            )}

            {risk.triggered_rules && risk.triggered_rules.length > 0 && (
              <div className="mt-3 space-y-1">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-orca-dim">
                  Triggered rules
                </div>
                {risk.triggered_rules.map((r, idx) => (
                  <div key={idx} className="text-[11.5px] text-amber-300/90">
                    • {r}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-[12px] text-orca-muted italic">
            Calculation details unavailable.
          </div>
        )}
      </div>

      {/* Source evidence — kept distinct from the derived math above. */}
      <div className="pt-1">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400/80 mb-1.5 flex items-center gap-1.5">
          <ShieldCheck className="w-3 h-3" /> Source evidence
        </div>
        {records.length > 0 ? (
          <button
            type="button"
            onClick={openRegistry}
            className="text-[12px] text-orca-cyan hover:text-white underline underline-offset-2"
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
    // Move focus into the panel on open.
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
      {/* Backdrop — click to close */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px] orca-evidence-fade"
        onClick={close}
        aria-hidden="true"
      />

      {/* Panel: right-side drawer on desktop, bottom sheet on mobile */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="absolute bg-orca-panel border-orca-border shadow-elevation2 flex flex-col outline-none
          orca-evidence-panel
          inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl border-t
          md:inset-y-0 md:right-0 md:left-auto md:bottom-auto md:max-h-none md:w-[380px] md:rounded-none md:rounded-l-2xl md:border-t-0 md:border-l"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-orca-border flex-shrink-0">
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
            <span
              id={titleId}
              className="text-[11px] font-semibold uppercase tracking-[0.14em] text-orca-muted"
            >
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

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
          {mode === "calculation" && <CalculationView />}
          {mode === "registry" && <RegistryList />}
          {mode === "record" &&
            (focused ? <RecordDetail rec={focused} /> : <RegistryList />)}

          {/* Back to registry from a single record */}
          {mode === "record" && focused && records.length > 1 && (
            <button
              type="button"
              onClick={backToRegistry}
              className="mt-4 inline-flex items-center gap-1.5 text-[11.5px] text-orca-cyan hover:text-white transition focus:outline-none focus-visible:ring-1 focus-visible:ring-orca-cyan/60 rounded"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              View all {records.length} sources
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
