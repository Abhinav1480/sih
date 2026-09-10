"use client";

import React, { useState } from "react";
import { ChevronUp, ChevronDown, ListFilter } from "lucide-react";
import { MapLayerData } from "@/lib/types";

interface LayerLegendProps {
  layers: MapLayerData[];
  activeLayerIds: string[];
}

interface LegendEntry {
  id: string;
  label: string;
  type: "line" | "dashed" | "polygon" | "badge" | "circle";
  color: string;
  borderColor?: string;
  description?: string;
}

export const LayerLegend: React.FC<LayerLegendProps> = ({
  layers,
  activeLayerIds,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Compute active legend items based strictly on currently visible layers
  const activeEntries = React.useMemo(() => {
    const entries: LegendEntry[] = [];
    const activeLayers = layers.filter((l) =>
      activeLayerIds.includes(l.id || l.layer_id)
    );

    if (activeLayers.length === 0) return entries;

    const hasRoute = activeLayers.some((l) => {
      const id = (l.id || l.layer_id).toLowerCase();
      return id.includes("route") || l.features?.some((f) => f.geometry.type === "LineString" && f.properties.route_id);
    });

    if (hasRoute) {
      entries.push({
        id: "route_rec",
        label: "Recommended Route",
        type: "line",
        color: "#00f5d4",
        description: "Optimal safe passage",
      });
      entries.push({
        id: "route_alt",
        label: "Alternative Route",
        type: "dashed",
        color: "#fbbf24",
        description: "Secondary or detour corridor",
      });
    }

    const hasMpa = activeLayers.some((l) => {
      const id = (l.id || l.layer_id).toLowerCase();
      return id.includes("mpa") || id.includes("sanctuary") || l.features?.some((f) => f.properties.designation || f.properties.restriction);
    });

    if (hasMpa) {
      entries.push({
        id: "mpa",
        label: "Protected Area (MPA)",
        type: "polygon",
        color: "#f72585",
        description: "No-take / restricted zone",
      });
    }

    const hasPfz = activeLayers.some((l) => {
      const id = (l.id || l.layer_id).toLowerCase();
      return id.includes("pfz") || id.includes("fish") || l.features?.some((f) => f.properties.rank !== undefined);
    });

    if (hasPfz) {
      entries.push({
        id: "pfz",
        label: "Potential Fishing Zone",
        type: "badge",
        color: "#00f5d4",
        borderColor: "#ffffff",
        description: "Ranked PFZ hotspot (1–3)",
      });
    }

    const hasWaveOrRisk = activeLayers.some((l) => {
      const id = (l.id || l.layer_id).toLowerCase();
      return (
        id.includes("wave") ||
        id.includes("hazard") ||
        id.includes("risk") ||
        l.features?.some((f) => f.properties.wave_height_m !== undefined)
      );
    });

    if (hasWaveOrRisk) {
      entries.push({
        id: "wave_risk",
        label: "Wave / Risk Envelope",
        type: "circle",
        color: "#ff9f1c",
        description: "Sea state hazard radius",
      });
    }

    const hasDisplacement = activeLayers.some((l) => {
      const id = (l.id || l.layer_id).toLowerCase();
      return id.includes("displacement") || l.features?.some((f) => f.properties.type === "displacement_vector");
    });

    if (hasDisplacement) {
      entries.push({
        id: "displacement",
        label: "Displacement Vector",
        type: "dashed",
        color: "#ec4899",
        description: "Offset corridor",
      });
    }

    // Generic fallback for other active layers that don't match standard templates
    activeLayers.forEach((l) => {
      const id = l.id || l.layer_id;
      if (!entries.some((e) => id.includes(e.id))) {
        // If it's a distinct custom layer with a legend title
        if (l.legend_title && !entries.some((e) => e.label === l.legend_title)) {
          entries.push({
            id: id,
            label: l.legend_title,
            type: l.layer_type === "polygon" ? "polygon" : l.layer_type === "linestring" ? "line" : "circle",
            color: l.color || "#00f0d0",
            description: l.legend_unit || undefined,
          });
        }
      }
    });

    return entries;
  }, [layers, activeLayerIds]);

  if (activeEntries.length === 0) return null;

  return (
    <div
      className="absolute bottom-3 left-3 z-20 max-w-[210px] bg-orca-panel/90 backdrop-blur-md border border-orca-border/80 rounded-xl shadow-lg text-xs overflow-hidden transition-all duration-200"
      aria-label="Map Layer Legend"
    >
      {/* Header */}
      <div
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="px-2.5 py-1.5 flex items-center justify-between cursor-pointer hover:bg-orca-dark/50 select-none border-b border-orca-border/40"
      >
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-300 uppercase tracking-wider">
          <ListFilter className="w-3 h-3 text-orca-cyan" />
          <span>Legend</span>
        </div>
        <button className="text-orca-muted hover:text-white p-0.5">
          {isCollapsed ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
        </button>
      </div>

      {/* Legend Items */}
      {!isCollapsed && (
        <div className="p-2 space-y-1.5">
          {activeEntries.map((item) => (
            <div key={item.id} className="flex items-center gap-2 text-[10.5px]">
              {/* Swatch */}
              <div className="w-5 flex items-center justify-center flex-shrink-0">
                {item.type === "line" && (
                  <div
                    className="w-4 h-[3px] rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                )}
                {item.type === "dashed" && (
                  <div
                    className="w-4 h-[3px] border-t-2 border-dashed"
                    style={{ borderColor: item.color }}
                  />
                )}
                {item.type === "polygon" && (
                  <div
                    className="w-3.5 h-3 border border-dashed rounded-xs"
                    style={{
                      borderColor: item.color,
                      backgroundColor: `${item.color}33`,
                    }}
                  />
                )}
                {item.type === "badge" && (
                  <div
                    className="w-3.5 h-3.5 rounded-full border flex items-center justify-center font-bold text-[8px]"
                    style={{
                      backgroundColor: item.color,
                      borderColor: item.borderColor || "#ffffff",
                      color: "#040814",
                    }}
                  >
                    1
                  </div>
                )}
                {item.type === "circle" && (
                  <div
                    className="w-3 h-3 rounded-full border"
                    style={{
                      borderColor: item.color,
                      backgroundColor: `${item.color}40`,
                    }}
                  />
                )}
              </div>

              {/* Label */}
              <div className="min-w-0 leading-tight">
                <div className="text-slate-200 truncate">{item.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
