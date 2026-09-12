"use client";

/**
 * The card union, switched on `card.type`. Every value is rendered as sent;
 * a null renders the explicit absence marker. A type this build does not
 * know renders an explicit unsupported state, never a blank.
 */
import { useFmt, useT } from "@/lib/i18n";
import type { AdvisoryTextCard, Card, ComparisonTableCard, Envelope, GeofenceWarningCard, PfzRankingCard, RiskSummaryCard, RoutePlanCard, TimeseriesChartCard } from "@/lib/types";
import { KNOWN_CARD_TYPES } from "@/lib/types";
import { BandChip, KV, Mono, SeverityChip, StatusChip, Unavailable, VerdictChip, bandClass } from "@/components/ui";
import { IconCaution, IconInfo } from "@/components/ui/Icons";

export function CardView({ card, envelope, compact = false }: { card: Card; envelope: Envelope; compact?: boolean }) {
  const t = useT();
  if (!KNOWN_CARD_TYPES.has(card.type)) {
    return (
      <CardFrame title={card.title}>
        <p className="flex items-start gap-2 text-sm text-text-2">
          <IconInfo size={16} className="mt-0.5 shrink-0" />
          {t("answer.cardUnsupported", { type: card.type })}
        </p>
      </CardFrame>
    );
  }
  switch (card.type) {
    case "risk_summary": return compact ? null : <RiskSummary card={card as RiskSummaryCard} />;
    case "pfz_ranking": return <PfzRanking card={card as PfzRankingCard} />;
    case "route_plan": return <RoutePlan card={card as RoutePlanCard} />;
    case "comparison_table": return <ComparisonTable card={card as ComparisonTableCard} />;
    case "timeseries_chart": return <Timeseries card={card as TimeseriesChartCard} />;
    case "geofence_warning": return <GeofenceCard card={card as GeofenceWarningCard} />;
    case "advisory_text": return <Advisory card={card as AdvisoryTextCard} envelope={envelope} />;
    default: return null;
  }
}

function CardFrame({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`surface-2 p-4 arrive ${className}`}>
      <h3 className="mb-3 text-sm font-semibold text-text-2">{title}</h3>
      {children}
    </section>
  );
}

function Num({ v, d = 1, unit }: { v: number | null | undefined; d?: number; unit?: string }) {
  const f = useFmt();
  if (v === null || v === undefined || !Number.isFinite(v)) return <Unavailable />;
  return <Mono>{f.num(v, d)}{unit ? ` ${unit}` : ""}</Mono>;
}

// --- risk summary ----------------------------------------------------------------

function RiskSummary({ card }: { card: RiskSummaryCard }) {
  const t = useT();
  const f = useFmt();
  return (
    <CardFrame title={card.title}>
      <div className="flex flex-wrap items-center gap-2">
        <VerdictChip verdict={card.verdict} />
        <BandChip band={card.band} />
        <Mono className="text-sm text-text-2">{f.int(card.score)} / 100</Mono>
      </div>
      <ul className="mt-3 space-y-1 text-sm">
        {card.factors.map((fa, i) => (
          <li key={i} className="flex justify-between gap-3">
            <span className="text-text-2">{fa.name}</span>
            <span className="mono">{f.raw(fa.value)} · +{f.int(fa.points_added)}</span>
          </li>
        ))}
      </ul>
      {card.triggered_rules.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-text-2">
          {card.triggered_rules.map((r, i) => (
            <li key={i} className="flex gap-2"><IconCaution size={14} className="mt-1 shrink-0 ink-MODERATE" />{f.raw(r)}</li>
          ))}
        </ul>
      )}
      {card.triggered_rules.length === 0 && <p className="mt-3 text-sm text-text-3">{t("answer.noRules")}</p>}
    </CardFrame>
  );
}

// --- fishing zones -----------------------------------------------------------------

