"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, Ban, MinusCircle, HelpCircle } from "lucide-react";
import { t } from "@/lib/i18n";

export type VerdictValue = "GO" | "CAUTION" | "NO_GO" | "NOT_APPLICABLE";

interface FishermanVerdictProps {
  /** Raw backend verdict value. Rendered EXACTLY — never derived from prose. */
  verdict?: string | null;
  /** Backend-provided explanation. Not invented here. */
  explanation?: string;
  lang: string;
  className?: string;
  band?: string;
  score?: number;
}

/** Normalise a backend verdict string without inventing a value. */
export function normalizeVerdict(raw?: string | null): VerdictValue | null {
  if (!raw) return null;
  const v = raw.toUpperCase().replace(/[\s-]+/g, "_");
  return v === "GO" || v === "CAUTION" || v === "NO_GO" || v === "NOT_APPLICABLE" ? (v as VerdictValue) : null;
}

/** Deterministic band -> verdict fallback when answer.verdict is absent. Never from narrative. */
export function verdictFromBand(band?: string | null): VerdictValue | null {
  switch ((band || "").toUpperCase()) {
    case "LOW":
      return "GO";
    case "MODERATE":
      return "CAUTION";
    case "HIGH":
    case "SEVERE":
      return "NO_GO";
    default:
      return null;
  }
}

export const VERDICT_STYLE: Record<VerdictValue, { icon: React.ElementType; text: string; wrap: string }> = {
  GO: { icon: CheckCircle2, text: "text-calm", wrap: "border-calm/50 bg-calm/10" },
  CAUTION: { icon: AlertTriangle, text: "text-caution", wrap: "border-caution/50 bg-caution/10" },
  NO_GO: { icon: Ban, text: "text-severe", wrap: "border-severe/50 bg-severe/10" },
  NOT_APPLICABLE: { icon: MinusCircle, text: "text-muted", wrap: "border-border-base bg-panel" },
};

export const UNKNOWN_STYLE = { icon: HelpCircle, text: "text-muted", wrap: "border-border-base bg-panel" };

export const FishermanVerdict: React.FC<FishermanVerdictProps> = ({
  verdict,
  explanation,
  lang,
  className = "",
  band,
  score,
}) => {
  const value = normalizeVerdict(verdict);
  const cfg = value ? VERDICT_STYLE[value] : UNKNOWN_STYLE;
  const Icon = cfg.icon;
  const label = value ? t(`fisherman.verdict.${value}`, lang) : t("fisherman.verdict.unavailable", lang);
  const desc =
    explanation ||
    (!value ? t("verdict.unavailable.desc", lang) : value === "NOT_APPLICABLE" ? t("verdict.na.desc", lang) : "");

  return (
    <section
      aria-label={`${t("verdict.section", lang)}: ${label}`}
      className={`rounded-lg border p-4 flex items-center gap-4 ${cfg.wrap} ${className}`}
    >
      <Icon className={`w-14 h-14 shrink-0 stroke-[2] ${cfg.text}`} />
      <div className="min-w-0">
        <div className={`font-display font-black text-[40px] leading-none tracking-tight ${cfg.text}`}>{label}</div>
        {(band || score !== undefined) && (
          <div className="num text-[14px] text-muted mt-1">
            {band && t(`fisherman.band.${band.toUpperCase()}`, lang)}
            {band && score !== undefined && " · "}
            {score !== undefined && `${score}/100`}
          </div>
        )}
        {desc && <p className="text-[14px] text-text mt-1 leading-snug">{desc}</p>}
      </div>
    </section>
  );
};
