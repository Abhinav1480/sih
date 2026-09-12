"use client";

/**
 * A map for one envelope with default layer state, used beside the
 * conversation and on the dashboard. The full Map page adds the layer panel,
 * legend and time scrubber on top of the same MapView.
 */
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import type { Envelope } from "@/lib/types";
import { cardOfType } from "@/lib/types";
import type { LayerState } from "./MapView";
import { useT } from "@/lib/i18n";
import { Skeleton } from "@/components/ui";

const MapView = dynamic(() => import("./MapView"), { ssr: false, loading: () => <Skeleton className="h-full w-full" /> });

export function defaultLayerState(envelope: Envelope): Record<number, LayerState> {
  const s: Record<number, LayerState> = {};
  envelope.layers.forEach((l, i) => {
    s[i] = { visible: l.visible_by_default, opacity: l.kind === "wms" ? 0.8 : 1 };
  });
  return s;
}

export function AnswerMap({ envelope, className = "h-72" }: { envelope: Envelope; className?: string }) {
  const t = useT();
  const [state] = useState(() => defaultLayerState(envelope));
  const route = cardOfType(envelope, "route_plan");
  const segmentRisks = useMemo(() => (route ? route.waypoints.map((w) => w.segment_risk) : undefined), [route]);
  if (envelope.layers.length === 0) {
    return <div className={`surface-2 grid place-items-center text-sm text-text-2 ${className}`}>{t("map.noLayers")}</div>;
  }
  return (
    <div className={`overflow-hidden rounded-[var(--radius)] border border-hairline ${className}`}>
      <MapView layers={envelope.layers} state={state} center={envelope.meta.location} className="h-full" segmentRisks={segmentRisks} showScale={false} />
    </div>
  );
}