function PfzRanking({ card }: { card: PfzRankingCard }) {
  const t = useT();
  const f = useFmt();
  const zones = [...card.zones].sort((a, b) => a.rank - b.rank);
  return (
    <CardFrame title={card.title}>
      {zones.length === 0 && <p className="text-sm text-text-2">{t("common.none")}</p>}
      {zones.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-text-3">
              <tr>
                <th className="py-1 pr-3">{t("card.zone.rank")}</th>
                <th className="py-1 pr-3">{t("map.feature")}</th>
                <th className="py-1 pr-3">{t("card.zone.distance")}</th>
                <th className="py-1 pr-3">{t("card.zone.bearing")}</th>
                <th className="py-1 pr-3">{t("card.zone.suitability")}</th>
                <th className="py-1 pr-3">{t("card.zone.sst")}</th>
                <th className="py-1 pr-3">{t("card.zone.chl")}</th>
                <th className="py-1 pr-3">{t("card.zone.depth")}</th>
                <th className="py-1 pr-3">{t("card.zone.wave")}</th>
                <th className="py-1 pr-3">{t("card.zone.wind")}</th>
                <th className="py-1 pr-3">{t("card.zone.advisory")}</th>
                <th className="py-1 pr-3">{t("common.status")}</th>
              </tr>
            </thead>
            <tbody>
              {zones.map((z) => (
                <tr key={z.zone_id} className="border-t border-hairline align-top">
                  <td className="py-1.5 pr-3 mono">{f.int(z.rank)}</td>
                  <td className="py-1.5 pr-3">
                    <div className="font-medium">{f.raw(z.name)}</div>
                    {z.within_mpa && (
                      <div className="text-xs ink-HIGH">{t("card.zone.insideMpa")}{z.mpa_name ? `: ${z.mpa_name}` : ""}</div>
                    )}
                  </td>
                  <td className="py-1.5 pr-3"><Num v={z.distance_km} unit={t("unit.km")} /></td>
                  <td className="py-1.5 pr-3"><Num v={z.bearing_deg} d={0} unit={t("unit.deg")} /></td>
                  <td className="py-1.5 pr-3"><Num v={z.suitability_score} d={0} /></td>
                  <td className="py-1.5 pr-3"><Num v={z.sst_c} unit={t("unit.c")} /></td>
                  <td className="py-1.5 pr-3"><Num v={z.chlorophyll_mg_m3} d={2} unit={t("unit.mgm3")} /></td>
                  <td className="py-1.5 pr-3"><Num v={z.depth_m} d={0} unit={t("unit.m")} /></td>
                  <td className="py-1.5 pr-3"><Num v={z.wave_height_m} unit={t("unit.m")} /></td>
                  <td className="py-1.5 pr-3"><Num v={z.wind_speed_knots} unit={t("unit.kt")} /></td>
                  <td className="py-1.5 pr-3">{z.advisory_status}</td>
                  <td className="py-1.5 pr-3"><StatusChip status={z.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {zones.length > 0 && (
        <p className="mt-2 text-xs text-text-3">
          {t("card.zone.validUntil")}: <Mono>{f.dateTime(zones[0].valid_until)}</Mono> · {t("common.source")}: {zones[0].source}
        </p>
      )}
      {card.rejected_reasons.length > 0 && (
        <div className="mt-3 text-sm">
          <div className="eyebrow mb-1">{t("card.zone.rejected")}</div>
          <ul className="list-disc pl-5 text-text-2">{card.rejected_reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
        </div>
      )}
    </CardFrame>
  );
}

// --- route ---------------------------------------------------------------------------

function RoutePlan({ card }: { card: RoutePlanCard }) {
  const t = useT();
  const f = useFmt();
  return (
    <CardFrame title={card.title}>
      <div className="grid gap-x-8 sm:grid-cols-2">
        <div>
          <KV label={t("card.route.origin")} mono={false}>{f.raw(card.origin.name)}</KV>
          <KV label={t("card.route.destination")} mono={false}>{f.raw(card.destination.name)}</KV>
          <KV label={t("card.route.distance")}><Num v={card.total_distance_km} d={0} unit={t("unit.km")} /></KV>
          <KV label={t("card.route.hours")}><Num v={card.estimated_transit_hours} unit={t("unit.h")} /></KV>
        </div>
        <div>
          <KV label={t("card.route.risk")} mono={false}><BandChip band={card.overall_route_risk} /></KV>
          <KV label={card.crosses_protected_waters ? t("card.route.crosses") : t("card.route.clear")} mono={false}>
            <span className={card.crosses_protected_waters ? "ink-HIGH" : "ink-LOW"}>{card.crosses_protected_waters ? t("common.yes") : t("common.no")}</span>
          </KV>
          {card.protected_areas_intersected.length > 0 && (
            <KV label={t("card.geofence.zone")} mono={false}>{card.protected_areas_intersected.join(", ")}</KV>
          )}
        </div>
      </div>
      <p className="mt-3 text-sm"><span className="text-text-2">{t("card.route.action")}: </span>{f.raw(card.recommended_action)}</p>
      {card.waypoints.length > 0 && (
        <details className="mt-3">
          <summary className="text-sm text-text-2">{t("card.route.waypoints")} · <Mono>{f.int(card.waypoints.length)}</Mono></summary>
          <ol className="panel-body mt-2 space-y-1 text-sm">
            {card.waypoints.map((w, i) => (
              <li key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-hairline py-1">
                <span className="w-40 truncate">{f.raw(w.name)}</span>
                <Mono className="text-xs text-text-2">{f.coord(w.latitude, "lat")} {f.coord(w.longitude, "lon")}</Mono>
                <span className={`chip risk-${bandClass(w.segment_risk)}`}>{w.segment_risk}</span>
                <span className="text-xs text-text-2">{t("card.zone.wave")} <Num v={w.wave_height_m} unit={t("unit.m")} /></span>
                <span className="text-xs text-text-2">{t("card.zone.wind")} <Num v={w.wind_knots} d={0} unit={t("unit.kt")} /></span>
                {w.inside_restricted_zone && <span className="chip risk-SEVERE">{t("card.route.restricted")}{w.restriction_detail ? `: ${w.restriction_detail}` : ""}</span>}
              </li>
            ))}
          </ol>
        </details>
      )}
    </CardFrame>
  );
}

// --- comparison ----------------------------------------------------------------------

function ComparisonTable({ card }: { card: ComparisonTableCard }) {
  const t = useT();
  const f = useFmt();
  return (
    <CardFrame title={card.title}>
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-text-3">
          <tr>
            <th className="py-1 pr-3">{t("card.compare.metric")}</th>
            <th className="py-1 pr-3">{f.raw(card.location_a.name)}</th>
            <th className="py-1 pr-3">{f.raw(card.location_b.name)}</th>
            <th className="py-1 pr-3">{t("card.compare.difference")}</th>
            <th className="py-1 pr-3">{t("card.compare.favours")}</th>
          </tr>
        </thead>
        <tbody>
          {card.metrics.map((m, i) => (
            <tr key={i} className="border-t border-hairline">
              <td className="py-1.5 pr-3">{m.metric_name}</td>
              <td className="py-1.5 pr-3"><Num v={m.location_a_value} unit={m.unit} /></td>
              <td className="py-1.5 pr-3"><Num v={m.location_b_value} unit={m.unit} /></td>
              <td className="py-1.5 pr-3"><Num v={m.difference} unit={m.unit} /></td>
              <td className="py-1.5 pr-3">{m.favorability}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-sm">{f.raw(card.verdict_text)}</p>
    </CardFrame>
  );
}

// --- time series ---------------------------------------------------------------------

function Timeseries({ card }: { card: TimeseriesChartCard }) {
  const t = useT();
  const f = useFmt();
  const pts = card.points;
  const series: { key: "wave_height_m" | "wind_knots" | "sst_c" | "risk_score"; label: string; unit: string; d: number }[] = [
    { key: "wave_height_m", label: t("card.zone.wave"), unit: t("unit.m"), d: 1 },
    { key: "wind_knots", label: t("card.zone.wind"), unit: t("unit.kt"), d: 0 },
    { key: "sst_c", label: t("card.zone.sst"), unit: t("unit.c"), d: 1 },
    { key: "risk_score", label: t("card.series.riskScore"), unit: "", d: 0 },
  ];
  return (
    <CardFrame title={card.title}>
      <p className="text-sm text-text-2">
        {t("card.series.period")}: {f.raw(card.period_description)} · {t("card.series.points", { n: f.int(pts.length) })}
      </p>
      {pts.length === 1 && <p className="mt-1 text-sm ink-MODERATE">{t("card.series.onePoint")}</p>}
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        {series.map((s) => (
          <Sparkline key={s.key} label={s.label} unit={s.unit} d={s.d} values={pts.map((p) => ({ v: p[s.key], status: p.status, source: p.source, offset: p.offset_hours }))} />
        ))}
      </div>
      <p className="mt-3 text-sm">{card.significant_change_detected ? t("card.series.change") : t("card.series.noChange")}</p>
      {card.change_reasons.length > 0 && <ul className="mt-1 list-disc pl-5 text-sm text-text-2">{card.change_reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>}
      <ul className="mt-3 space-y-1 text-xs text-text-3">
        {pts.map((p, i) => (
          <li key={i} className="flex flex-wrap gap-x-3">
            <Mono>{t("card.series.offset")} {f.int(p.offset_hours)} {t("unit.h")}</Mono>
            <span>{p.source}</span>
            <StatusChip status={p.status} />
          </li>
        ))}
      </ul>
    </CardFrame>
  );
}

function Sparkline({ label, unit, d, values }: { label: string; unit: string; d: number; values: { v: number | null; status: string; source: string; offset: number }[] }) {
  const f = useFmt();
  const nums = values.map((x) => x.v).filter((v): v is number => v !== null && Number.isFinite(v));
  const W = 260, H = 70, P = 8;
  const lo = nums.length ? Math.min(...nums) : 0;
  const hi = nums.length ? Math.max(...nums) : 1;
  const span = hi - lo || 1;
  const x = (i: number) => (values.length === 1 ? W / 2 : P + (i * (W - 2 * P)) / (values.length - 1));
  const y = (v: number) => H - P - ((v - lo) / span) * (H - 2 * P);
  const path = values.map((p, i) => (p.v === null ? null : `${x(i)},${y(p.v)}`)).filter(Boolean).join(" ");
  return (
    <figure className="surface-2 p-3">
      <figcaption className="flex items-baseline justify-between text-xs text-text-2">
        <span>{label}</span>
        <span className="mono">
          {nums.length === 0 ? <Unavailable /> : nums.length === 1 ? `${f.num(nums[0], d)} ${unit}` : `${f.num(lo, d)}–${f.num(hi, d)} ${unit}`}
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 h-16 w-full" role="img" aria-label={label}>
        {values.length > 1 && path && <polyline points={path} fill="none" stroke="var(--accent)" strokeWidth="2" />}
        {values.map((p, i) => p.v === null ? null : (
          <circle key={i} cx={x(i)} cy={y(p.v)} r="4" fill={p.status === "DEMO" ? "var(--tier-fallback)" : "var(--accent)"} />
        ))}
      </svg>
    </figure>
  );
}

// --- geofence ------------------------------------------------------------------------

function GeofenceCard({ card }: { card: GeofenceWarningCard }) {
  const t = useT();
  const f = useFmt();
  return (
    <CardFrame title={card.title} className="border-[color:var(--risk-severe)]">
      <div className="flex flex-wrap items-center gap-2"><SeverityChip severity={card.severity} /><span className="font-semibold">{f.raw(card.zone_name)}</span></div>
      <p className="mt-2 text-sm">{f.raw(card.detail)}</p>
      <div className="mt-2 grid gap-x-6 text-sm sm:grid-cols-2">
        <KV label={t("card.geofence.authority")} mono={false}>{card.authority ? card.authority : <Unavailable />}</KV>
        <KV label={t("card.geofence.restriction")} mono={false}>{card.restriction_level ? card.restriction_level : <Unavailable />}</KV>
        <KV label={t("card.zone.distance")}><Num v={card.distance_km} unit={t("unit.km")} /></KV>
        <KV label={t("card.zone.bearing")}><Num v={card.bearing_deg} d={0} unit={t("unit.deg")} /></KV>
      </div>
    </CardFrame>
  );
}

// --- advisory ------------------------------------------------------------------------

function Advisory({ card, envelope }: { card: AdvisoryTextCard; envelope: Envelope }) {
  const t = useT();
  const f = useFmt();
  const cited = new Set(card.evidence_ids);
  const providers = envelope.evidence.filter((e) => cited.has(e.id));
  return (
    <CardFrame title={card.title}>
      <p className="text-sm leading-relaxed">{f.raw(card.body)}</p>
      {providers.length === 0 && <p className="mt-2 text-xs text-text-3">{t("answer.noEvidence")}</p>}
    </CardFrame>
  );
}
