"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { t } from "@/lib/i18n";
import { formatAge, isStale } from "@/lib/offline/store";

interface Props {
  /** ISO time the cached response was saved. From getCachedMarker(). */
  savedAt: string;
  lang: string;
}

/** Re-render once a minute so the age stays accurate to the minute. */
function useMinuteTick() {
  const [, set] = useState(0);
  useEffect(() => {
    const id = setInterval(() => set((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);
}

/**
 * Sits above a result that came out of the cache, and says so.
 *
 * Reconstructed after the module was lost from the working tree. It renders
 * only what it was handed: the saved-at timestamp, and how long ago that was.
 * It never restates the verdict, never re-reads the conditions, and never
 * decides whether the cached answer is still correct -- an old NO-GO and an
 * old GO get the same treatment, because the age is the only thing this
 * component actually knows.
 *
 * Past STALE_AFTER_MS (lib/offline/store.ts) the wording hardens, but the
 * cutoff is the store's, not this component's.
 */
export const StaleWarning: React.FC<Props> = ({ savedAt, lang }) => {
  useMinuteTick();
  const stale = isStale(savedAt);
  const age = formatAge(savedAt, lang);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-start gap-2xs rounded-md border px-xs py-2xs text-xs leading-snug ${
        stale
          ? "border-severe/40 bg-severe/15 text-text"
          : "border-border-base bg-panel/60 text-muted"
      }`}
    >
      <AlertTriangle
        aria-hidden
        className={`w-3.5 h-3.5 shrink-0 mt-px ${stale ? "text-severe" : "text-caution"}`}
      />
      <span>
        {t("offline.cached.notLive", lang)}{" "}
        <span className="num">{age}</span>
        {stale && (
          <>
            {" "}
            <span className="font-medium">{t("offline.cached.recheck", lang)}</span>
          </>
        )}
      </span>
    </div>
  );
};
