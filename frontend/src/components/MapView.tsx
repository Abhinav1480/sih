"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  MapPin,
  Compass,
  Satellite,
  Navigation,
  Waves,
  Moon,
} from "lucide-react";
import { MapLayerData, VisualizationPlan, TemporalState, LayerStatus } from "@/lib/types";
import { LayerControl, LayerLegend, TimeScrubber } from "./Map";
import { P, HAIRLINE, NUM, layerIdOf } from "./Map/theme";
import { defaultOpacity } from "./Map/LayerControl";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "";
// Bootstrap view: Kakinada / central Bay of Bengal.
const BOOT_LAT = 16.9891;
const BOOT_LON = 82.2475;

interface MapViewProps {
  layers?: MapLayerData[];
  visualizationPlan?: VisualizationPlan;
  onCoordinateSelect?: (lat: number, lon: number) => void;
  /**
   * Monotonically-increasing signal bumped by the parent whenever the map's
   * available space changes for a reason a ResizeObserver may not catch
   * synchronously (split-divider drag end, mobile tab switch, sidebar toggle).
   * A change triggers Leaflet's invalidateSize() so tiles reflow without a
   * reinitialization. The map instance itself is never recreated.
   */
  resizeSignal?: number;
  /**
   * FE-04: imperative "View on map" target from the Evidence drawer. When
   * `nonce` changes, the existing map flies to the coordinate — it is never
   * remounted and no second map is created.
   */
  focusCoordinate?: { lat: number; lon: number; nonce: number };
}

// Genuinely keyless, legally compliant tile providers with ZERO watermarks
const KEYLESS_BASEMAPS = {
  dark: {
    id: "dark",
    name: "Dark",
    // CARTO dark_all now watermarks tiles without an API key; Esri's dark canvas is keyless.
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    options: {
      subdomains: [],
      attribution: "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ",
      maxZoom: 16,
    },
    icon: Moon,
  },
  standard: {
    id: "standard",
    name: "Standard",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    options: {
      subdomains: [],
      attribution:
        "Tiles &copy; Esri &mdash; Sources: Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community",
      maxZoom: 19,
    },
    icon: Compass,
  },
  satellite: {
    id: "satellite",
    name: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    options: {
      subdomains: [],
      attribution:
        "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and GIS User Community",
      maxZoom: 18,
    },
    icon: Satellite,
  },
  osm: {
    id: "osm",
    name: "Nautical / OSM",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    options: {
      subdomains: "abc",
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      maxZoom: 19,
    },
    icon: Navigation,
  },
  bathymetry: {
    id: "bathymetry",
    name: "Bathymetry",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}",
    options: {
      subdomains: [],
      attribution:
        "Tiles &copy; Esri &mdash; Sources: GEBCO, NOAA, CHS, OSU, UNH, CSUMB, National Geographic",
      maxZoom: 13,
    },
    icon: Waves,
  },
};

type BasemapKey = keyof typeof KEYLESS_BASEMAPS;

// A field the backend did not send must read as unavailable. These popups used
// to fill every gap with a plausible-looking default -- suitability 85/100,
// chlorophyll 1.2, SST 28.4, depth 35 m, "Strict No-Take Zone / Transit
// Prohibited", "Wildlife Protection Act 1972" -- so a missing field was
// indistinguishable from a measurement, and two of them invented law.
const shown = (value: unknown, unit = ""): string =>
  value === null || value === undefined || value === ""
    ? '<span class="text-slate-500 italic">unavailable</span>'
    : `${value}${unit}`;

// ── Offline basemap fallback (Track D) ──────────────────────────────────────
// public/tiles/{z}/{x}/{y}.png ships in the APK (see scripts/fetch-tiles.mjs);
// Capacitor serves the app from https://localhost, so this is a same-origin path.
const LOCAL_TILE = "/tiles/{z}/{x}/{y}.png";
// Bundle stops at z12: deeper zooms upscale z12 tiles instead of going blank.
const LOCAL_MAX_NATIVE_ZOOM = 12;

function createBasemap(L: any, config: { url: string; options: Record<string, any> }) {
  const OfflineTileLayer = L.TileLayer.extend({
    getTileUrl(coords: any) {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        return L.Util.template(LOCAL_TILE, coords);
      }
      return L.TileLayer.prototype.getTileUrl.call(this, coords);
    },
  });
  const layer = new OfflineTileLayer(config.url, {
    ...config.options,
    maxNativeZoom: LOCAL_MAX_NATIVE_ZOOM,
  });
  // Remote tile failed (captive portal, flaky signal): retry the bundled tile once.
  layer.on("tileerror", (e: any) => {
    const local = L.Util.template(LOCAL_TILE, e.coords);
    if (e.tile && !e.tile.src.endsWith(local)) e.tile.src = local;
  });
  // Re-resolve every visible tile when connectivity flips.
  const redraw = () => layer.redraw();
  window.addEventListener("online", redraw);
  window.addEventListener("offline", redraw);
  layer.on("remove", () => {
    window.removeEventListener("online", redraw);
    window.removeEventListener("offline", redraw);
  });
  return layer;
}

