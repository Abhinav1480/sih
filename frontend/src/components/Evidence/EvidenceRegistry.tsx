"use client";

import React from "react";
import { ShieldCheck, ChevronRight, Loader2, Sigma } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useEvidence } from "./evidenceContext";

/** Secondary link to the derived risk-calculation view, when a risk exists. */
const CalcLink: React.FC = () => {
  const { risk, openCalculation } = useEvidence();
  if (!risk) return null;
  return (
    <button
      type="button"
      onClick={openCalculation}
      className="inline-flex items-center gap-1.5 text-[11px] text-orca-dim hover:text-orca-cyan transition px-1 focus:outline-none focus-visible:ring-1 focus-visible:ring-orca-cyan/60 rounded"
    >
      <Sigma className="w-3 h-3" />
      How the risk score ({`${risk.overall_score}/100`}) was calculated
    </button>
  );
};

/**
 * Compact, inline "Evidence & Data" summary shown at the foot of a result.
 * It does NOT list every field inline — it surfaces the source count and
 * opens the consolidated registry in the shared EvidencePanel.
 */
export const EvidenceRegistry: React.FC = () => {
  const { records, isLoading, openRegistry } = useEvidence();

  // Evidence still arriving (non-SSE fetch, but kept honest for streaming too).
  if (isLoading && records.length === 0) {
    return (
      <div className="border border-orca-border/70 rounded-xl px-3.5 py-2.5 text-xs text-orca-muted flex items-center gap-2 bg-white/[0.015]">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-orca-dim" />
        Evidence loading…
      </div>
    );
  }

  // Result present but no provenance — stated honestly, section kept available.
  if (records.length === 0) {
    return (
      <div className="space-y-1.5">
        <div className="border border-orca-border/70 rounded-xl px-3.5 py-2.5 text-xs bg-white/[0.015]">
          <div className="flex items-center gap-2 text-slate-300 font-medium mb-0.5">
            <ShieldCheck className="w-3.5 h-3.5 text-orca-muted" />
            Evidence &amp; Data
          </div>
          <p className="text-[11px] text-orca-muted">
            No evidence records were provided for this result.
          </p>
        </div>
        <CalcLink />
      </div>
    );
  }

  // Distinct providers + statuses for a calm at-a-glance summary.
  const providers = Array.from(
    new Set(records.map((r) => r.provider?.trim()).filter(Boolean))
  ) as string[];
  const statuses = Array.from(new Set(records.map((r) => r.status)));

  return (
    <div className="space-y-1.5">
    <button
      type="button"
      onClick={openRegistry}
      className="w-full border border-orca-border/70 rounded-xl px-3.5 py-2.5 text-xs bg-white/[0.015] hover:bg-white/[0.03] hover:border-orca-cyan/30 transition text-left flex items-center justify-between gap-3 focus:outline-none focus-visible:ring-1 focus-visible:ring-orca-cyan/60"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-slate-200 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Evidence &amp; Data</span>
          <span className="text-[10px] text-orca-cyan font-mono">
            {records.length} {records.length === 1 ? "source" : "sources"}
          </span>
        </div>
        {providers.length > 0 && (
          <div className="text-[10.5px] text-orca-dim font-mono truncate mt-0.5">
            {providers.slice(0, 3).join(" · ")}
            {providers.length > 3 ? ` +${providers.length - 3}` : ""}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="hidden sm:flex items-center gap-1">
          {statuses.slice(0, 2).map((s) => (
            <StatusBadge key={s} status={s} size="sm" showIcon={false} />
          ))}
        </div>
        <ChevronRight className="w-4 h-4 text-orca-dim" />
      </div>
    </button>
    <CalcLink />
    </div>
  );
};
