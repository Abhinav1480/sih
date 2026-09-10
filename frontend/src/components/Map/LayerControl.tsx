"use client";

import React, { useState } from "react";
import {
  Layers,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  Info,
  Shield,
  Compass,
  Satellite,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  HelpCircle,
} from "lucide-react";
import { MapLayerData, LayerPurposeGroup, LayerKind, LayerStatus } from "@/lib/types";

interface LayerControlProps {
  layers: MapLayerData[];
  activeLayerIds: string[];
  onToggleLayer: (layerId: string) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  isMobile?: boolean;
}

function resolveGroup(layer: MapLayerData): LayerPurposeGroup {
  if (layer.purpose_group) return layer.purpose_group;
  const id = (layer.id || layer.layer_id || "").toLowerCase();
  const name = (layer.label || layer.name || "").toLowerCase();
  const kind = (layer.kind || layer.layer_type || "").toLowerCase();

  if (
    kind === "wms" ||
    id.includes("bhuvan") ||
    name.includes("bhuvan") ||
    id.includes("remote") ||
    layer.url
  ) {
    return "remote_gis";
  }
  if (
    id.includes("bathymetry") ||
    id.includes("boundar") ||
    id.includes("port") ||
    name.includes("bathymetry") ||
    name.includes("boundary") ||
    name.includes("port")
  ) {
    return "reference";
  }
  return "intelligence";
}

function resolveKind(layer: MapLayerData): LayerKind {
  if (layer.kind) return layer.kind;
  const t = (layer.layer_type || "").toLowerCase();
  if (t === "wms") return "wms";
  if (t === "heatmap") return "heatmap";
  if (["point", "polygon", "linestring", "choropleth", "geojson"].includes(t)) return "geojson";
  return "unsupported";
}

function resolveStatus(layer: MapLayerData): LayerStatus {
  if (layer.status) return layer.status;
  const kind = resolveKind(layer);
  if (kind === "unsupported") return "unsupported";
  // If remote WMS layer has no URL, it is unavailable
  if (kind === "wms" && (!layer.url || !layer.layer_name)) return "unavailable";
  return "ready";
}

const GROUP_CONFIG: Record<
  LayerPurposeGroup,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  intelligence: { label: "ORCA INTELLIGENCE", icon: Shield },
  reference: { label: "REFERENCE", icon: Compass },
  remote_gis: { label: "REMOTE / GIS", icon: Satellite },
};

