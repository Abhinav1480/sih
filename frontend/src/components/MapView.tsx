"use client";

import React, { useEffect, useRef, useState } from "react";
import { Layers, Eye, EyeOff, MapPin, Shield, Fish, Navigation, Info } from "lucide-react";
import { MapLayerData, VisualizationPlan } from "@/lib/types";

interface MapViewProps {
  layers: MapLayerData[];
  visualizationPlan?: VisualizationPlan;
  onCoordinateSelect?: (lat: number, lon: number) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  layers,
  visualizationPlan,
  onCoordinateSelect,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);
  const [activeLayerIds, setActiveLayerIds] = useState<string[]>([]);
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Update active layer defaults when layers change
  useEffect(() => {
    if (layers && layers.length > 0) {
      const defaults = layers.filter((l) => l.visible_by_default).map((l) => l.layer_id);
      setActiveLayerIds(defaults);
    }
  }, [layers]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!isClient || !mapContainerRef.current || mapInstanceRef.current) return;

    const L = require("leaflet");

    // Initialize map centered at India's eastern maritime coastline (Visakhapatnam default)
    const initialLat = visualizationPlan?.center_lat || 17.6868;
    const initialLon = visualizationPlan?.center_lon || 83.2185;
    const initialZoom = visualizationPlan?.default_zoom || 8;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLon],
      zoom: initialZoom,
      zoomControl: false,
    });

    // Dark Matter tiles for professional dark ocean aesthetic
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    // Zoom control in bottom right
    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Map click handler for coordinate selection
    map.on("click", (e: any) => {
      const lat = parseFloat(e.latlng.lat.toFixed(4));
      const lon = parseFloat(e.latlng.lng.toFixed(4));
      if (onCoordinateSelect) {
        onCoordinateSelect(lat, lon);
      }
    });

    const layerGroup = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    layerGroupRef.current = layerGroup;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [isClient]);

  // Center map when visualizationPlan updates
  useEffect(() => {
    if (!mapInstanceRef.current || !visualizationPlan) return;
    mapInstanceRef.current.flyTo(
      [visualizationPlan.center_lat, visualizationPlan.center_lon],
      visualizationPlan.default_zoom,
      { duration: 1.2 }
    );
  }, [visualizationPlan?.center_lat, visualizationPlan?.center_lon, visualizationPlan?.default_zoom]);

  // Render Dynamic Layers onto Leaflet Map
  useEffect(() => {
    if (!mapInstanceRef.current || !layerGroupRef.current) return;
    const L = require("leaflet");
    const group = layerGroupRef.current;
    group.clearLayers();

    layers.forEach((layer) => {
      if (!activeLayerIds.includes(layer.layer_id)) return;

      layer.features.forEach((feature) => {
        const { geometry, properties } = feature;

        // 1. POINT FEATURES (Location markers, PFZ markers, Wave centroids)
        if (geometry.type === "Point") {
          const [lon, lat] = geometry.coordinates;

          if (properties.type === "target_center") {
            // Target Location
            const circle = L.circle([lat, lon], {
              radius: (properties.radius_km || 40) * 1000,
              color: "#00f5d4",
              weight: 1.5,
              fillColor: "#00f5d4",
              fillOpacity: 0.08,
            });
            circle.bindPopup(`
              <div class="p-1 text-xs">
                <div class="font-bold text-sm text-cyan-400 mb-1">${properties.title}</div>
                <div class="text-slate-300">Coordinated Analysis Radius: ${properties.radius_km} km</div>
                <div class="text-[10px] text-slate-400 mt-1">Lat: ${lat}°N, Lon: ${lon}°E</div>
              </div>
            `);
            group.addLayer(circle);

            const marker = L.circleMarker([lat, lon], {
              radius: 8,
              color: "#ffffff",
              weight: 2,
              fillColor: "#00f5d4",
              fillOpacity: 1,
            });
            group.addLayer(marker);
          } else if (properties.zone_id) {
            // Potential Fishing Zone Marker
            const marker = L.circleMarker([lat, lon], {
              radius: 7,
              color: properties.within_mpa ? "#e63946" : "#4cc9f0",
              weight: 2,
              fillColor: properties.within_mpa ? "#e63946" : "#2ec4b6",
              fillOpacity: 0.85,
            });
            marker.bindPopup(`
              <div class="p-1 text-xs space-y-1">
                <div class="font-bold text-sm text-emerald-400">Rank #${properties.rank}: ${properties.name}</div>
                <div>Suitability: <b>${properties.suitability}/100</b></div>
                <div>Chlorophyll-a: <b>${properties.chlorophyll} mg/m³</b></div>
                <div>SST: <b>${properties.sst_c}°C</b> | Depth: <b>${properties.depth_m}m</b></div>
                ${properties.within_mpa ? '<div class="text-rose-400 font-bold">⚠️ Inside Marine Protected Area</div>' : '<div class="text-emerald-400">✓ Outside Protected Zones</div>'}
              </div>
            `);
            group.addLayer(marker);
          } else if (properties.wave_height_m) {
            // Wave hazard circle
            const circle = L.circle([lat, lon], {
              radius: properties.radius || 40000,
              color: layer.color || "#ff9f1c",
              weight: 1,
              fillColor: layer.color || "#ff9f1c",
              fillOpacity: 0.06,
            });
            circle.bindPopup(`
              <div class="p-1 text-xs">
                <div class="font-bold text-amber-400 mb-1">INCOIS Wave Energy Envelope</div>
                <div>Significant Wave Height: <b>${properties.wave_height_m}m</b></div>
                <div>Sea State: <b>${properties.sea_state}</b></div>
                <div>Hazard Category: <b>${properties.risk_level}</b></div>
              </div>
            `);
            group.addLayer(circle);
          }
        }

        // 2. POLYGON FEATURES (Marine Protected Areas & Sanctuaries)
        else if (geometry.type === "Polygon") {
          // GeoJSON polygon coords are [[lon, lat], ...] -> Leaflet expects [[lat, lon], ...]
          const rawCoords = geometry.coordinates[0];
          const latLngs = rawCoords.map((c: any) => [c[1], c[0]]);

          const poly = L.polygon(latLngs, {
            color: "#f72585",
            weight: 2,
            dashArray: "4, 4",
            fillColor: "#f72585",
            fillOpacity: 0.18,
          });
          poly.bindPopup(`
            <div class="p-1.5 text-xs max-w-xs">
              <div class="font-bold text-sm text-pink-400 mb-1">🛡️ ${properties.name}</div>
              <div class="text-[11px] text-slate-300 font-medium mb-1">${properties.designation}</div>
              <div class="text-[10px] text-amber-300 font-mono mb-1">Restriction: ${properties.restriction}</div>
              <div class="text-[11px] text-slate-400">${properties.description}</div>
              <div class="text-[9px] text-slate-500 mt-1.5">Authority: ${properties.authority}</div>
            </div>
          `);
          group.addLayer(poly);
        }

        // 3. LINESTRING FEATURES (Vessel transit passage corridors)
        else if (geometry.type === "LineString") {
          const latLngs = geometry.coordinates.map((c: any) => [c[1], c[0]]);
          const line = L.polyline(latLngs, {
            color: properties.crosses_mpa ? "#e63946" : "#00f5d4",
            weight: 3.5,
            opacity: 0.9,
          });
          line.bindPopup(`
            <div class="p-1 text-xs">
              <div class="font-bold ${properties.crosses_mpa ? 'text-rose-400' : 'text-cyan-400'} mb-1">
                Vessel Transit Passage
              </div>
              <div>Distance: <b>${properties.distance_km} km</b></div>
              <div>Crosses Sanctuaries: <b>${properties.crosses_mpa ? 'YES (HIGH RISK)' : 'NO (CLEAR)'}</b></div>
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
    <div className="relative w-full h-full min-h-[380px] bg-orca-darkest rounded-2xl overflow-hidden border border-orca-border">
      {/* Map Target Container */}
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Map Overlays: Coordinate Inspector & Click Hint */}
      <div className="absolute top-3 left-3 z-20 pointer-events-none flex items-center gap-2">
        <div className="bg-orca-card/90 backdrop-blur border border-orca-border px-3 py-1.5 rounded-lg text-[11px] text-orca-muted flex items-center gap-2 shadow-lg">
          <Info className="w-3.5 h-3.5 text-orca-cyan" />
          <span>Click any point on ocean to analyze coordinates</span>
        </div>
      </div>

      {/* Layer Switcher Floating Control */}
      <div className="absolute top-3 right-3 z-20">
        <button
          onClick={() => setShowLayerMenu(!showLayerMenu)}
          className="bg-orca-card/90 hover:bg-orca-card border border-orca-border hover:border-orca-cyan text-white p-2 rounded-xl backdrop-blur shadow-lg transition flex items-center gap-2 text-xs"
          title="Toggle Marine GIS Layers"
        >
          <Layers className="w-4 h-4 text-orca-cyan" />
          <span className="font-medium hidden sm:inline">Layers ({activeLayerIds.length})</span>
        </button>

        {showLayerMenu && (
          <div className="absolute right-0 mt-2 w-64 bg-orca-card/95 backdrop-blur border border-orca-border rounded-xl p-3 shadow-2xl space-y-2 text-xs">
            <div className="font-bold text-white uppercase tracking-wider text-[10px] text-orca-muted border-b border-orca-border pb-1.5">
              Interactive Marine Layers
            </div>
            {layers.length === 0 ? (
              <p className="text-[11px] text-orca-muted italic">No layers loaded.</p>
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
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: layer.color || "#00f5d4" }}
                      />
                      <span className="text-white text-[11px]">{layer.name}</span>
                    </div>
                    {isActive ? (
                      <Eye className="w-3.5 h-3.5 text-orca-cyan" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 text-orca-muted" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
