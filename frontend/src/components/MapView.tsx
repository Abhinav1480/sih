"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Layers,
  Eye,
  EyeOff,
  MapPin,
  Shield,
  Fish,
  Navigation,
  Info,
  Compass,
  Satellite,
  Waves,
  Map as MapIcon,
  Sun,
} from "lucide-react";
import { MapLayerData, VisualizationPlan } from "@/lib/types";

interface MapViewProps {
  layers: MapLayerData[];
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
}

// Genuinely keyless, legally compliant tile providers with ZERO watermarks
const KEYLESS_BASEMAPS = {
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

export const MapView: React.FC<MapViewProps> = ({
  layers,
  visualizationPlan,
  onCoordinateSelect,
  resizeSignal,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const overlayGroupRef = useRef<any>(null);

  const [activeLayerIds, setActiveLayerIds] = useState<string[]>([]);
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [currentBasemap, setCurrentBasemap] = useState<BasemapKey>("standard");
  const [selectedCoord, setSelectedCoord] = useState<{ lat: number; lon: number } | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Update active layer defaults when layers or visualization plan changes
  useEffect(() => {
    if (layers && layers.length > 0) {
      if (visualizationPlan?.active_layers && visualizationPlan.active_layers.length > 0) {
        // Activate all layers specified in visualization plan that exist in layers
        const planned = visualizationPlan.active_layers.filter((id) =>
          layers.some((l) => l.layer_id === id)
        );
        if (planned.length > 0) {
          setActiveLayerIds(planned);
          return;
        }
      }
      const defaults = layers.filter((l) => l.visible_by_default).map((l) => l.layer_id);
      setActiveLayerIds(defaults.length > 0 ? defaults : layers.map((l) => l.layer_id));
    }
  }, [layers, visualizationPlan]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!isClient || !mapContainerRef.current || mapInstanceRef.current) return;

    const L = require("leaflet");

    const initialLat = visualizationPlan?.center_lat || 16.5;
    const initialLon = visualizationPlan?.center_lon || 82.5;
    const initialZoom = visualizationPlan?.default_zoom || 7;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLon],
      zoom: initialZoom,
      zoomControl: false,
      attributionControl: true,
      maxZoom: 19,
    });

    const basemapConfig = KEYLESS_BASEMAPS[currentBasemap];
    const tileLayer = L.tileLayer(basemapConfig.url, basemapConfig.options).addTo(map);

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
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [isClient]);

  // Keep Leaflet's internal size in sync with its container WITHOUT ever
  // reinitializing the map. A single ResizeObserver transparently covers every
  // resize source — window resize, sidebar toggle, split-divider drag, and the
  // mobile chat/map tab switch (display none -> block) — so tiles never reset.
  useEffect(() => {
    if (!isClient || !mapContainerRef.current) return;
    if (typeof ResizeObserver === "undefined") return;

    let frame = 0;
    const observer = new ResizeObserver(() => {
      // Coalesce bursts of resize callbacks (e.g. during a divider drag) into a
      // single invalidateSize per animation frame to avoid tile flicker.
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

  // Imperative reflow hook: the parent bumps `resizeSignal` after layout shifts
  // that a ResizeObserver might not settle in time (drag end, tab reveal).
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
    const newTileLayer = L.tileLayer(config.url, config.options).addTo(map);
    tileLayerRef.current = newTileLayer;
  };

  // Center/fly map when visualizationPlan updates
  useEffect(() => {
    if (!mapInstanceRef.current || !visualizationPlan) return;
    mapInstanceRef.current.flyTo(
      [visualizationPlan.center_lat, visualizationPlan.center_lon],
      visualizationPlan.default_zoom || 7,
      { duration: 1.2 }
    );
  }, [visualizationPlan?.center_lat, visualizationPlan?.center_lon, visualizationPlan?.default_zoom]);

  // Render Dynamic GIS Overlays
  useEffect(() => {
    if (!mapInstanceRef.current || !overlayGroupRef.current) return;
    const L = require("leaflet");
    const group = overlayGroupRef.current;
    group.clearLayers();

    layers.forEach((layer) => {
      if (!activeLayerIds.includes(layer.layer_id)) return;

      layer.features.forEach((feature) => {
        const { geometry, properties } = feature;

        // 1. POINT FEATURES (Ports, Target Pin, PFZ Hotspots, Wave Centers, Route Waypoints)
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
                <div class="text-[10px] text-slate-400 font-mono">Lat: ${lat}°N, Lon: ${lon}°E</div>
              </div>
            `);
            group.addLayer(marker);
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
                <div class="text-[10px] text-slate-400 font-mono">Lat: ${lat.toFixed(4)}°N, Lon: ${lon.toFixed(4)}°E</div>
              </div>
            `);
            group.addLayer(marker);
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
                  <span>🎯 Displaced: +${properties.displacement_km || 25}km ${properties.direction || ""}</span>
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
                <div class="text-slate-300">Offset: <b>${properties.displacement_km || "--"} km</b> heading <b>${properties.direction || "--"}</b> (${properties.bearing || 0}°)</div>
                <div class="text-[10px] text-slate-400 font-mono">Lat: ${lat.toFixed(4)}°N, Lon: ${lon.toFixed(4)}°E</div>
              </div>
            `);
            group.addLayer(marker);
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
                <div class="text-[10px] text-slate-400 font-mono mt-1">Lat: ${lat}°N, Lon: ${lon}°E</div>
              </div>
            `);
            group.addLayer(circle);

            // Center Pin Marker
            const marker = L.circleMarker([lat, lon], {
              radius: 8,
              color: "#ffffff",
              weight: 2,
              fillColor: "#00f5d4",
              fillOpacity: 1,
            });
            group.addLayer(marker);
          } else if (properties.type === "route_waypoint") {
            // Segment Risk Sampling Waypoint Marker
            const isMpa = properties.inside_mpa;
            const risk = properties.risk || "LOW";
            const wpColor = isMpa ? "#e63946" : risk === "HIGH" ? "#e63946" : risk === "MODERATE" ? "#ffb703" : "#00f5d4";

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
            group.addLayer(wpMarker);
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
                    ${properties.suitability || 85}/100
                  </span>
                </div>
                <div class="grid grid-cols-2 gap-1 text-[11px] text-slate-300 pt-1">
                  <div>Chlorophyll-a: <b>${properties.chlorophyll || "1.2"} mg/m³</b></div>
                  <div>SST: <b>${properties.sst_c || "28.4"}°C</b></div>
                  <div>Depth: <b>${properties.depth_m || "35"}m</b></div>
                  <div>Distance: <b>${properties.distance_km || "--"} km</b></div>
                </div>
                ${
                  isMpa
                    ? '<div class="text-rose-400 font-bold text-[11px] bg-rose-950/60 p-1.5 rounded border border-rose-500/30">⚠️ Inside Marine Protected Area</div>'
                    : '<div class="text-emerald-400 font-medium text-[11px] bg-emerald-950/60 p-1 rounded border border-emerald-500/30">✓ Legally Open Fishing Waters</div>'
                }
              </div>
            `);
            group.addLayer(marker);
          } else if (properties.wave_height_m) {
            // Wave hazard circle
            const circle = L.circle([lat, lon], {
              radius: properties.radius || 35000,
              color: layer.color || "#ff9f1c",
              weight: 1.5,
              fillColor: layer.color || "#ff9f1c",
              fillOpacity: 0.1,
            });
            circle.bindPopup(`
              <div class="p-2 text-xs">
                <div class="font-bold text-amber-400 mb-1">🌊 INCOIS Wave Energy Envelope</div>
                <div>Significant Wave Height: <b>${properties.wave_height_m}m</b></div>
                <div>Sea State: <b>${properties.sea_state || "Moderate"}</b></div>
                <div>Hazard Category: <b>${properties.risk_level || "Medium"}</b></div>
              </div>
            `);
            group.addLayer(circle);
          }
        }

        // 2. POLYGON FEATURES (Marine Protected Areas & Sanctuaries)
        else if (geometry.type === "Polygon") {
          const rawCoords = geometry.coordinates[0];
          const latLngs = rawCoords.map((c: any) => [c[1], c[0]]);

          const poly = L.polygon(latLngs, {
            color: "#f72585",
            weight: 2,
            dashArray: "5, 5",
            fillColor: "#f72585",
            fillOpacity: 0.22,
          });
          poly.bindPopup(`
            <div class="p-2 text-xs max-w-xs space-y-1">
              <div class="font-bold text-sm text-pink-400 flex items-center gap-1.5">
                <span>🛡️ ${properties.name || "Marine Protected Area"}</span>
              </div>
              <div class="text-[11px] text-slate-300 font-medium">${properties.designation || "Wildlife Sanctuary / Reserve"}</div>
              <div class="text-[10px] text-amber-300 font-mono font-bold bg-amber-950/40 p-1 rounded border border-amber-500/30">
                Restriction: ${properties.restriction || "Strict No-Take Zone / Transit Prohibited"}
              </div>
              <div class="text-[11px] text-slate-400">${properties.description || "Critical marine ecology."}</div>
              <div class="text-[9px] text-slate-500 mt-1">Authority: ${properties.authority || "Wildlife Protection Act 1972"}</div>
            </div>
          `);
          group.addLayer(poly);
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
                <div>Bearing: <b>${properties.bearing !== undefined ? properties.bearing + "°" : "--"}</b></div>
                <div>Origin: <b>${properties.origin || "Location A"}</b></div>
              </div>
            `);
            group.addLayer(vectorLine);
            return;
          }

          const crossesMpa = properties.crosses_mpa;
          const isAlternative = properties.is_alternative;
          const isRecommended = properties.is_recommended;
          const isSelected = properties.is_selected !== undefined ? properties.is_selected : isRecommended;

          // Selected corridor is highlighted with vibrant styling; unselected corridor is dimmed/secondary for comparison
          let color = "#00f5d4";
          if (isSelected) {
            color = crossesMpa ? "#f43f5e" : isRecommended ? "#00f5d4" : "#fbbf24";
          } else {
            color = crossesMpa ? "#991b1b" : "#64748b"; // Dimmed secondary corridor
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
          group.addLayer(line);
        }
      });
    });
  }, [layers, activeLayerIds]);

  const toggleLayer = (layerId: string) => {
    setActiveLayerIds((prev) =>
      prev.includes(layerId) ? prev.filter((id) => id !== layerId) : [...prev, layerId]
    );
  };

  return (
    <div className="relative w-full h-full min-h-[400px] flex flex-col bg-orca-darkest rounded-xl overflow-hidden border border-orca-border shadow-card">
      {/* 1. Integrated Maritime Map Header Bar */}
      <div className="h-10 bg-orca-panel/90 backdrop-blur border-b border-orca-border/70 px-3 flex items-center justify-between z-20 flex-shrink-0 text-xs">
        <div className="flex items-center gap-2.5">
          {selectedCoord ? (
            <div className="text-[11px] text-slate-300 font-mono flex items-center gap-1.5">
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

        {/* Map Header Controls: Basemap & Overlays */}
        <div className="flex items-center gap-2">
          {/* Basemap Switcher */}
          <div className="bg-orca-dark/80 border border-orca-border rounded-lg p-0.5 flex items-center gap-0.5 text-[10px]">
            {(Object.keys(KEYLESS_BASEMAPS) as BasemapKey[]).map((key) => {
              const config = KEYLESS_BASEMAPS[key];
              const Icon = config.icon;
              const isActive = currentBasemap === key;
              return (
                <button
                  key={key}
                  onClick={() => switchBasemap(key)}
                  className={`px-2 py-0.5 rounded-md transition font-medium flex items-center gap-1 ${
                    isActive
                      ? "bg-orca-cyan text-orca-darkest font-bold shadow-xs"
                      : "text-orca-muted hover:text-white"
                  }`}
                  title={config.name}
                >
                  <Icon className="w-2.5 h-2.5" />
                  <span className="hidden lg:inline">{config.name}</span>
                </button>
              );
            })}
          </div>

          {/* Dynamic Layer Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowLayerMenu(!showLayerMenu)}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition flex items-center gap-1.5 ${
                showLayerMenu || activeLayerIds.length > 0
                  ? "bg-orca-cyan/15 border-orca-cyan/40 text-orca-cyan"
                  : "bg-orca-dark/80 border-orca-border text-orca-muted hover:text-white"
              }`}
              title="Toggle Marine GIS Layers"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Layers</span>
              <span className="px-1.5 py-0.2 rounded bg-orca-card text-[9px] font-mono font-bold">
                {activeLayerIds.length}
              </span>
            </button>

            {showLayerMenu && (
              <div className="absolute right-0 mt-1.5 w-64 bg-orca-panel/95 backdrop-blur-md border border-orca-border rounded-xl p-3 shadow-2xl space-y-2 text-xs z-30">
                <div className="font-bold text-white uppercase tracking-wider text-[10px] text-orca-muted border-b border-orca-border pb-1.5 flex items-center justify-between">
                  <span>Marine GIS Overlays</span>
                  <span className="text-[9px] text-orca-cyan font-mono">{activeLayerIds.length}/{layers.length}</span>
                </div>
                {layers.length === 0 ? (
                  <p className="text-[11px] text-orca-muted italic">No active GIS layers for this query.</p>
                ) : (
                  layers.map((layer) => {
                    const isActive = activeLayerIds.includes(layer.layer_id);
                    return (
                      <div
                        key={layer.layer_id}
                        onClick={() => toggleLayer(layer.layer_id)}
                        className="flex items-center justify-between p-1.5 rounded-lg hover:bg-orca-dark/70 cursor-pointer transition"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: layer.color || "#00f0d0" }}
                          />
                          <span className="text-white text-[11px]">{layer.name}</span>
                        </div>
                        {isActive ? (
                          <Eye className="w-3 h-3 text-orca-cyan" />
                        ) : (
                          <EyeOff className="w-3 h-3 text-orca-muted" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Map Target Container */}
      <div className="relative flex-1 w-full h-full min-h-[360px]">
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Clarification State: Subtle neutral "awaiting input" overlay */}
        {visualizationPlan?.result_type === "clarification" && layers.length === 0 && (
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