export const LayerControl: React.FC<LayerControlProps> = ({
  layers,
  activeLayerIds,
  onToggleLayer,
  isOpen,
  onToggleOpen,
  isMobile = false,
}) => {
  const [expandedLayerId, setExpandedLayerId] = useState<string | null>(null);

  // Group the layers
  const groupedLayers = React.useMemo(() => {
    const groups: Record<LayerPurposeGroup, MapLayerData[]> = {
      intelligence: [],
      reference: [],
      remote_gis: [],
    };

    layers.forEach((layer) => {
      const group = resolveGroup(layer);
      groups[group].push(layer);
    });

    return groups;
  }, [layers]);

  // Active remote attributions
  const activeAttributions = React.useMemo(() => {
    const attrs: { name: string; attribution: string }[] = [];
    layers.forEach((l) => {
      const id = l.id || l.layer_id;
      if (activeLayerIds.includes(id) && l.attribution) {
        attrs.push({
          name: l.label || l.name,
          attribution: l.attribution,
        });
      }
    });
    return attrs;
  }, [layers, activeLayerIds]);

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={onToggleOpen}
        id="orca-layer-control-toggle"
        aria-label="Toggle map layers panel"
        className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition flex items-center gap-1.5 shadow-xs ${
          isOpen || activeLayerIds.length > 0
            ? "bg-orca-cyan/15 border-orca-cyan/40 text-orca-cyan"
            : "bg-orca-dark/90 border-orca-border text-orca-muted hover:text-white"
        }`}
        title="Toggle Marine GIS Layers"
      >
        <Layers className="w-3.5 h-3.5" />
        <span className="font-semibold tracking-wide">LAYERS</span>
        <span className="px-1.5 py-0.2 rounded bg-orca-card text-[9px] font-mono font-bold">
          {activeLayerIds.length}/{layers.length}
        </span>
      </button>

      {/* Expandable Layer Panel */}
      {isOpen && (
        <div
          className={`absolute ${
            isMobile ? "right-0 w-[calc(100vw-32px)] max-w-sm" : "right-0 w-80"
          } mt-2 bg-orca-panel/95 backdrop-blur-md border border-orca-border rounded-xl p-3 shadow-2xl space-y-3 text-xs z-30 max-h-[75vh] flex flex-col`}
          style={{ animation: "orca-fade-in 0.15s ease-out" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-orca-border flex-shrink-0">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-orca-cyan" />
              <span className="font-bold text-white text-xs tracking-wider uppercase">
                Map Layer Control
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-orca-cyan font-mono font-semibold">
                {activeLayerIds.length} visible
              </span>
              <button
                onClick={onToggleOpen}
                className="text-orca-muted hover:text-white p-0.5"
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Layer List Scrollable Container */}
          <div className="overflow-y-auto space-y-3 pr-1 flex-1">
            {layers.length === 0 ? (
              <p className="text-[11px] text-orca-muted italic py-3 text-center">
                No active GIS layers for this query.
              </p>
            ) : (
              (Object.keys(GROUP_CONFIG) as LayerPurposeGroup[]).map((groupKey) => {
                const groupList = groupedLayers[groupKey];
                if (groupList.length === 0) return null;

                const { label, icon: GroupIcon } = GROUP_CONFIG[groupKey];

                return (
                  <div key={groupKey} className="space-y-1.5">
                    {/* Purpose Group Header */}
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-orca-dim uppercase tracking-wider px-1 pt-1">
                      <GroupIcon className="w-3 h-3 text-orca-cyan" />
                      <span>{label}</span>
                      <span className="text-[9px] text-slate-500 font-mono ml-auto">
                        ({groupList.filter((l) => activeLayerIds.includes(l.id || l.layer_id)).length}/
                        {groupList.length})
                      </span>
                    </div>

                    {/* Group Items */}
                    <div className="space-y-1">
                      {groupList.map((layer) => {
                        const layerId = layer.id || layer.layer_id;
                        const isActive = activeLayerIds.includes(layerId);
                        const kind = resolveKind(layer);
                        const status = resolveStatus(layer);
                        const isExpanded = expandedLayerId === layerId;
                        const isUnsupported = kind === "unsupported";
                        const isUnavailable = status === "unavailable";

                        return (
                          <div
                            key={layerId}
                            className={`rounded-lg border transition ${
                              isActive
                                ? "bg-orca-dark/70 border-orca-border/80"
                                : "bg-orca-dark/30 border-transparent hover:border-orca-border/40"
                            }`}
                          >
                            <div className="flex items-center justify-between p-2 gap-2">
                              {/* Toggle & Color Dot */}
                              <button
                                type="button"
                                disabled={isUnsupported}
                                onClick={() => onToggleLayer(layerId)}
                                className={`flex items-center gap-2 flex-1 text-left min-w-0 ${
                                  isUnsupported ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                                }`}
                              >
                                <span
                                  className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-transform"
                                  style={{
                                    backgroundColor: layer.color || "#00f0d0",
                                    opacity: isActive ? 1 : 0.4,
                                    transform: isActive ? "scale(1.1)" : "scale(0.9)",
                                  }}
                                />
                                <div className="truncate">
                                  <div
                                    className={`text-[11px] font-medium truncate ${
                                      isActive ? "text-white" : "text-orca-muted"
                                    }`}
                                  >
                                    {layer.label || layer.name}
                                  </div>
                                  <div className="text-[9px] text-slate-400 flex items-center gap-1">
                                    <span className="font-mono uppercase">{kind}</span>
                                    {layer.time_varying && (
                                      <span className="text-cyan-400 flex items-center gap-0.5">
                                        • <Clock className="w-2.5 h-2.5" /> Temporal
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </button>

                              {/* Status Badge */}
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {status === "ready" && isActive && (
                                  <span
                                    className="text-[9px] text-emerald-400 font-mono flex items-center gap-0.5"
                                    title="Ready and active on map"
                                  >
                                    <CheckCircle2 className="w-2.5 h-2.5" />
                                  </span>
                                )}
                                {status === "loading" && (
                                  <span className="text-[9px] text-cyan-400 font-mono animate-pulse">
                                    Loading…
                                  </span>
                                )}
                                {isUnavailable && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950/60 text-amber-400 border border-amber-500/30 font-mono">
                                    Unavailable
                                  </span>
                                )}
                                {isUnsupported && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-950/60 text-rose-400 border border-rose-500/30 font-mono">
                                    Unsupported
                                  </span>
                                )}

                                {/* Visibility Toggle Eye */}
                                <button
                                  type="button"
                                  disabled={isUnsupported}
                                  onClick={() => onToggleLayer(layerId)}
                                  className={`p-1 rounded transition ${
                                    isActive
                                      ? "text-orca-cyan hover:bg-orca-cyan/10"
                                      : "text-orca-muted hover:text-white hover:bg-orca-dark"
                                  }`}
                                  title={isActive ? "Hide layer" : "Show layer"}
                                >
                                  {isActive ? (
                                    <Eye className="w-3.5 h-3.5" />
                                  ) : (
                                    <EyeOff className="w-3.5 h-3.5" />
                                  )}
                                </button>

                                {/* Metadata Details Toggle */}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedLayerId(isExpanded ? null : layerId)
                                  }
                                  className="p-1 text-slate-400 hover:text-slate-200 transition"
                                  title="View layer details"
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="w-3 h-3" />
                                  ) : (
                                    <ChevronRight className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Expanded Layer Details */}
                            {isExpanded && (
                              <div className="px-3 pb-2.5 pt-1 text-[10px] space-y-1.5 bg-orca-darkest/60 border-t border-orca-border/50 text-slate-300">
                                <div className="flex justify-between">
                                  <span className="text-orca-dim">Layer Type:</span>
                                  <span className="font-mono text-white capitalize">{kind}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-orca-dim">Temporal Mode:</span>
                                  <span className="font-mono text-white">
                                    {layer.time_varying ? "Time-Varying" : "Static Layer"}
                                  </span>
                                </div>
                                {layer.legend_title && (
                                  <div className="flex justify-between">
                                    <span className="text-orca-dim">Legend Metric:</span>
                                    <span className="text-white">
                                      {layer.legend_title}{" "}
                                      {layer.legend_unit ? `(${layer.legend_unit})` : ""}
                                    </span>
                                  </div>
                                )}
                                {layer.attribution && (
                                  <div className="pt-1 border-t border-slate-800">
                                    <span className="text-orca-dim block text-[9px] uppercase tracking-wider mb-0.5">
                                      Attribution:
                                    </span>
                                    <span className="text-slate-400 text-[10px] leading-tight">
                                      {layer.attribution}
                                    </span>
                                  </div>
                                )}
                                {layer.url && (
                                  <div className="pt-1 text-[9px] text-slate-400 truncate">
                                    <span className="text-orca-dim">Service:</span>{" "}
                                    <span className="font-mono">{layer.url}</span>
                                  </div>
                                )}
                                {isUnsupported && (
                                  <div className="pt-1 text-[10px] text-rose-400 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    <span>Layer kind '{layer.layer_type}' is unsupported.</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Attributions Footer */}
          {activeAttributions.length > 0 && (
            <div className="pt-2 border-t border-orca-border text-[9.5px] text-slate-400 space-y-1 flex-shrink-0 bg-orca-darkest/40 p-2 rounded-lg">
              <span className="font-bold uppercase tracking-wider text-[8.5px] text-orca-dim block">
                Active Layer Attribution
              </span>
              <div className="space-y-0.5 max-h-20 overflow-y-auto pr-1">
                {activeAttributions.map((item, idx) => (
                  <div key={idx} className="leading-tight">
                    <span className="text-slate-300 font-semibold">{item.name}:</span>{" "}
                    <span className="text-slate-400">{item.attribution}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
