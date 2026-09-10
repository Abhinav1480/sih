"use client";

import React from "react";
import { t } from "@/lib/i18n";

interface ProvenanceTagProps {
  provider?: string;
  tier?: string;
  lang: string;
  className?: string;
}

/** Renders provider + tier EXACTLY as sent. Never defaults or upgrades a tier. */
export const ProvenanceTag: React.FC<ProvenanceTagProps> = ({ provider, tier, lang, className = "" }) => {
  if (!provider && !tier) {
    return <span className={`text-[11px] text-muted ${className}`}>{t("fisherman.sourceUnavailable", lang)}</span>;
  }
  const tone =
    tier === "ISRO"
      ? "border-accent text-accent"
      : tier === "FALLBACK"
        ? "border-caution text-caution"
        : "border-border-base text-muted";
  return (
    <span className={`inline-flex items-center gap-1.5 min-w-0 text-[11px] ${className}`}>
      {tier && (
        <span className={`px-1.5 py-0.5 rounded-sm border font-semibold uppercase tracking-wider shrink-0 ${tone}`}>
          {tier}
        </span>
      )}
      {provider && (
        <span className="text-muted truncate" title={provider}>
          {provider}
        </span>
      )}
    </span>
  );
};
