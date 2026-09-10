"use client";

import React, { useEffect, useState } from "react";
import { t } from "@/lib/i18n";
import { useNetworkStatus } from "@/lib/offline/network";
import { formatAge, isStale } from "@/lib/offline/store";

interface Props {
  lang: string;
  /** ISO time of the last successful backend response (null = nothing cached). */
  lastSyncAt: string | null;
}

/** Re-render once a minute so the age stays accurate to the minute. */
function useMinuteTick() {
  const [, set] = useState(0);
  useEffect(() => {
    const id = setInterval(() => set((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);
}

export const ConnectivityBanner: React.FC<Props> = ({ lang, lastSyncAt }) => {
  const { online } = useNetworkStatus();
  useMinuteTick();
  const stale = lastSyncAt ? isStale(lastSyncAt) : false;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center gap-2xs px-xs text-xs leading-none border-b border-border-base ${
        online ? "bg-panel text-muted" : "bg-caution/20 text-text"
      }`}
      style={{ minHeight: 28 }}
    >
      <span
        aria-hidden
        className={`inline-block w-2 h-2 rounded-full ${online ? "bg-calm" : "bg-caution"}`}
      />
      <span className="font-medium">{online ? t("offline.online", lang) : t("offline.offline", lang)}</span>
      {!online && (
        <span>
          {" · "}
          {lastSyncAt ? (
            <>
              {t("offline.synced", lang).split("{age}")[0]}
              <span className="num">{formatAge(lastSyncAt, lang)}</span>
              {t("offline.synced", lang).split("{age}")[1]}
            </>
          ) : (
            t("offline.neverSynced", lang)
          )}
        </span>
      )}
      {stale && (
        <span className="ml-auto px-2xs py-3xs rounded-sm bg-severe/25 text-severe font-medium">
          {t("offline.stale", lang)}
        </span>
      )}
    </div>
  );
};
