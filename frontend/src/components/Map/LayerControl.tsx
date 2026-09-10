"use client";

import React from "react";
import { Layers, Eye, EyeOff } from "lucide-react";
import { MapLayerData, LayerStatus } from "@/lib/types";
import { P, PANEL, HAIRLINE, NUM, layerIdOf, layerKindOf } from "./theme";

interface LayerControlProps {
  layers: MapLayerData[];
  activeLayerIds: string[];
  onToggleLayer: (layerId: string) => void;
  opacities: Record<string, number>;
  onOpacityChange: (layerId: string, opacity: number) => void;
  statuses?: Record<string, LayerStatus>;
  isOpen: boolean;
  onToggleOpen: () => void;
  isMobile?: boolean;
}

export const defaultOpacity = (layer: any): number => (layerKindOf(layer) === "wms" ? 75 : 100);

// Tier is rendered exactly as sent; never defaulted or upgraded.
export const TierBadge: React.FC<{ tier: unknown }> = ({ tier }) => {
  const cls = "text-[9px] px-1.5 py-px rounded font-mono tracking-wide flex-shrink-0 whitespace-nowrap";
  if (tier === undefined || tier === null || tier === "") {
    return <span className={cls} style={{ color: P.muted }}>tier unknown</span>;
  }
  const t = String(tier);
  if (t === "ISRO") {
    return (
      <span className={cls} style={{ color: P.accent, border: `1px solid ${P.accent}` }} data-tier={t}>
        {t}
      </span>
    );
  }
  if (t === "NATIONAL") {
    return (
      <span className={cls} style={{ color: P.muted, border: `1px solid rgba(122,148,163,0.45)` }} data-tier={t}>
        {t}
      </span>
    );
  }
  return (
    <span className={cls} style={{ color: P.muted }} data-tier={t}>
      {t}
    </span>
  );
};

export const LayerControl: React.FC<LayerControlProps> = ({
  layers,
  activeLayerIds,
  onToggleLayer,
  opacities,
  onOpacityChange,
  statuses = {},
  isOpen,
  onToggleOpen,
  isMobile = false,
}) => {
  return (
    <div className="relative">
      <button
        onClick={onToggleOpen}
        id="orca-layer-control-toggle"
        aria-label="Toggle map layers panel"
        aria-expanded={isOpen}
        className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition flex items-center gap-1.5"
        style={{
          background: isOpen ? "rgba(56,232,208,0.12)" : "rgba(10,36,50,0.85)",
          border: `1px solid ${isOpen ? "rgba(56,232,208,0.4)" : HAIRLINE}`,
          color: isOpen ? P.accent : P.muted,
        }}
        title="Toggle map layers"
      >
        <Layers className="w-3.5 h-3.5" />
        <span className="font-semibold tracking-wide">LAYERS</span>
        <span className={`${NUM} text-[9px]`}>
          {activeLayerIds.length}/{layers.length}
        </span>
      </button>

      {isOpen && (
        <div
          id="orca-layer-control-panel"
          className={`absolute right-0 mt-2 rounded-lg p-2.5 text-xs z-30 max-h-[70vh] flex flex-col ${
            isMobile ? "w-[calc(100vw-32px)] max-w-sm" : "w-80"
          }`}
          style={PANEL}
        >
          <div
            className="flex items-center justify-between pb-2 mb-2 flex-shrink-0"
            style={{ borderBottom: `1px solid ${HAIRLINE}` }}
          >
            <span className="font-semibold text-[10.5px] tracking-wider uppercase" style={{ color: P.text }}>
              Layers
            </span>
            <span className={`${NUM} text-[10px]`} style={{ color: P.muted }}>
              {activeLayerIds.length} visible
            </span>
          </div>

          <div className="overflow-y-auto space-y-1 pr-1 flex-1">
            {layers.length === 0 ? (
              <p className="text-[11px] italic py-3 text-center" style={{ color: P.muted }}>
                No layers loaded.
              </p>
            ) : (
              layers.map((layer) => {
                const id = layerIdOf(layer);
                const active = activeLayerIds.includes(id);
                const op = opacities[id] ?? defaultOpacity(layer);
                const status = statuses[id];
                return (
                  <div
                    key={id}
                    className="rounded-md px-2 py-1.5"
                    style={{
                      background: active ? "rgba(18,56,74,0.6)" : "transparent",
                      border: `1px solid ${active ? HAIRLINE : "transparent"}`,
                    }}
                    data-layer-row={id}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        type="button"
                        onClick={() => onToggleLayer(id)}
                        className="p-0.5 rounded flex-shrink-0"
                        style={{ color: active ? P.accent : P.muted }}
                        title={active ? "Hide layer" : "Show layer"}
                        aria-pressed={active}
                      >
                        {active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                      <span
                        className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: layer.color || P.accent, opacity: active ? 1 : 0.35 }}
                      />
                      <button
                        type="button"
                        onClick={() => onToggleLayer(id)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <div
                          className="text-[11px] truncate"
                          style={{ color: active ? P.text : P.muted }}
                          title={layer.label || layer.name}
                        >
                          {layer.label || layer.name}
                        </div>
                        <div className="text-[9px] font-mono uppercase" style={{ color: P.muted }}>
                          {layerKindOf(layer) || "layer"}
                          {status === "unavailable" && (
                            <span style={{ color: P.caution }}> · unavailable</span>
                          )}
                        </div>
                      </button>
                      <TierBadge tier={(layer as any).provider_tier} />
                    </div>
                    <div className="flex items-center gap-2 mt-1 pl-6">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={op}
                        disabled={!active}
                        onChange={(e) => onOpacityChange(id, Number(e.target.value))}
                        className="flex-1 h-1 cursor-pointer"
                        style={{ accentColor: P.accent, opacity: active ? 1 : 0.4 }}
                        aria-label={`${layer.label || layer.name} opacity`}
                      />
                      <span className={`${NUM} text-[9px] w-7 text-right`} style={{ color: P.muted }}>
                        {op}%
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
