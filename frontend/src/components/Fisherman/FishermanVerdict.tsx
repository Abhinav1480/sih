"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, Ban, MinusCircle, HelpCircle } from "lucide-react";
import { t } from "@/lib/i18n";

export type VerdictValue = "GO" | "CAUTION" | "NO_GO" | "NOT_APPLICABLE";

interface FishermanVerdictProps {
  /** Raw backend verdict value. Rendered EXACTLY — never derived in-frontend. */
  verdict?: string | null;
  /** Backend-provided explanation (e.g. recommendation). Not invented here. */
  explanation?: string;
  lang: string;
  className?: string;
}

/** Normalise a backend verdict string without inventing a value. */
function normalizeVerdict(raw?: string | null): VerdictValue | null {
  if (!raw) return null;
  const v = raw.toUpperCase().replace(/[\s-]+/g, "_");
  if (v === "GO" || v === "CAUTION" || v === "NO_GO" || v === "NOT_APPLICABLE") {
    return v as VerdictValue;
  }
  return null;
}

const CONFIG: Record<
  VerdictValue,
  { icon: React.ElementType; wrap: string; icon_c: string; text_c: string }
> = {
  GO: {
    icon: CheckCircle2,
    wrap: "bg-emerald-500/10 border-emerald-500/40",
    icon_c: "text-emerald-400",
    text_c: "text-emerald-300",
  },
  CAUTION: {
    icon: AlertTriangle,
    wrap: "bg-amber-500/10 border-amber-500/40",
    icon_c: "text-amber-400",
    text_c: "text-amber-300",
  },
  NO_GO: {
    icon: Ban,
    wrap: "bg-rose-500/10 border-rose-500/45",
    icon_c: "text-rose-400",
    text_c: "text-rose-300",
  },
  NOT_APPLICABLE: {
    icon: MinusCircle,
    wrap: "bg-white/[0.03] border-orca-border",
    icon_c: "text-orca-muted",
    text_c: "text-slate-300",
  },
};

export const FishermanVerdict: React.FC<FishermanVerdictProps> = ({
  verdict,
  explanation,
  lang,
  className = "",
}) => {
  const value = normalizeVerdict(verdict);

  // Honest fallback: the backend returned no go/no-go decision. We DO NOT
  // fabricate one — the real safety signal is shown by the Risk module below.
  if (!value) {
    return (
      <section
        aria-label={t("verdict.section", lang)}
        className={`rounded-2xl border bg-white/[0.02] border-orca-border p-4 flex items-center gap-3.5 ${className}`}
      >
        <div className="w-11 h-11 rounded-xl bg-white/[0.03] border border-orca-border flex items-center justify-center flex-shrink-0">
          <HelpCircle className="w-6 h-6 text-orca-muted" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-orca-dim">
            {t("verdict.section", lang)}
          </div>
          <div className="font-display font-bold text-[18px] text-slate-300 leading-tight">
            {t("verdict.unavailable", lang)}
          </div>
          <p className="text-[12px] text-orca-muted mt-0.5 leading-snug">
            {explanation || t("verdict.unavailable.desc", lang)}
          </p>
        </div>
      </section>
    );
  }

  const cfg = CONFIG[value];
  const Icon = cfg.icon;
  const label = t(`verdict.${value}`, lang);
  const desc =
    explanation ||
    (value === "NOT_APPLICABLE" ? t("verdict.na.desc", lang) : "");

  return (
    <section
      aria-label={`${t("verdict.section", lang)}: ${label}`}
      className={`rounded-2xl border p-4 flex items-center gap-3.5 ${cfg.wrap} ${className}`}
    >
      <div
        className={`w-14 h-14 rounded-xl bg-black/20 border border-white/10 flex items-center justify-center flex-shrink-0 ${cfg.icon_c}`}
      >
        <Icon className="w-8 h-8 stroke-[2]" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-orca-dim">
          {t("verdict.section", lang)}
        </div>
        {/* label = text (never color alone) */}
        <div className={`font-display font-extrabold text-[30px] leading-none tracking-tight ${cfg.text_c}`}>
          {label}
        </div>
        {desc && (
          <p className="text-[13px] text-slate-300 mt-1 leading-snug">{desc}</p>
        )}
      </div>
    </section>
  );
};
