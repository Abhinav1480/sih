"use client";

import React from "react";
import { t } from "@/lib/i18n";
import { formatAge, isStale } from "@/lib/offline/store";

interface Props {
  savedAt: string;
  lang: string;
  /** The question this cached answer was produced for, from meta.query_text. */
  queryText?: string | null;
}

/**
 * "Cached result from <age>. Not live." Severe once past 6 h, caution before.
 *
 * The age was shown but the *question* was not, and the two are not the same
 * disclosure. A cached answer is served on any network error or timeout, and
 * the bundled fallback answers exactly one question -- "Is it safe to venture
 * into the sea tomorrow morning near Kakinada?". Someone offline near Chennai
 * asking about fishing zones saw a confident CAUTION verdict, a Kakinada
 * location readout and a map centred on 16.9891/82.2475, told only that the
 * result was 11 hours old. The staleness was disclosed; the wrongness was not.
 */
export const StaleWarning: React.FC<Props> = ({ savedAt, lang, queryText }) => {
  const stale = isStale(savedAt);
  const tone = stale ? "border-severe bg-severe/15 text-severe" : "border-caution bg-caution/15 text-caution";
  const [pre, post] = t("offline.cached", lang).split("{age}");
  return (
    <div role="alert" className={`px-xs py-2xs rounded-md border text-sm font-medium ${tone}`}>
      <div>
        {pre}
        <span className="num">{formatAge(savedAt, lang)}</span>
        {post}
      </div>
      {queryText ? (
        <div className="mt-1 text-xs font-normal opacity-90">
          {t("offline.cached.forQuestion", lang)}{" "}
          <span className="italic">&ldquo;{queryText}&rdquo;</span>
        </div>
      ) : null}
    </div>
  );
};
