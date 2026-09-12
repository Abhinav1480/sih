"use client";

/**
 * The Leaflet map. Renders `layers[]` exactly as described: GeoJSON layers
 * inline, WMS layers through Leaflet's WMS tile layer against the URL and
 * params the response supplied, attribution shown verbatim whenever the
 * layer is on. Fishing zones are sized by rank and coloured by the
 * `advisory_status` string the backend sent; route segments are coloured by
 * `segment_risk`. The browser judges nothing.
 *
 * Client-only: import through next/dynamic with ssr: false.
 */
import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GeoFeature, Layer } from "@/lib/types";
import { useTheme } from "@/components/shell/Providers";
import { useFmt, useT } from "@/lib/i18n";

export interface LayerState {
  visible: boolean;
  opacity: number;
}

export interface MapViewProps {
  layers: Layer[];
  state: Record<number, LayerState>;
  center: { latitude: number; longitude: number } | null;
  className?: string;
  onFeature?: (layer: Layer, feature: GeoFeature) => void;
  /** Waypoint segment risks, keyed by consecutive waypoint index, to colour a route line. */
  segmentRisks?: string[];
  showScale?: boolean;
}

const OCEAN_BASE = {
  url: "https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}",
  attribution: "Esri, GEBCO, NOAA, National Geographic, DeLorme, HERE, Geonames.org, and other contributors",
  maxZoom: 13,
};

function riskVar(band: string): string {
  switch (band) {
    case "LOW": return "var(--risk-low)";
    case "MODERATE": return "var(--risk-moderate)";
    case "HIGH": return "var(--risk-high)";
    case "SEVERE": return "var(--risk-severe)";
    default: return "var(--risk-none)";
  }
}

/** Colour keyed on the advisory string the backend sent. Unknown strings get the layer colour. */
function advisoryColour(advisory: unknown, fallbackColour: string): string {
  switch (advisory) {
    case "Highly Favorable": return "var(--risk-low)";
    case "Favorable": return "var(--accent)";
    case "Marginal": return "var(--risk-moderate)";
    case "Unfavorable": return "var(--risk-high)";
    case "Restricted": return "var(--risk-severe)";
    default: return fallbackColour;
  }
}

function cssVar(name: string): string {
  if (!name.startsWith("var(")) return name;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name.slice(4, -1)).trim();
  return v || "#888";
}

