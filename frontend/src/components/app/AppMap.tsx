"use client";

/**
 * The app's map: Leaflet, light basemap, the bundled tiles when offline.
 *
 * Draws exactly what it is given -- the response's geojson layers, the
 * numbered fishing zones from a pfz_ranking card, and the phone's own
 * position. WMS layers are not drawn (they need the network and a server);
 * the parent lists them as not shown. Nothing here computes anything about
 * the sea.
 */

import React, { useEffect, useRef } from "react";
import type { FishingZone, Layer } from "@/lib/contract/envelope";
import { color } from "@/lib/design/tokens";

// public/tiles/{z}/{x}/{y}.png ships in the APK (see scripts/fetch-tiles.mjs).
const LOCAL_TILE = "/tiles/{z}/{x}/{y}.png";
const LOCAL_MAX_NATIVE_ZOOM = 12;
// Esri World Ocean Base: a nautical-style chart with bathymetry, the same source the bundled
// tiles come from, so online and offline look the same. The previous Light Gray canvas was a
// deliberately featureless grey product and read as "nothing loaded" inland.
const ONLINE_TILE = "https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}";

export interface MapFocus { lat: number; lon: number; nonce: number }

interface Props {
  center: { lat: number; lon: number };
  layers: Layer[];
  visible: boolean[];
  zones: FishingZone[];
  position: { lat: number; lon: number } | null;
  focus?: MapFocus | null;
  /** A straight line from `position` to this zone, for the "show the way" action. */
  lineTo?: FishingZone | null;
  onZoneTap?: (zone: FishingZone) => void;
  onReady?: (api: { zoomIn: () => void; north: () => void; flyTo: (p: { lat: number; lon: number }) => void }) => void;
  /** Fires with true when offline and the tiles in view are not in the bundle (the map would be blank). */
  onCoverage?: (missing: boolean) => void;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function basemap(L: any, onCoverage?: (missing: boolean) => void) {
  const Offline = L.TileLayer.extend({
    getTileUrl(coords: any) {
      if (typeof navigator !== "undefined" && !navigator.onLine) return L.Util.template(LOCAL_TILE, coords);
      return L.TileLayer.prototype.getTileUrl.call(this, coords);
    },
  });
  const layer = new Offline(ONLINE_TILE, { maxNativeZoom: LOCAL_MAX_NATIVE_ZOOM, maxZoom: 16, attribution: "Tiles © Esri" });
  let missing = 0;
  layer.on("tileerror", (e: any) => {
    const local = L.Util.template(LOCAL_TILE, e.coords);
    if (e.tile && !e.tile.src.endsWith(local)) { e.tile.src = local; return; }
    // The bundled tile is missing too: this view has no saved map.
    missing++;
    if (missing === 1) onCoverage?.(true);
  });
  layer.on("loading", () => { missing = 0; onCoverage?.(false); });
  const redraw = () => layer.redraw();
  window.addEventListener("online", redraw);
  window.addEventListener("offline", redraw);
  layer.on("remove", () => { window.removeEventListener("online", redraw); window.removeEventListener("offline", redraw); });
  return layer;
}

export function AppMap({ center, layers, visible, zones, position, focus, lineTo, onZoneTap, onReady, onCoverage }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const Lref = useRef<any>(null);
  const overlays = useRef<any>(null);
  const posMarker = useRef<any>(null);
  const line = useRef<any>(null);
  const zoneTap = useRef(onZoneTap);
  zoneTap.current = onZoneTap;
  const coverage = useRef(onCoverage);
  coverage.current = onCoverage;

  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((mod) => {
      if (cancelled || !el.current || map.current) return;
      const L = (mod as any).default ?? mod;
      Lref.current = L;
      const m = L.map(el.current, { zoomControl: false, attributionControl: false });
      m.setView([center.lat, center.lon], 9);
      basemap(L, (missing) => coverage.current?.(missing)).addTo(m);
      overlays.current = L.layerGroup().addTo(m);
      map.current = m;
      onReady?.({ zoomIn: () => m.zoomIn(), north: () => m.setView([center.lat, center.lon], 9), flyTo: (p) => m.flyTo([p.lat, p.lon], 10, { duration: 0.6 }) });
      setTimeout(() => m.invalidateSize(), 50);
    });
    return () => { cancelled = true; map.current?.remove(); map.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Layers and zones: redraw when the answer or the toggles change.
  useEffect(() => {
    const L = Lref.current, m = map.current, g = overlays.current;
    if (!L || !m || !g) return;
    g.clearLayers();
    layers.forEach((layer, i) => {
      if (!visible[i] || layer.kind !== "geojson" || !layer.features?.length) return;
      const hex = typeof layer.color === "string" && layer.color ? layer.color : color.sea;
      L.geoJSON({ type: "FeatureCollection", features: layer.features }, {
        style: () => ({ color: hex, weight: 1.6, dashArray: "6 5", fillColor: hex, fillOpacity: 0.10 }),
        pointToLayer: (_f: any, latlng: any) => L.circleMarker(latlng, { radius: 5, color: hex, weight: 1.5, fillColor: hex, fillOpacity: 0.6 }),
      }).addTo(g);
    });
    zones.forEach((z) => {
      const icon = L.divIcon({
        className: "",
        iconSize: [34, 34], iconAnchor: [17, 17],
        html: `<div style="width:34px;height:34px;border-radius:50%;background:${z.within_mpa ? "#c62828" : "#1f7a4c"};color:#fff;display:flex;align-items:center;justify-content:center;font:700 15px 'JetBrains Mono',monospace;border:2px solid #fff;box-shadow:0 2px 6px rgba(18,48,58,.3)">${z.rank}</div>`,
      });
      L.marker([z.latitude, z.longitude], { icon }).on("click", () => zoneTap.current?.(z)).addTo(g);
    });
  }, [layers, visible, zones]);

  useEffect(() => {
    const L = Lref.current, m = map.current;
    if (!L || !m) return;
    if (!position) { posMarker.current?.remove(); posMarker.current = null; return; }
    const icon = L.divIcon({ className: "", iconSize: [18, 18], iconAnchor: [9, 9],
      html: `<div style="width:18px;height:18px;border-radius:50%;background:#0b6b7d;border:3px solid #fff;box-shadow:0 0 0 4px rgba(11,107,125,.25)"></div>` });
    if (!posMarker.current) posMarker.current = L.marker([position.lat, position.lon], { icon, zIndexOffset: 1000 }).addTo(m);
    else posMarker.current.setLatLng([position.lat, position.lon]);
  }, [position]);

  useEffect(() => {
    const L = Lref.current, m = map.current;
    if (!L || !m) return;
    line.current?.remove(); line.current = null;
    if (lineTo && position) {
      line.current = L.polyline([[position.lat, position.lon], [lineTo.latitude, lineTo.longitude]], { color: "#0b6b7d", weight: 3, dashArray: "8 6" }).addTo(m);
      m.fitBounds(line.current.getBounds(), { padding: [40, 40] });
    }
  }, [lineTo, position]);

  useEffect(() => {
    if (focus && map.current) map.current.flyTo([focus.lat, focus.lon], 11, { duration: 0.6 });
  }, [focus?.nonce]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={el} style={{ position: "absolute", inset: 0, background: color.mapTint }} />;
}
