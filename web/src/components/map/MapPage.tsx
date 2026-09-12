"use client";

/**
 * The full marine picture: the latest answer's layers with a per-layer
 * visibility and opacity panel, WMS attribution always visible when a layer
 * is on, a legend built from each layer's own legend_title / legend_unit /
 * color, scale bar and north indicator (in MapView), click-through detail,
 * and a forecast time scrubber driven by the answer's timeseries points.
 */
import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useFmt, useT } from "@/lib/i18n";
import { useLatestEnvelope } from "@/lib/store/conversations";
import { cardOfType, type Envelope, type GeoFeature, type Layer } from "@/lib/types";
import type { LayerState } from "./MapView";
import { defaultLayerState } from "./AnswerMap";
import { EmptyState, KV, Mono, Skeleton, StatusChip, Surface, TierChip, Unavailable } from "@/components/ui";
import { IconClose, IconLayers } from "@/components/ui/Icons";

const MapView = dynamic(() => import("./MapView"), { ssr: false, loading: () => <Skeleton className="h-full w-full" /> });

export function MapPage() {
  const t = useT();
  const f = useFmt();
  const source = useLatestEnvelope();
  // Layer state is the layers' own defaults until the person touches the panel.
  const [touched, setTouched] = useState<{ request: string; state: Record<number, LayerState> } | null>(null);
  const [picked, setPicked] = useState<{ layer: Layer; feature: GeoFeature } | null>(null);
  const [timeIndex, setTimeIndex] = useState(0);

  const env: Envelope | null = source?.envelope ?? null;
  const state: Record<number, LayerState> = useMemo(() => {
    if (!env) return {};
    return touched && touched.request === env.request_id ? touched.state : defaultLayerState(env);
  }, [env, touched]);
  const route = cardOfType(env, "route_plan");
  const series = cardOfType(env, "timeseries_chart");
  const points = useMemo(() => (series ? [...series.points].sort((a, b) => a.offset_hours - b.offset_hours) : []), [series]);
  const segmentRisks = useMemo(() => (route ? route.waypoints.map((w) => w.segment_risk) : undefined), [route]);

  if (!env) {
    return <EmptyState title={t("map.noLayers")} action={<Link href="/ai" className="btn btn-primary">{t("nav.ai")}</Link>} />;
  }

  const setLayer = (i: number, patch: Partial<LayerState>) =>
    setTouched({ request: env.request_id, state: { ...state, [i]: { ...(state[i] ?? { visible: true, opacity: 1 }), ...patch } } });
  const current = points[timeIndex];

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]" style={{ minHeight: "calc(100vh - var(--nav-h) - 80px)" }}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-2xl font-bold">{t("map.title")}</h1>
          <p className="text-sm text-text-2">{t("map.fromAnswer")}: “{f.raw(source?.query ?? env.meta.query_text)}” · <Mono>{f.dateTime(env.meta.generated_at)}</Mono></p>
        </div>
        <div className="relative min-h-[520px] flex-1 overflow-hidden rounded-[var(--radius)] border border-hairline">
          <MapView layers={env.layers} state={state} center={env.meta.location} className="h-full" segmentRisks={segmentRisks} onFeature={(layer, feature) => setPicked({ layer, feature })} />
        </div>
        {/* time scrubber */}
        <Surface className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="eyebrow">{t("map.time")}</span>
            {points.length === 0 ? (
              <span className="text-sm text-text-2">{t("map.timeNone")} · {t("common.window")}: {f.raw(env.meta.temporal.label)} · <Mono>{f.dateTime(env.meta.temporal.start_time)} – {f.dateTime(env.meta.temporal.end_time)}</Mono></span>
            ) : (
              <>
                <input type="range" min={0} max={points.length - 1} value={timeIndex} onChange={(e) => setTimeIndex(Number(e.target.value))} className="flex-1 accent-[var(--accent)]" aria-label={t("map.time")} />
                {current && (
                  <span className="flex flex-wrap items-center gap-2 text-sm">
                    <Mono>{f.int(current.offset_hours)} {t("unit.h")}</Mono>
                    <span className="text-text-2">{t("card.zone.wave")} <Mono>{current.wave_height_m === null ? <Unavailable /> : `${f.num(current.wave_height_m)} ${t("unit.m")}`}</Mono></span>
                    <span className="text-text-2">{t("card.zone.wind")} <Mono>{current.wind_knots === null ? <Unavailable /> : `${f.num(current.wind_knots, 0)} ${t("unit.kt")}`}</Mono></span>
                    <span className="text-text-2">{t("card.series.riskScore")} <Mono>{current.risk_score === null ? <Unavailable /> : f.int(current.risk_score)}</Mono></span>
                    <StatusChip status={current.status} />
                  </span>
                )}
                <span className="text-xs text-text-3">{t("map.timeNote", { n: f.int(points.length) })}</span>
              </>
            )}
          </div>
        </Surface>
      </div>

      <aside className="space-y-4">
        <Surface className="p-4">
          <div className="mb-2 flex items-center gap-2 font-semibold"><IconLayers size={16} />{t("map.layers")}</div>
          <ul className="space-y-3">
            {env.layers.map((l, i) => {
              const s = state[i] ?? { visible: l.visible_by_default, opacity: 1 };
              return (
                <li key={`${l.id}-${i}`} className="text-sm">
                  <label className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1 accent-[var(--accent)]" checked={s.visible} onChange={(e) => setLayer(i, { visible: e.target.checked })} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2"><span className="inline-block h-3 w-3 shrink-0 rounded-sm" style={{ background: l.color }} aria-hidden /><span className="truncate">{l.name}</span></span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-text-3"><Mono>{l.kind}</Mono><TierChip tier={l.provider_tier} />{l.attribution && <span>{l.attribution}</span>}</span>
                    </span>
                  </label>
                  <div className="ml-6 mt-1 flex items-center gap-2 text-xs text-text-3">
                    <span>{t("map.opacity")}</span>
                    <input type="range" min={0} max={100} value={Math.round(s.opacity * 100)} onChange={(e) => setLayer(i, { opacity: Number(e.target.value) / 100 })} className="flex-1 accent-[var(--accent)]" aria-label={`${t("map.opacity")} ${l.name}`} disabled={!s.visible} />
                    <Mono className="w-8 text-right">{f.int(Math.round(s.opacity * 100))}</Mono>
                  </div>
                </li>
              );
            })}
          </ul>
        </Surface>

        <Surface className="p-4">
          <div className="mb-2 font-semibold">{t("map.legend")}</div>
          <ul className="space-y-1 text-sm">
            {env.layers.filter((l, i) => state[i]?.visible).map((l, i) => (
              <li key={`${l.id}-${i}`} className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 shrink-0 rounded-sm" style={{ background: l.color }} aria-hidden />
                <span className="truncate">{l.legend_title ? l.legend_title : l.name}</span>
                {l.legend_unit && <Mono className="ml-auto text-xs text-text-3">{l.legend_unit}</Mono>}
              </li>
            ))}
          </ul>
          <div className="mt-3 border-t border-hairline pt-3 text-xs text-text-3">
            <div className="mb-1">{t("card.route.segment")}</div>
            <div className="flex flex-wrap gap-2">
              {(["LOW", "MODERATE", "HIGH", "SEVERE"] as const).map((b) => <span key={b} className={`chip risk-${b}`}>{t(`band.${b}`)}</span>)}
            </div>
          </div>
          <p className="mt-2 text-xs text-text-3">{t("map.wmsNote")}</p>
        </Surface>

        {picked && (
          <Surface className="p-4 arrive">
            <div className="mb-2 flex items-center justify-between font-semibold">
              <span>{t("map.detail")}</span>
              <button type="button" className="btn btn-quiet btn-sm" onClick={() => setPicked(null)} aria-label={t("common.close")}><IconClose size={14} /></button>
            </div>
            <p className="text-xs text-text-3">{picked.layer.name}</p>
            <div className="mt-2">
              {Object.entries(picked.feature.properties).map(([k, v]) => (
                <KV key={k} label={k} mono={typeof v === "number"}>
                  {v === null || v === undefined || v === "" ? <Unavailable /> : typeof v === "number" ? f.num(v, Number.isInteger(v) ? 0 : 2) : typeof v === "boolean" ? (v ? t("common.yes") : t("common.no")) : f.raw(String(v))}
                </KV>
              ))}
            </div>
          </Surface>
        )}
      </aside>
    </div>
  );
}
