"use client";

import React, { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { MapLayerData } from "@/lib/types";
import { P, PANEL, HAIRLINE, layerIdOf, layerKindOf } from "./theme";

interface LayerLegendProps {
  layers: MapLayerData[];
  activeLayerIds: string[];
}

type Shape = "square" | "line" | "circle";

const shapeOf = (l: any): Shape => {
  const g = String(l.geometry_type || "").toLowerCase();
  if (g === "linestring") return "line";
  if (g === "point") return "circle";
  return "square"; // polygon, wms, unknown
};

export const LayerLegend: React.FC<LayerLegendProps> = ({ layers, activeLayerIds }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const visible = layers.filter((l) => activeLayerIds.includes(layerIdOf(l)));

  // One entry per (title, colour); two layers sharing both collapse into one row.
  const entries: { key: string; title: string; unit: string; color: string; shape: Shape }[] = [];
  visible.forEach((l) => {
    if (!l.legend_title) return;
    const color = l.color || P.accent;
    const key = `${l.legend_title}|${color}`;
    if (entries.some((e) => e.key === key)) return;
    entries.push({ key, title: l.legend_title, unit: l.legend_unit || "", color, shape: shapeOf(l) });
  });

  const attributions = Array.from(
    new Set(visible.filter((l) => layerKindOf(l) === "wms" && l.attribution).map((l) => l.attribution as string))
  );

  if (entries.length === 0 && attributions.length === 0) return null;

  return (
    <div
      className="absolute bottom-3 left-3 z-20 max-w-[230px] rounded-lg text-xs overflow-hidden"
      style={PANEL}
      aria-label="Map Layer Legend"
      id="orca-map-legend"
    >
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full px-2.5 py-1.5 flex items-center justify-between select-none"
        style={{ borderBottom: isCollapsed ? "none" : `1px solid ${HAIRLINE}` }}
        aria-expanded={!isCollapsed}
      >
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: P.text }}>
          Legend
        </span>
        {isCollapsed ? (
          <ChevronUp className="w-3 h-3" style={{ color: P.muted }} />
        ) : (
          <ChevronDown className="w-3 h-3" style={{ color: P.muted }} />
        )}
      </button>

      {!isCollapsed && (
        <div className="p-2 space-y-1.5">
          {entries.map((e) => (
            <div key={e.key} className="flex items-center gap-2 text-[10.5px]">
              <span className="w-4 flex items-center justify-center flex-shrink-0">
                {e.shape === "line" ? (
                  <span className="w-4 h-[3px] rounded-full" style={{ backgroundColor: e.color }} />
                ) : e.shape === "circle" ? (
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ border: `1.5px solid ${e.color}`, backgroundColor: `${e.color}40` }}
                  />
                ) : (
                  <span
                    className="w-3.5 h-3 rounded-sm"
                    style={{ border: `1px solid ${e.color}`, backgroundColor: `${e.color}55` }}
                  />
                )}
              </span>
              <span className="truncate" style={{ color: P.text }}>
                {e.title}
              </span>
              {e.unit && (
                <span className="ml-auto text-[9.5px] flex-shrink-0" style={{ color: P.muted }}>
                  {e.unit}
                </span>
              )}
            </div>
          ))}
          {attributions.map((a) => (
            <div
              key={a}
              className="text-[9px] pt-1.5 mt-1 leading-tight"
              style={{ color: P.muted, borderTop: `1px solid ${HAIRLINE}` }}
              data-attribution={a}
            >
              {a}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