export default function MapView({ layers, state, center, className = "", onFeature, segmentRisks, showScale = true }: MapViewProps) {
  const t = useT();
  const f = useFmt();
  const { theme } = useTheme();
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const base = useRef<L.TileLayer | null>(null);
  const built = useRef<Map<number, L.Layer>>(new Map());
  const scale = useRef<L.Control.Scale | null>(null);

  // Create the map once.
  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { zoomControl: false, attributionControl: false });
    L.control.zoom({ position: "bottomright" }).addTo(m);
    L.control.attribution({ position: "bottomleft", prefix: false }).addTo(m);
    m.setView([16.5, 82.5], 7);
    if (showScale) scale.current = L.control.scale({ metric: true, imperial: false, position: "bottomleft" }).addTo(m);
    map.current = m;
    const builtNow = built.current;
    return () => {
      m.remove();
      map.current = null;
      base.current = null;
      builtNow.clear();
    };
  }, [showScale]);

  // One ocean basemap; the dark theme inverts it through a CSS filter on the tile pane.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (!base.current) {
      base.current = L.tileLayer(OCEAN_BASE.url, { attribution: OCEAN_BASE.attribution, maxZoom: OCEAN_BASE.maxZoom }).addTo(m);
    }
    const pane = m.getPane("tilePane");
    if (pane) pane.style.filter = theme === "dark" ? "invert(1) hue-rotate(190deg) brightness(0.72) saturate(0.6)" : "";
  }, [theme]);

  // Centre on the answer's location.
  useEffect(() => {
    const m = map.current;
    if (!m || !center) return;
    m.setView([center.latitude, center.longitude], Math.max(m.getZoom(), 8), { animate: false });
  }, [center]);

  const signature = useMemo(() => layers.map((l, i) => `${i}:${l.id}:${l.kind}:${l.features.length}`).join("|"), [layers]);

  // Rebuild the layer stack when the layers change.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    for (const l of built.current.values()) l.remove();
    built.current.clear();
    const bounds = L.latLngBounds([]);
    const polyBounds = L.latLngBounds([]);

    layers.forEach((layer, index) => {
      let leaf: L.Layer | null = null;
      if (layer.kind === "wms" && layer.url) {
        const params: Record<string, string> = { ...layer.wms_params };
        const wmsLayers = params.layers ?? "";
        const format = params.format ?? "image/png";
        const version = params.version ?? "1.1.1";
        leaf = L.tileLayer.wms(layer.url, {
          layers: wmsLayers,
          styles: params.styles ?? "",
          format,
          transparent: params.transparent === "true",
          version,
          attribution: layer.attribution ?? undefined,
          crossOrigin: false,
        });
      } else if (layer.kind === "geojson") {
        const colour = cssVar(layer.color);
        const group = L.featureGroup();
        layer.features.forEach((feat, fi) => {
          const g = feat.geometry;
          const props = feat.properties ?? {};
          let shape: L.Layer | null = null;
          if (g.type === "Point" && Array.isArray(g.coordinates)) {
            const [lon, lat] = g.coordinates as [number, number];
            const isZone = typeof props.rank === "number";
            const isWaypoint = typeof props.risk === "string" && props.type === "route_waypoint";
            const radius = isZone ? Math.max(9, 20 - (props.rank as number) * 2) : isWaypoint ? 5 : 8;
            const fill = isZone ? cssVar(advisoryColour(props.advisory, layer.color)) : isWaypoint ? cssVar(riskVar(String(props.risk))) : colour;
            shape = L.circleMarker([lat, lon], { radius, color: fill, fillColor: fill, fillOpacity: 0.75, weight: 2 });
            if (isZone) {
              shape.bindTooltip(String(props.rank), { permanent: true, direction: "center", className: "zone-label" });
            }
            if (typeof props.radius === "number" && props.radius > 0 && !isZone && !isWaypoint) {
              const ring = L.circle([lat, lon], { radius: props.radius, color: colour, weight: 1, fillOpacity: 0.06, dashArray: "4 6" });
              group.addLayer(ring);
            }
            bounds.extend([lat, lon]);
          } else if (g.type === "Polygon" && Array.isArray(g.coordinates)) {
            const rings = (g.coordinates as number[][][]).map((ring) => ring.map(([lon, lat]) => [lat, lon] as [number, number]));
            shape = L.polygon(rings, { color: colour, weight: 1.5, fillOpacity: 0.15 });
            rings.forEach((ring) => ring.forEach((p) => polyBounds.extend(p)));
          } else if (g.type === "LineString" && Array.isArray(g.coordinates)) {
            const pts = (g.coordinates as number[][]).map(([lon, lat]) => [lat, lon] as [number, number]);
            const selected = props.is_selected === true || props.is_recommended === true;
            if (segmentRisks && segmentRisks.length && selected && pts.length === segmentRisks.length) {
              const seg = L.featureGroup();
              for (let i = 0; i < pts.length - 1; i++) {
                seg.addLayer(L.polyline([pts[i], pts[i + 1]], { color: cssVar(riskVar(segmentRisks[i])), weight: 5, opacity: 0.9 }));
              }
              shape = seg;
            } else {
              shape = L.polyline(pts, { color: colour, weight: selected ? 4 : 2.5, opacity: selected ? 0.95 : 0.6, dashArray: selected ? undefined : "6 6" });
            }
            pts.forEach((p) => bounds.extend(p));
          }
          if (shape) {
            shape.on("click", () => onFeature?.(layer, feat));
            const title = typeof props.title === "string" ? props.title : typeof props.name === "string" ? props.name : layer.name;
            shape.bindPopup(`<div class="text-sm"><strong>${escapeHtml(String(title))}</strong><div class="text-xs mt-1">${escapeHtml(layer.name)}</div></div>`);
            group.addLayer(shape);
          }
          void fi;
        });
        leaf = group;
      }
      if (leaf) built.current.set(index, leaf);
    });

    // Apply state, then fit once.
    for (const [index, leaf] of built.current) {
      const s = state[index];
      if (s?.visible) leaf.addTo(m);
      applyOpacity(leaf, s?.opacity ?? 1);
    }
    const fit = bounds.isValid() ? bounds : polyBounds;
    if (fit.isValid()) m.fitBounds(fit.pad(0.2), { animate: false, maxZoom: 10 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, theme]);

  // Visibility and opacity changes.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    for (const [index, leaf] of built.current) {
      const s = state[index];
      const on = m.hasLayer(leaf);
      if (s?.visible && !on) leaf.addTo(m);
      if (!s?.visible && on) leaf.remove();
      applyOpacity(leaf, s?.opacity ?? 1);
    }
  }, [state]);

  const attributions = layers.filter((l, i) => state[i]?.visible && l.attribution).map((l) => l.attribution as string);
  const unique = Array.from(new Set(attributions));

  return (
    <div className={`relative ${className}`}>
      <div ref={el} className="h-full w-full" role="application" aria-label={t("map.title")} />
      {unique.length > 0 && (
        <div className="pointer-events-none absolute left-2 top-2 z-[400] flex max-w-[70%] flex-wrap gap-1">
          {unique.map((a) => <span key={a} className="chip surface text-xs !font-medium">{a}</span>)}
        </div>
      )}
      <div className="pointer-events-none absolute right-2 top-2 z-[400] surface grid h-9 w-9 place-items-center text-xs font-bold" aria-hidden>
        <svg width="20" height="20" viewBox="0 0 20 20"><path d="M10 2l4 14-4-3-4 3z" fill="currentColor" /></svg>
        <span className="sr-only">{t("map.north")}</span>
      </div>
      {center && (
        <div className="pointer-events-none absolute right-2 top-12 z-[400] surface px-2 py-0.5 mono text-[11px]">
          {f.coord(center.latitude, "lat")} {f.coord(center.longitude, "lon")}
        </div>
      )}
    </div>
  );
}

function applyOpacity(leaf: L.Layer, opacity: number) {
  if (leaf instanceof L.TileLayer) leaf.setOpacity(opacity);
  else if (leaf instanceof L.FeatureGroup) leaf.eachLayer((c) => applyOpacity(c, opacity));
  else if (leaf instanceof L.Path) {
    // Scale each shape's own fill and stroke opacity; never replace them.
    const own = leaf as L.Path & { _orcaBase?: { opacity: number; fillOpacity: number } };
    if (!own._orcaBase) own._orcaBase = { opacity: leaf.options.opacity ?? 1, fillOpacity: leaf.options.fillOpacity ?? 0.2 };
    leaf.setStyle({ opacity: own._orcaBase.opacity * opacity, fillOpacity: own._orcaBase.fillOpacity * opacity });
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}
