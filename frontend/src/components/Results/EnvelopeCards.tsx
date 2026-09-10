"use client";

import React from "react";
import { AlertOctagon, FileWarning } from "lucide-react";
import { EvidenceTrigger } from "@/components/Evidence/EvidenceTrigger";
import { NUM, PALETTE, bandTone } from "@/components/ui/tone";
import { SafetyAssessmentCard } from "./SafetyAssessmentCard";
import { FishingZonesCard } from "./FishingZonesCard";
import { RouteAnalysisCard } from "./RouteAnalysisCard";
import { ComparisonCard } from "./ComparisonCard";
import { HistoricalTrendCard } from "./HistoricalTrendCard";

/** Header strip every envelope card gets: title + evidence_ids chip. */
export const CardFrame: React.FC<{ card: any; children: React.ReactNode; tone?: string }> = ({ card, children, tone }) => (
  <section className="space-y-2" aria-label={card.title || card.type}>
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-[12.5px] font-semibold text-[#e8f4f8] truncate" style={tone ? { color: tone } : undefined}>
        {card.title || card.type}
      </h3>
      <EvidenceTrigger kind="ids" evidenceIds={card.evidence_ids || []} className="flex-shrink-0" />
    </div>
    {children}
  </section>
);

const AdvisoryCard: React.FC<{ card: any }> = ({ card }) => (
  <CardFrame card={card}>
    <p className="text-[12.5px] text-[#7a94a3] leading-relaxed border-l-2 border-[#12384a] pl-3">{card.body}</p>
    <p className={`text-[10px] ${NUM} text-[#7a94a3]/70`}>advisory prose — the verdict above is the authoritative signal</p>
  </CardFrame>
);

const GeofenceCard: React.FC<{ card: any }> = ({ card }) => {
  const sev = String(card.severity || "").toUpperCase();
  const hex = sev.includes("SEVERE") || sev.includes("HIGH") ? PALETTE.severe : sev ? PALETTE.caution : PALETTE.muted;
  return (
    <CardFrame card={card} tone={hex}>
      <div className="rounded-lg border border-[#12384a] bg-[#0a2432] p-3 space-y-1.5 text-[12px]">
        <div className="flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 flex-shrink-0" style={{ color: hex }} />
          <span className={`${NUM} font-semibold`} style={{ color: hex }}>{sev || "UNSPECIFIED"}</span>
          <span className="text-[#e8f4f8] font-medium truncate">{card.zone_name}</span>
        </div>
        <div className={`${NUM} text-[11px] text-[#7a94a3] flex flex-wrap gap-x-4`}>
          {card.authority && <span>authority: {card.authority}</span>}
          {card.restriction_level && <span>restriction: {card.restriction_level}</span>}
          {typeof card.distance_km === "number" && <span>{card.distance_km.toFixed(1)} km</span>}
          {typeof card.bearing_deg === "number" && <span>{Math.round(card.bearing_deg)}°</span>}
        </div>
        <p className="text-[11.5px] text-[#e8f4f8] leading-snug">{card.detail}</p>
      </div>
    </CardFrame>
  );
};

const UnsupportedCard: React.FC<{ card: any }> = ({ card }) => (
  <CardFrame card={card} tone={PALETTE.caution}>
    <div className="rounded-lg border border-[#ffb443]/50 bg-[#0a2432] p-3 text-[12px] space-y-2">
      <div className="flex items-center gap-2 text-[#ffb443]">
        <FileWarning className="w-4 h-4 flex-shrink-0" />
        <span className={NUM}>Unsupported card type: {String(card.type)}</span>
      </div>
      <details>
        <summary className={`cursor-pointer text-[11px] ${NUM} text-[#7a94a3] hover:text-[#38e8d0]`}>raw JSON</summary>
        <pre className={`mt-2 text-[10.5px] ${NUM} text-[#e8f4f8] overflow-x-auto whitespace-pre-wrap break-all`}>
          {JSON.stringify(card, null, 2)}
        </pre>
      </details>
    </div>
  </CardFrame>
);

interface EnvelopeCardProps {
  card: any;
  /** Full response — envelope `risk`/`answer`/`meta` are read for adapters. */
  analysis: any;
}

/** Renders one contract 1.3.0 card, discriminated on `type`. */
export const EnvelopeCard: React.FC<EnvelopeCardProps> = ({ card, analysis }) => {
  switch (card?.type) {
    case "risk_summary":
      return (
        <CardFrame card={card}>
          <SafetyAssessmentCard risk={analysis.risk ?? card} verdict={analysis.answer?.verdict ?? card.verdict} />
        </CardFrame>
      );
    case "advisory_text":
      return <AdvisoryCard card={card} />;
    case "pfz_ranking":
      return (
        <CardFrame card={card}>
          <FishingZonesCard zones={card.zones || []} locationName={analysis.meta?.location?.name || analysis.location?.name} />
          {Array.isArray(card.rejected_reasons) && card.rejected_reasons.length > 0 && (
            <ul className="text-[10.5px] text-[#7a94a3] list-disc pl-4 space-y-0.5">
              {card.rejected_reasons.map((r: string, i: number) => <li key={i}>{r}</li>)}
            </ul>
          )}
        </CardFrame>
      );
    case "route_plan":
      return (
        <CardFrame card={card}>
          <RouteAnalysisCard route={{ route_id: card.id, alternative_suggested: false, ...card }} />
        </CardFrame>
      );
    case "comparison_table":
      return (
        <CardFrame card={card}>
          <ComparisonCard data={{ ...card, overall_verdict: card.verdict_text }} />
        </CardFrame>
      );
    case "timeseries_chart":
      return (
        <CardFrame card={card}>
          <HistoricalTrendCard
            data={{
              location_name: analysis.meta?.location?.name || analysis.location?.name || "",
              trend_summary: "",
              change_reasons: [],
              ...card,
            }}
          />
        </CardFrame>
      );
    case "geofence_warning":
      return <GeofenceCard card={card} />;
    default:
      return <UnsupportedCard card={card} />;
  }
};

/** Big verdict word + band · score. Primary signal; never derived from prose. */
export const VerdictHeadline: React.FC<{ verdict?: string; band?: string; score?: number; confidence?: number }> = ({
  verdict,
  band,
  score,
  confidence,
}) => {
  const vt = verdict ? bandToneSafe(verdict, true) : null;
  const bt = band ? bandTone(band) : null;
  if (!vt && !bt) return null;
  return (
    <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
      {vt && (
        <span className="font-display font-bold text-[34px] leading-none tracking-tight" style={{ color: vt.hex }}>
          {vt.word}
        </span>
      )}
      {bt && (
        <span className={`${NUM} text-[13px] font-semibold pb-0.5`} style={{ color: bt.hex }}>
          {bt.word}
          {typeof score === "number" ? ` · ${score}/100` : ""}
        </span>
      )}
      {typeof confidence === "number" && (
        <span className={`${NUM} text-[10.5px] text-[#7a94a3] pb-1`}>confidence {confidence}%</span>
      )}
    </div>
  );
};

import { verdictTone } from "@/components/ui/tone";
function bandToneSafe(v: string, isVerdict: boolean) {
  return isVerdict ? verdictTone(v) : bandTone(v);
}