export const MapView: React.FC<MapViewProps> = ({
  layers: propLayers,
  visualizationPlan,
  onCoordinateSelect,
  resizeSignal,
  focusCoordinate,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const overlayGroupRef = useRef<any>(null);
  const wmsLayersRef = useRef<Map<string, any>>(new Map());
  const panesRef = useRef<Map<string, HTMLElement>>(new Map());
  const layerKeyRef = useRef<string>("");

  // Bootstrap layers shown before any query; replaced (not remounted) once a query supplies layers.
  const [bootLayers, setBootLayers] = useState<MapLayerData[]>([]);
  const hasQueryLayers = !!propLayers && propLayers.length > 0;
  const layers: MapLayerData[] = hasQueryLayers ? (propLayers as MapLayerData[]) : bootLayers;

  const [activeLayerIds, setActiveLayerIds] = useState<string[]>([]);
  const [opacities, setOpacities] = useState<Record<string, number>>({});
  const [layerStatuses, setLayerStatuses] = useState<Record<string, LayerStatus>>({});
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [currentBasemap, setCurrentBasemap] = useState<BasemapKey>("dark");
  const [selectedCoord, setSelectedCoord] = useState<{ lat: number; lon: number } | null>(null);
  const [isClient, setIsClient] = useState(false);

  // ── FE-06 TEMPORAL STATE MODEL ──────────────────────────────────────────
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [noDataForSelectedTime, setNoDataForSelectedTime] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== "undefined" && window.innerWidth >= 1024) setShowLayerMenu(true);
  }, []);

  // Fetch bootstrap layers once; any failure leaves the bare basemap (no error UI).
  useEffect(() => {
    if (hasQueryLayers) return;
    const ctrl = new AbortController();
    fetch(`${API_BASE}/api/layers?lat=${BOOT_LAT}&lon=${BOOT_LON}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (Array.isArray(d?.layers)) setBootLayers(d.layers);
      })
      .catch(() => {});
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const opacityOf = useCallback(
    (layerId: string) => {
      const l = layers.find((x) => layerIdOf(x) === layerId);
      return (opacities[layerId] ?? (l ? defaultOpacity(l) : 100)) / 100;
    },
    [layers, opacities]
  );

  // Apply opacity to live Leaflet objects: WMS tiles via setOpacity, geojson via its pane.
  useEffect(() => {
    wmsLayersRef.current.forEach((tl, id) => tl.setOpacity?.(opacityOf(id)));
    panesRef.current.forEach((pane, id) => {
      pane.style.opacity = String(opacityOf(id));
    });
  }, [opacityOf]);

  // Compute available timestamps from layers without inventing synthetic values
  const availableTimes = useMemo(() => {
    const timeSet = new Set<string>();
    layers.forEach((l) => {
      if (l.timestamps && Array.isArray(l.timestamps)) {
        l.timestamps.forEach((t) => timeSet.add(t));
      }
      if (l.temporal_features) {
        Object.keys(l.temporal_features).forEach((t) => timeSet.add(t));
      }
      l.features?.forEach((f) => {
        if (f.properties?.timestamp) timeSet.add(f.properties.timestamp);
      });
    });

    return Array.from(timeSet).sort();
  }, [layers]);

  const isTimeVarying = useMemo(() => {
    return layers.some((l) => l.time_varying) || availableTimes.length > 1;
  }, [layers, availableTimes]);

  // Synchronize selectedTime with available times
  useEffect(() => {
    if (availableTimes.length > 0) {
      if (!selectedTime || !availableTimes.includes(selectedTime)) {
        setSelectedTime(availableTimes[0]);
      }
    } else {
      setSelectedTime(null);
      setIsPlaying(false);
    }
  }, [availableTimes]);

  // Temporal state object for TimeScrubber
  const temporalState: TemporalState = useMemo(() => ({
    selectedTime,
    availableTimes,
    startTime: availableTimes.length > 0 ? availableTimes[0] : null,
    endTime: availableTimes.length > 0 ? availableTimes[availableTimes.length - 1] : null,
    isTimeVarying,
    isPlaying,
  }), [selectedTime, availableTimes, isTimeVarying, isPlaying]);

  // Manage layer visibility state cleanly across queries (Requirement 7)
  useEffect(() => {
    if (!layers || layers.length === 0) {
      setActiveLayerIds([]);
      return;
    }

    const ids = layers.map(layerIdOf);
    const key = ids.slice().sort().join("|");
    // Same id set (re-render / stream update): keep the user's toggles.
    if (key === layerKeyRef.current) return;
    layerKeyRef.current = key;

    // 1. visible_by_default from the envelope
    const defaults = layers.filter((l) => l.visible_by_default).map(layerIdOf);
    if (defaults.length > 0) {
      setActiveLayerIds(defaults);
      return;
    }
    // 2. Legacy: visualizationPlan.active_layers
    const planned = (visualizationPlan?.active_layers || []).filter((id) => ids.includes(id));
    setActiveLayerIds(planned.length > 0 ? planned : [ids[0]]);
  }, [layers, visualizationPlan]);

  // Initialize Leaflet Map — Map instance remains persistent (NEVER recreated)
  useEffect(() => {
    if (!isClient || !mapContainerRef.current || mapInstanceRef.current) return;

    const L = require("leaflet");

    const initialLat = visualizationPlan?.center_lat || 16.5;
    const initialLon = visualizationPlan?.center_lon || 83.0;
    const initialZoom = visualizationPlan?.default_zoom || 7;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLon],
      zoom: initialZoom,
      zoomControl: false,
      attributionControl: true,
      maxZoom: 19,
    });

    const basemapConfig = KEYLESS_BASEMAPS[currentBasemap];
    const tileLayer = createBasemap(L, basemapConfig).addTo(map);

    // Zoom controls in bottom right
    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Coordinate inspection on click
    map.on("click", (e: any) => {
      const lat = parseFloat(e.latlng.lat.toFixed(4));
      const lon = parseFloat(e.latlng.lng.toFixed(4));
      setSelectedCoord({ lat, lon });
      if (onCoordinateSelect) {
        onCoordinateSelect(lat, lon);
      }
    });

    const overlayGroup = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;
    tileLayerRef.current = tileLayer;
    overlayGroupRef.current = overlayGroup;

    setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      // Clean up WMS layers
      wmsLayersRef.current.forEach((layer) => {
        try {
          map.removeLayer(layer);
        } catch {}
      });
      wmsLayersRef.current.clear();

      map.remove();
      mapInstanceRef.current = null;
    };
  }, [isClient]);

  // Keep Leaflet's internal size in sync with its container WITHOUT ever reinitializing
  useEffect(() => {
    if (!isClient || !mapContainerRef.current) return;
    if (typeof ResizeObserver === "undefined") return;

    let frame = 0;
    const observer = new ResizeObserver(() => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize({ animate: false });
        }
      });
    });
    observer.observe(mapContainerRef.current);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [isClient]);

  // Imperative reflow hook for layout shifts
  useEffect(() => {
    if (resizeSignal === undefined) return;
    if (!mapInstanceRef.current) return;
    const id = requestAnimationFrame(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize({ animate: false });
      }
    });
    return () => cancelAnimationFrame(id);
  }, [resizeSignal]);

  // Handle Basemap Switch
  const switchBasemap = (key: BasemapKey) => {
    setCurrentBasemap(key);
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    const L = require("leaflet");
    const map = mapInstanceRef.current;
    map.removeLayer(tileLayerRef.current);

    const config = KEYLESS_BASEMAPS[key];
    const newTileLayer = createBasemap(L, config).addTo(map);
    tileLayerRef.current = newTileLayer;
  };

  // Fly/fit to new query content without remounting: geojson feature bounds first,
  // then the plan's centre, else keep the current view. Bootstrap layers never move the view.
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !hasQueryLayers) return;
    const L = require("leaflet");
    // ponytail: points/lines are query content, polygons are usually reference (MPAs);
    // prefer the former so a Kakinada query doesn't zoom out to the whole coast.
    const pts: [number, number][] = [];
    const polyPts: [number, number][] = [];
    const walk = (c: any, out: [number, number][]) => {
      if (!Array.isArray(c)) return;
      if (typeof c[0] === "number") out.push([c[1], c[0]]);
      else c.forEach((x) => walk(x, out));
    };
    (propLayers || []).forEach((l) =>
      l.features?.forEach((f: any) => {
        if (!f?.geometry?.coordinates) return;
        walk(f.geometry.coordinates, /polygon/i.test(f.geometry.type) ? polyPts : pts);
      })
    );
    const target = pts.length ? pts : polyPts;
    if (target.length) {
      map.flyToBounds(L.latLngBounds(target).pad(0.2), { maxZoom: 9, duration: 1.2 });
    } else if (visualizationPlan?.center_lat && visualizationPlan?.center_lon) {
      map.flyTo(
        [visualizationPlan.center_lat, visualizationPlan.center_lon],
        visualizationPlan.default_zoom || 7,
        { duration: 1.2 }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propLayers]);

  // Evidence drawer "View on map"
  useEffect(() => {
    if (!focusCoordinate || !mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo(
      [focusCoordinate.lat, focusCoordinate.lon],
      Math.max(mapInstanceRef.current.getZoom?.() || 8, 9),
      { duration: 1.0 }
    );
  }, [focusCoordinate?.nonce]);

  // ── WMS LAYER MANAGEMENT ────────────────────────────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const L = require("leaflet");
    const map = mapInstanceRef.current;

    // Prune removed WMS layers
    const activeWmsMap = wmsLayersRef.current;
    activeWmsMap.forEach((tileLayer, layerId) => {
      const isStillActive = activeLayerIds.includes(layerId);
      const existsInLayers = layers.some((l) => (l.id || l.layer_id) === layerId);
      if (!isStillActive || !existsInLayers) {
        try {
          map.removeLayer(tileLayer);
        } catch {}
        activeWmsMap.delete(layerId);
      }
    });

    // Add or update active WMS layers
    layers.forEach((layer) => {
      const layerId = layer.id || layer.layer_id;
      const kind = (layer.kind || layer.layer_type || "").toLowerCase();

      if (kind === "wms") {
        const isActive = activeLayerIds.includes(layerId);

        if (isActive && !activeWmsMap.has(layerId)) {
          // Contract 1.3.0 carries the WMS layer name inside wms_params.layers.
          const wmsLayerName = layer.layer_name || (layer.wms_params && layer.wms_params.layers);
          if (!layer.url || !wmsLayerName) {
            setLayerStatuses((prev) => ({ ...prev, [layerId]: "unavailable" }));
            return;
          }

          try {
            const wmsTileLayer = L.tileLayer.wms(layer.url, {
              layers: wmsLayerName,
              format: "image/png",
              transparent: true,
              opacity: opacityOf(layerId),
              attribution: layer.attribution || "",
              ...(layer.wms_params || {}),
            });

            // Handle WMS failures gracefully without breaking the map
            wmsTileLayer.on("tileerror", () => {
              console.warn(`[ORCA Map] Remote WMS tile load failure for layer ${layerId}`);
              setLayerStatuses((prev) => ({ ...prev, [layerId]: "unavailable" }));
            });

            wmsTileLayer.addTo(map);
            activeWmsMap.set(layerId, wmsTileLayer);
            setLayerStatuses((prev) => ({ ...prev, [layerId]: "ready" }));
          } catch (err) {
            console.error(`[ORCA Map] Error initializing WMS layer ${layerId}:`, err);
            setLayerStatuses((prev) => ({ ...prev, [layerId]: "unavailable" }));
          }
        }
      }
    });
  }, [layers, activeLayerIds]);

  // ── RENDER DYNAMIC GEOJSON & HEATMAP OVERLAYS ────────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current || !overlayGroupRef.current) return;
    const L = require("leaflet");
    const map = mapInstanceRef.current;
    const group = overlayGroupRef.current;
    group.clearLayers();

    let missingDynamicDataFound = false;

    layers.forEach((layer) => {
      const layerId = layer.id || layer.layer_id;
      if (!activeLayerIds.includes(layerId)) return;

      const kind = (layer.kind || layer.layer_type || "").toLowerCase();

      // Skip WMS layers (they are handled in the WMS effect above)
      if (kind === "wms") return;

      // One pane per layer (nested in overlayPane) so opacity is a single CSS write.
      const paneName = `orca-${layerId}`;
      let pane: HTMLElement = map.getPane(paneName);
      if (!pane) pane = map.createPane(paneName, map.getPane("overlayPane"));
      pane.style.opacity = String(opacityOf(layerId));
      panesRef.current.set(layerId, pane);
      const add = (lyr: any) => {
        lyr.options.pane = paneName;
        group.addLayer(lyr);
      };

      // Handle unsupported layer kinds gracefully
      if (kind === "unsupported" || (!layer.features && !layer.temporal_features && !layer.geojson)) {
        return;
      }

      // Determine the features for this layer at the currently selected time
      let featuresToRender: any[] = [];

      if (layer.time_varying) {
        if (layer.temporal_features && selectedTime) {
          featuresToRender = layer.temporal_features[selectedTime] || [];
        } else if (layer.features) {
          if (selectedTime) {
            featuresToRender = layer.features.filter((f) => {
              return !f.properties?.timestamp || f.properties.timestamp === selectedTime;
            });
          } else {
            featuresToRender = layer.features;
          }
        }

        if (featuresToRender.length === 0 && layer.features && layer.features.length > 0) {
          missingDynamicDataFound = true;
        }
      } else {
        featuresToRender = layer.features || (layer.geojson?.features ? layer.geojson.features : []);
      }

      // Render HEATMAP kind
      if (kind === "heatmap") {
        featuresToRender.forEach((feature) => {
          if (feature.geometry?.type === "Point") {
            const [lon, lat] = feature.geometry.coordinates;
            const weight = feature.properties?.weight || feature.properties?.intensity || 1;
            const radius = Math.min(60000, Math.max(15000, weight * 25000));

            // Outer soft glow ring
            const outerGlow = L.circle([lat, lon], {
              radius: radius * 1.5,
              color: layer.color || "#ff9f1c",
              weight: 0,
              fillColor: layer.color || "#ff9f1c",
              fillOpacity: 0.12,
            });
            add(outerGlow);

            // Core concentration circle
            const coreCircle = L.circle([lat, lon], {
              radius: radius,
              color: layer.color || "#e71d36",
              weight: 1,
              fillColor: layer.color || "#e71d36",
              fillOpacity: 0.35,
            });
            coreCircle.bindPopup(`
              <div class="p-2 text-xs space-y-1">
                <div class="font-bold text-sm text-amber-400">🔥 ${layer.name || "Heatmap Hotspot"}</div>
                <div>Density Weight: <b>${weight}</b></div>
                <div class="text-[10px] text-slate-400 num font-mono tabular-nums">Lat: ${lat}°N, Lon: ${lon}°E</div>
              </div>
            `);
            add(coreCircle);
          }
        });
        return;
      }

      // Render GEOJSON features
      featuresToRender.forEach((feature) => {
        const { geometry, properties = {} } = feature;
        if (!geometry) return;

        // 1. POINT FEATURES (Ports, Origin/Target pins, PFZ Hotspots, Wave Centers, Route Waypoints)
        if (geometry.type === "Point") {
          const [lon, lat] = geometry.coordinates;

          if (properties.type === "port_node") {
            // Port Departure / Destination Pin
            const isOrigin = properties.role === "Origin";
            const pinColor = isOrigin ? "#00f5d4" : "#ffb703";
            const customPortPin = L.divIcon({
              className: "custom-port-pin",
              html: `
                <div style="
                  background-color: ${pinColor};
                  color: #040814;
                  padding: 4px 10px;
                  border-radius: 12px;
                  display: flex;
                  align-items: center;
                  gap: 5px;
                  font-weight: 800;
                  font-size: 11px;
                  border: 2px solid #ffffff;
                  box-shadow: 0 2px 10px rgba(0,0,0,0.6);
                  white-space: nowrap;
                  cursor: pointer;
                ">
                  <span>${isOrigin ? '⚓ Departure' : '🏁 Destination'}: ${properties.name}</span>
                </div>
              `,
              iconAnchor: [45, 14],
            });

            const marker = L.marker([lat, lon], { icon: customPortPin });
            marker.bindPopup(`
              <div class="p-2 text-xs space-y-1">
                <div class="font-bold text-sm ${isOrigin ? 'text-cyan-400' : 'text-amber-400'}">
                  ${isOrigin ? '⚓ Departure Terminal' : '🏁 Destination Port'}: ${properties.name}
                </div>
                <div class="text-slate-300">Passage Endpoint Coordinate</div>
                <div class="text-[10px] text-slate-400 num font-mono tabular-nums">Lat: ${lat}°N, Lon: ${lon}°E</div>
              </div>
            `);
            add(marker);
          } else if (properties.type === "displacement_origin") {
            // Spatial What-If: Origin Marker
            const originPin = L.divIcon({
              className: "custom-origin-pin",
              html: `
                <div style="
                  background-color: #3b82f6;
                  color: #ffffff;
                  padding: 4px 10px;
                  border-radius: 12px;
                  display: flex;
                  align-items: center;
                  gap: 5px;
                  font-weight: 800;
                  font-size: 11px;
                  border: 2px solid #ffffff;
                  box-shadow: 0 2px 10px rgba(0,0,0,0.6);
                  white-space: nowrap;
                  cursor: pointer;
                ">
                  <span>📍 Origin: ${properties.label || properties.name || "A"}</span>
                </div>
              `,
              iconAnchor: [45, 14],
            });
            const marker = L.marker([lat, lon], { icon: originPin });
            marker.bindPopup(`
              <div class="p-2 text-xs space-y-1">
                <div class="font-bold text-sm text-blue-400">
                  📍 Origin Reference: ${properties.name || "Location A"}
                </div>
                <div class="text-slate-300">Displacement Baseline Point</div>
                <div class="text-[10px] text-slate-400 num font-mono tabular-nums">Lat: ${lat.toFixed(4)}°N, Lon: ${lon.toFixed(4)}°E</div>
              </div>
            `);
            add(marker);
          } else if (properties.type === "displacement_target") {
            // Spatial What-If: Displaced Target Marker
            const targetPin = L.divIcon({
              className: "custom-target-pin",
              html: `
                <div style="
                  background-color: #ec4899;
                  color: #ffffff;
                  padding: 4px 10px;
                  border-radius: 12px;
                  display: flex;
                  align-items: center;
                  gap: 5px;
                  font-weight: 800;
                  font-size: 11px;
                  border: 2px solid #ffffff;
                  box-shadow: 0 2px 12px rgba(236, 72, 153, 0.7);
                  white-space: nowrap;
                  cursor: pointer;
                ">
                  <span>🎯 Displaced: +${shown(properties.distance_km ?? properties.displacement_km, "km")} ${properties.direction || ""}</span>
                </div>
              `,
              iconAnchor: [45, 14],
            });
            const marker = L.marker([lat, lon], { icon: targetPin });
            marker.bindPopup(`
              <div class="p-2 text-xs space-y-1">
                <div class="font-bold text-sm text-pink-400">
                  🎯 Displaced Target Coordinate
                </div>
                <div class="text-slate-300">Offset: <b>${properties.distance_km || properties.displacement_km || "--"} km</b> heading <b>${properties.direction || "--"}</b> (${shown(properties.bearing_deg ?? properties.bearing, "°")})</div>
                <div class="text-[10px] text-slate-400 num font-mono tabular-nums">Lat: ${lat.toFixed(4)}°N, Lon: ${lon.toFixed(4)}°E</div>
              </div>
            `);
            add(marker);
          } else if (properties.type === "target_center") {
            // Target Center Radius Circle
            const circle = L.circle([lat, lon], {
              radius: (properties.radius_km || 40) * 1000,
              color: "#00f5d4",
              weight: 2,
              dashArray: "5, 5",
              fillColor: "#00f5d4",
              fillOpacity: 0.08,
            });
            circle.bindPopup(`
              <div class="p-2 text-xs">
                <div class="font-bold text-sm text-cyan-400 mb-1">🎯 ${properties.title || "Target Center"}</div>
                <div class="text-slate-300">Coordinated Analysis Radius: <b>${properties.radius_km || 40} km</b></div>
                <div class="text-[10px] text-slate-400 num font-mono tabular-nums mt-1">Lat: ${lat}°N, Lon: ${lon}°E</div>
              </div>
            `);
            add(circle);

            // Center Pin Marker
            const marker = L.circleMarker([lat, lon], {
              radius: 8,
              color: "#ffffff",
              weight: 2,
              fillColor: "#00f5d4",
              fillOpacity: 1,
            });
            add(marker);
          } else if (properties.type === "route_waypoint") {
            // Segment Risk Sampling Waypoint Marker
            const isMpa = properties.inside_mpa;
            const risk = properties.risk ?? null;
            // An absent risk is neutral grey, not the safe end of the scale.
            const wpColor = isMpa
              ? "#e63946"
              : risk === "HIGH" || risk === "SEVERE"
              ? "#e63946"
              : risk === "MODERATE"
              ? "#ffb703"
              : risk === "LOW"
              ? "#00f5d4"
              : "#7a94a3";

            const wpMarker = L.circleMarker([lat, lon], {
              radius: 6,
              color: "#ffffff",
              weight: 1.5,
              fillColor: wpColor,
              fillOpacity: 1,
            });
            wpMarker.bindPopup(`
              <div class="p-2 text-xs space-y-1">
                <div class="font-bold text-sm text-cyan-400">📍 ${properties.name}</div>
                <div>Hazard Level: <b style="color: ${wpColor}">${risk}</b></div>
                <div>Significant Wave: <b>${properties.wave_height_m}m</b></div>
                <div>Surface Wind: <b>${properties.wind_knots} kt</b></div>
                ${
                  isMpa
                    ? '<div class="text-rose-400 font-bold text-[10px] bg-rose-950/60 p-1 rounded border border-rose-500/30">⚠️ Intersects Marine Sanctuary</div>'
                    : '<div class="text-emerald-400 text-[10px] bg-emerald-950/60 p-1 rounded border border-emerald-500/30">✓ Open Navigation Water</div>'
                }
              </div>
            `);
            add(wpMarker);
          } else if (properties.zone_id || properties.rank !== undefined) {
            // Potential Fishing Zone Marker
            const isMpa = properties.within_mpa;
            const rank = properties.rank || 1;
            const color = isMpa ? "#e63946" : rank === 1 ? "#00f5d4" : rank === 2 ? "#48cae4" : "#ffb703";

            // Custom HTML badge marker for ranked PFZs
            const customIcon = L.divIcon({
              className: "custom-pfz-pin",
              html: `
                <div style="
                  background-color: ${color};
                  color: ${isMpa ? '#ffffff' : '#040814'};
                  width: 28px;
                  height: 28px;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-weight: 800;
                  font-size: 13px;
                  border: 2px solid #ffffff;
                  box-shadow: 0 0 12px ${color}90;
                  cursor: pointer;
                ">
                  ${rank}
                </div>
              `,
              iconSize: [28, 28],
              iconAnchor: [14, 14],
            });

            const marker = L.marker([lat, lon], { icon: customIcon });
            marker.bindPopup(`
              <div class="p-2 text-xs space-y-1.5 max-w-xs">
                <div class="font-bold text-sm ${isMpa ? 'text-rose-400' : 'text-emerald-400'} flex items-center justify-between">
                  <span>Rank #${rank}: ${properties.name || "PFZ Hotspot"}</span>
                  <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono">
                    ${shown(properties.suitability, "/100")}
                  </span>
                </div>
                <div class="grid grid-cols-2 gap-1 text-[11px] text-slate-300 pt-1">
                  <div>Chlorophyll-a: <b>${shown(properties.chlorophyll, " mg/m³")}</b></div>
                  <div>SST: <b>${shown(properties.sst_c, "°C")}</b></div>
                  <div>Depth: <b>${shown(properties.depth_m, "m")}</b></div>
                  <div>Distance: <b>${properties.distance_km || "--"} km</b></div>
                </div>
                ${
                  isMpa
                    ? '<div class="text-rose-400 font-bold text-[11px] bg-rose-950/60 p-1.5 rounded border border-rose-500/30">⚠️ Inside Marine Protected Area</div>'
                    : '<div class="text-emerald-400 font-medium text-[11px] bg-emerald-950/60 p-1 rounded border border-emerald-500/30">✓ Legally Open Fishing Waters</div>'
                }
              </div>
            `);
            add(marker);
          } else if (properties.wave_height_m !== undefined) {
            // Wave hazard circle
            const circle = L.circle([lat, lon], {
              radius: properties.radius || 35000,
              color: layer.color || "#ff9f1c",
              weight: 1.5,
              fillColor: layer.color || "#ff9f1c",
              fillOpacity: 0.12,
            });
            circle.bindPopup(`
              <div class="p-2 text-xs">
                <div class="font-bold text-amber-400 mb-1">🌊 ${shown(properties.layer_name ?? properties.name)} — wave energy</div>
                <div>Significant Wave Height: <b>${properties.wave_height_m}m</b></div>
                <div>Sea State: <b>${shown(properties.sea_state)}</b></div>
                <div>Hazard Category: <b>${shown(properties.risk_level)}</b></div>
                ${properties.timestamp ? `<div class="text-[10px] text-slate-400 num font-mono tabular-nums mt-1">Time: ${properties.timestamp}</div>` : ""}
              </div>
            `);
            add(circle);
          }
        }

        // 2. POLYGON FEATURES (Marine Protected Areas & Sanctuaries)
        else if (geometry.type === "Polygon") {
          const rawCoords = geometry.coordinates[0];
          const latLngs = rawCoords.map((c: any) => [c[1], c[0]]);

          const poly = L.polygon(latLngs, {
            color: layer.color || "#f72585",
            weight: 2,
            dashArray: "5, 5",
            fillColor: layer.color || "#f72585",
            fillOpacity: 0.22,
          });
          poly.bindPopup(`
            <div class="p-2 text-xs max-w-xs space-y-1">
              <div class="font-bold text-sm text-pink-400 flex items-center gap-1.5">
                <span>🛡️ ${properties.name || "Marine Protected Area"}</span>
              </div>
              <div class="text-[11px] text-slate-300 font-medium">${shown(properties.designation)}</div>
              <div class="text-[10px] text-amber-300 font-mono font-bold bg-amber-950/40 p-1 rounded border border-amber-500/30">
                Restriction: ${shown(properties.restriction)}
              </div>
              <div class="text-[11px] text-slate-400">${shown(properties.description)}</div>
              <div class="text-[9px] text-slate-500 mt-1">Authority: ${shown(properties.authority)}</div>
            </div>
          `);
          add(poly);
        }

        // 3. LINESTRING FEATURES (Vessel transit passage corridors & Displacement Vectors)
        else if (geometry.type === "LineString") {
          const latLngs = geometry.coordinates.map((c: any) => [c[1], c[0]]);
          const isDisplacement = properties.type === "displacement_vector" || layer.layer_id === "layer_displacement";

          if (isDisplacement) {
            const vectorLine = L.polyline(latLngs, {
              color: "#00f5d4",
              weight: 4,
              dashArray: "8, 6",
              opacity: 0.95,
            });
            vectorLine.bindPopup(`
              <div class="p-2 text-xs space-y-1 max-w-xs">
                <div class="font-bold text-sm text-cyan-400">
                  ➡️ Spatial Displacement Vector
                </div>
                <div>Distance: <b>${properties.distance_km || "--"} km</b></div>
                <div>Bearing: <b>${properties.bearing_deg !== undefined ? properties.bearing_deg + "°" : properties.bearing !== undefined ? properties.bearing + "°" : "--"}</b></div>
                <div>Origin: <b>${properties.origin || "Location A"}</b></div>
              </div>
            `);
            add(vectorLine);
            return;
          }

          const crossesMpa = properties.crosses_mpa;
          const isAlternative = properties.is_alternative;
          const isRecommended = properties.is_recommended;
          const isSelected = properties.is_selected !== undefined ? properties.is_selected : isRecommended;

          let color = "#00f5d4";
          if (isSelected) {
            color = crossesMpa ? "#f43f5e" : isRecommended ? "#00f5d4" : "#fbbf24";
          } else {
            color = crossesMpa ? "#991b1b" : "#64748b";
          }

          const line = L.polyline(latLngs, {
            color: color,
            weight: isSelected ? 5.5 : 2.8,
            dashArray: !isSelected ? "6, 6" : crossesMpa ? "8, 5" : undefined,
            opacity: isSelected ? 0.95 : 0.45,
          });
          line.bindPopup(`
            <div class="p-2 text-xs space-y-1.5 max-w-xs">
              <div class="font-bold text-sm ${isSelected ? (crossesMpa ? 'text-rose-400' : 'text-cyan-400') : 'text-slate-300'}">
                🚢 ${properties.name || "Vessel Passage Corridor"}
              </div>
              <div class="text-[11px] font-semibold flex items-center gap-1">
                ${
                  isSelected
                    ? '<span class="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">🎯 ACTIVE SELECTED CORRIDOR</span>'
                    : '<span class="px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">Secondary (Comparison Corridor)</span>'
                }
              </div>
              <div class="text-[11px]">Type: <b class="${isRecommended ? 'text-emerald-400' : 'text-amber-300'}">
                ${isRecommended ? '⭐ Recommended Safe Corridor' : 'Alternative Direct Corridor'}
              </b></div>
              <div>Total Distance: <b>${properties.distance_km || "--"} km</b></div>
              <div>Estimated Risk: <b>${properties.risk_score ? properties.risk_score + '/100' : crossesMpa ? 'High Risk' : 'Low Risk'}</b></div>
              <div>Protected Area Crossing: <b>${crossesMpa ? '⚠️ YES (SANCTUARY BREACH)' : '✓ NO (CLEAR PASSAGE)'}</b></div>
              ${properties.trade_offs ? `<div class="text-[10px] text-slate-400 pt-1 border-t border-slate-700/60">${properties.trade_offs}</div>` : ''}
            </div>
          `);
          add(line);
        }
      });
    });

    setNoDataForSelectedTime(missingDynamicDataFound);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers, activeLayerIds, selectedTime]);

  const toggleLayer = useCallback((layerId: string) => {
    setActiveLayerIds((prev) =>
      prev.includes(layerId) ? prev.filter((id) => id !== layerId) : [...prev, layerId]
    );
  }, []);

  const setLayerOpacity = useCallback((layerId: string, value: number) => {
    setOpacities((prev) => ({ ...prev, [layerId]: Math.max(0, Math.min(100, value)) }));
  }, []);

  return (
    <div
      className="relative w-full h-full min-h-[400px] flex flex-col rounded-xl overflow-hidden"
      style={{ background: P.base, border: `1px solid ${HAIRLINE}` }}
    >
      {/* 1. Integrated Maritime Map Header Bar */}
      <div
        className="h-10 px-3 flex items-center justify-between z-20 flex-shrink-0 text-xs"
        style={{ background: "rgba(10,36,50,0.85)", borderBottom: `1px solid ${HAIRLINE}`, backdropFilter: "blur(6px)" }}
      >
        <div className="flex items-center gap-2.5">
          {selectedCoord ? (
            <div className={`text-[11px] text-slate-300 ${NUM} flex items-center gap-1.5`}>
              <MapPin className="w-3 h-3 text-orca-cyan" />
              <span>{selectedCoord.lat.toFixed(3)}°N, {selectedCoord.lon.toFixed(3)}°E</span>
            </div>
          ) : (
            <span className="text-[10.5px] text-orca-dim flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-orca-dim" />
              <span className="hidden md:inline">Click map to inspect coordinates</span>
              <span className="md:hidden">Map</span>
            </span>
          )}
        </div>

        {/* Map Header Controls: Basemap & Expandable Layer Control */}
        <div className="flex items-center gap-2">
          {/* Basemap Switcher */}
          <div
            className="rounded-lg p-0.5 flex items-center gap-0.5 text-[10px]"
            style={{ background: "rgba(10,36,50,0.85)", border: `1px solid ${HAIRLINE}` }}
          >
            {(Object.keys(KEYLESS_BASEMAPS) as BasemapKey[]).map((key) => {
              const config = KEYLESS_BASEMAPS[key];
              const Icon = config.icon;
              const isActive = currentBasemap === key;
              return (
                <button
                  key={key}
                  onClick={() => switchBasemap(key)}
                  className="px-2 py-0.5 rounded-md transition font-medium flex items-center gap-1"
                  style={isActive ? { background: P.accent, color: P.base, fontWeight: 700 } : { color: P.muted }}
                  title={config.name}
                >
                  <Icon className="w-2.5 h-2.5" />
                  <span className="hidden lg:inline">{config.name}</span>
                </button>
              );
            })}
          </div>

          {/* Dynamic Layer Control Drawer / Dropdown */}
          <LayerControl
            layers={layers}
            activeLayerIds={activeLayerIds}
            onToggleLayer={toggleLayer}
            opacities={opacities}
            onOpacityChange={setLayerOpacity}
            statuses={layerStatuses}
            isOpen={showLayerMenu}
            onToggleOpen={() => setShowLayerMenu(!showLayerMenu)}
          />
        </div>
      </div>

      {/* 2. Map Target Container */}
      <div className="relative flex-1 w-full h-full min-h-[360px]">
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Compact Dynamic Legend for visible layers */}
        <LayerLegend
          layers={layers}
          activeLayerIds={activeLayerIds}
        />

        {/* Temporal Time Scrubber (only shown when data is time-varying) */}
        {isTimeVarying && (
          <TimeScrubber
            temporalState={temporalState}
            onTimeChange={(time) => setSelectedTime(time)}
            onTogglePlay={() => setIsPlaying((p) => !p)}
            noDataForSelectedTime={noDataForSelectedTime}
          />
        )}

        {/* Clarification State: Subtle neutral "awaiting input" overlay */}
        {visualizationPlan?.result_type === "clarification" && !hasQueryLayers && (
          <div className="absolute inset-0 z-15 flex items-center justify-center pointer-events-none">
            <div className="bg-orca-panel/90 backdrop-blur border border-orca-border/80 rounded-xl px-5 py-3.5 shadow-2xl text-center max-w-xs pointer-events-auto">
              <div className="flex items-center justify-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1.5">
                <Navigation className="w-3.5 h-3.5" />
                <span>Awaiting Route Coordinates</span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                Specify departure and destination ports in the query console to plot the passage corridor.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
