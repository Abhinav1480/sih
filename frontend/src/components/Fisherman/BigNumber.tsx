"use client";

import React from "react";
import { t } from "@/lib/i18n";
import { ProvenanceTag } from "./ProvenanceTag";

interface BigNumberProps {
  label: string;
  value: number | string | undefined;
  unit?: string;
  provider?: string;
  provider_tier?: string;
  lang: string;
}

export const BigNumber: React.FC<BigNumberProps> = ({ label, value, unit, provider, provider_tier, lang }) => {
  const missing = value === undefined || value === null || value === "";
  return (
    <div className="min-w-0 rounded-lg bg-panel border border-border-base px-3 py-2">
      <div className="text-[11px] uppercase tracking-wider text-muted font-semibold truncate">{label}</div>
      <div className="leading-none mt-1">
        <span className={`num text-[40px] font-bold ${missing ? "text-muted" : "text-text"}`}>
          {missing ? "—" : value}
        </span>
        {!missing && unit && <span className="text-[14px] text-muted ml-1">{unit}</span>}
      </div>
      <div className="mt-1.5 min-w-0">
        {missing ? (
          <span className="text-[11px] text-muted">{t("fisherman.sourceUnavailable", lang)}</span>
        ) : (
          <ProvenanceTag provider={provider} tier={provider_tier} lang={lang} />
        )}
      </div>
    </div>
  );
};
