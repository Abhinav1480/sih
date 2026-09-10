"use client";

import React from "react";
import { AlertTriangle, OctagonX, X } from "lucide-react";
import { t } from "@/lib/i18n";
import type { GeofencePosition, GeofenceStatus } from "@/lib/geofence";

interface GeofenceBannerProps {
  status: GeofenceStatus | null;
  position: GeofencePosition | null;
  lang: string;
  /** When given, the advisory line shows a dismiss button. Warning/severe never dismiss. */
  onDismissAdvisory?: () => void;
  className?: string;
}

export const GeofenceBanner: React.FC<GeofenceBannerProps> = ({
  status,
  lang,
  onDismissAdvisory,
  className = "",
}) => {
  if (!status || !status.nearest || status.level === "clear") return null;
  const { feature, distanceKm } = status.nearest;
  const { name, kind, restriction, authority } = feature.properties;
  const km = <span className="num">{distanceKm.toFixed(1)}</span>;
  const unit = t("geofence.km", lang);

  if (status.level === "advisory") {
    return (
      <div className={`flex items-center gap-2 text-xs text-muted ${className}`}>
        <span className="truncate">
          {t("geofence.nearest", lang)}: {name} · {km} {unit}
        </span>
        {onDismissAdvisory && (
          <button
            type="button"
            onClick={onDismissAdvisory}
            aria-label={t("geofence.dismiss", lang)}
            className="ml-auto p-1 rounded-sm hover:text-text"
          >
            <X size={14} />
          </button>
        )}
      </div>
    );
  }

  if (status.level === "warning") {
    return (
      <div
        role="status"
        className={`flex items-center gap-3 px-3 py-2 rounded-md border border-caution bg-caution/15 text-text ${className}`}
      >
        <AlertTriangle size={22} className="text-caution flex-shrink-0" aria-hidden />
        <div className="min-w-0">
          <div className="font-display font-bold text-caution tracking-wide">
            {t("geofence.warning", lang)} · {km} {unit}
          </div>
          <div className="text-sm truncate">
            {t("geofence.warning.desc", lang)}: {name}
          </div>
        </div>
      </div>
    );
  }

  // severe — persistent, not dismissable
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`w-full px-4 py-4 border-2 border-severe bg-severe/20 text-text ${className}`}
    >
      <div className="flex items-center gap-3">
        <OctagonX size={40} className="text-severe flex-shrink-0" aria-hidden />
        <div className="font-display font-black text-severe text-4xl leading-none tracking-wide">
          {t("geofence.stop", lang)}
        </div>
        <div className="ml-auto text-severe font-bold text-lg">
          {status.inside ? t("geofence.inside", lang) : <>{km} {unit}</>}
        </div>
      </div>
      <div className="mt-2 font-semibold">{t("geofence.severe.desc", lang)}</div>
      <div className="mt-1 text-sm">
        {name} <span className="text-muted">· {t(`geofence.kind.${kind}`, lang)}</span>
      </div>
      <div className="mt-1 text-sm">
        <span className="text-muted">{t("geofence.restriction", lang)}:</span> {restriction}
      </div>
      <div className="text-xs text-muted">
        {t("geofence.authority", lang)}: {authority}
      </div>
    </div>
  );
};
