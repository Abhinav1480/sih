"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertTriangle,
  RotateCcw,
  MessageSquare,
  Waves,
  CloudSun,
  Fish,
  Globe2,
  Navigation,
  Cpu,
} from "lucide-react";
import { TraceItem } from "@/lib/types";

interface TraceNodeProps {
  item: TraceItem;
  isLast?: boolean;
}

export const TraceNode: React.FC<TraceNodeProps> = ({ item, isLast = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isRunning = item.status === "RUNNING";
  const isCompleted = item.status === "COMPLETED";
  const isReplanned = item.status === "REPLANNED";
  const isFailed = item.status === "FAILED";

  // Dedicated Agent Icons
  const getAgentIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("ocean")) return <Waves className="w-3.5 h-3.5" />;
    if (n.includes("weather")) return <CloudSun className="w-3.5 h-3.5" />;
    if (n.includes("fishery") || n.includes("fish")) return <Fish className="w-3.5 h-3.5" />;
    if (n.includes("geo")) return <Globe2 className="w-3.5 h-3.5" />;
    if (n.includes("vessel") || n.includes("route")) return <Navigation className="w-3.5 h-3.5" />;
    return <Cpu className="w-3.5 h-3.5" />;
  };

  // Status visual configurations
  const statusConfig = {
    RUNNING: {
      bullet: (
        <div className="relative flex items-center justify-center">
          <span className="w-2.5 h-2.5 rounded-full bg-orca-cyan animate-ping opacity-75" />
          <span className="absolute w-2 h-2 rounded-full bg-orca-cyan" />
        </div>
      ),
      bulletBg: "bg-orca-dark border-orca-cyan/60 text-orca-cyan shadow-[0_0_8px_rgba(0,240,208,0.25)]",
      badge: "text-orca-cyan bg-orca-cyan/10 border-orca-cyan/30",
      label: "Analyzing...",
    },
    COMPLETED: {
      bullet: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
      bulletBg: "bg-orca-dark border-emerald-500/40 text-emerald-300",
      badge: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
      label: "✓ Completed",
    },
    REPLANNED: {
      bullet: <RotateCcw className="w-3.5 h-3.5 text-amber-400" />,
      bulletBg: "bg-orca-dark border-amber-500/40 text-amber-300",
      badge: "text-amber-300 bg-amber-500/10 border-amber-500/30",
      label: "↻ Replanned",
    },
    FAILED: {
      bullet: <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />,
      bulletBg: "bg-orca-dark border-rose-500/40 text-rose-300",
      badge: "text-rose-300 bg-rose-500/10 border-rose-500/30",
      label: "Failed",
    },
    PENDING: {
      bullet: <span className="w-2 h-2 rounded-full bg-orca-muted" />,
      bulletBg: "bg-orca-dark border-orca-border text-orca-muted",
      badge: "text-orca-muted bg-white/[0.02] border-orca-border",
      label: "Pending",
    },
  }[item.status] || {
    bullet: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
    bulletBg: "bg-orca-dark border-emerald-500/40 text-emerald-300",
    badge: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
    label: "✓ Completed",
  };

  const evidenceCount = item.evidenceIds?.length || 0;
  const durationText = item.duration_ms
    ? item.duration_ms >= 1000
      ? `${(item.duration_ms / 1000).toFixed(2)}s`
      : `${item.duration_ms}ms`
    : null;

  return (
    <div className="relative flex gap-3 group text-xs">
      {/* Vertical Hairline Guide */}
      {!isLast && (
        <div
          className={`absolute left-[11px] top-6 bottom-0 w-px transition-colors ${
            isRunning
              ? "bg-gradient-to-b from-orca-cyan/50 via-orca-border to-orca-border"
              : "bg-orca-border/70 group-hover:bg-orca-cyan/30"
          }`}
        />
      )}

      {/* Node Status Bullet */}
      <div
        className={`relative z-10 flex-shrink-0 w-[23px] h-[23px] rounded-full border flex items-center justify-center transition-all ${statusConfig.bulletBg}`}
      >
        {statusConfig.bullet}
      </div>

      {/* Card Body */}
      <div className="flex-1 pb-3 min-w-0">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          className={`w-full text-left p-2.5 rounded-lg border transition-all focus:outline-none focus:ring-1 focus:ring-orca-cyan ${
            isRunning
              ? "bg-orca-dark/90 border-orca-cyan/40 shadow-[0_0_12px_rgba(0,240,208,0.06)]"
              : "bg-orca-dark/60 border-orca-border/60 hover:border-orca-cyan/30 hover:bg-orca-dark/80"
          }`}
        >
          {/* Top Line: Agent Name + Status / Duration / Evidence */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-orca-muted">{getAgentIcon(item.agent)}</span>
              <span className="font-semibold text-white text-[11.5px] truncate">
                {item.title || item.agent}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono ${statusConfig.badge}`}>
                {statusConfig.label}
              </span>
            </div>

            <div className="flex items-center gap-2 text-orca-muted flex-shrink-0">
              {durationText && (
                <span className="text-[10px] font-mono text-orca-muted flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {durationText}
                </span>
              )}
              {evidenceCount > 0 && (
                <span className="text-[10px] font-mono text-slate-300 px-1.5 py-0.5 rounded bg-white/[0.04] border border-orca-border flex items-center gap-1">
                  <FileText className="w-2.5 h-2.5 text-orca-cyan" />
                  Evidence × {evidenceCount}
                </span>
              )}
              <span className="text-orca-dim">
                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </span>
            </div>
          </div>

          {/* Subtitle / Summary snippet */}
          <div className="mt-1 text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
            {isRunning ? (
              <span className="text-orca-cyan flex items-center gap-1.5 font-mono text-[10.5px]">
                <span className="w-1.5 h-1.5 rounded-full bg-orca-cyan animate-ping" />
                {item.summary || "Analyzing telemetry and running physical models..."}
              </span>
            ) : (
              item.summary
            )}
          </div>
        </button>

        {/* Expandable Details Drawer */}
        {isExpanded && (
          <div className="mt-2 p-2.5 rounded-lg bg-orca-darkest/75 border border-orca-border/60 space-y-2 text-[11px] font-mono">
            {/* Action / Full Summary */}
            <div>
              <span className="text-[10px] uppercase text-orca-muted tracking-wider block mb-0.5">
                Evaluation Summary
              </span>
              <div className="text-slate-200 font-sans text-[11.5px] leading-relaxed">
                {item.summary}
              </div>
            </div>

            {/* Inter-Agent Collaboration Messages */}
            {item.children && item.children.length > 0 && (
              <div className="pt-2 border-t border-orca-border/40 space-y-1.5">
                <span className="text-[10px] uppercase text-orca-muted tracking-wider block mb-1">
                  Agent Collaboration
                </span>
                {item.children.map((child) => (
                  <div
                    key={child.id}
                    className="p-1.5 rounded bg-orca-dark/80 border border-orca-border/60 flex items-start gap-1.5"
                  >
                    <MessageSquare className="w-3 h-3 text-orca-cyan mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-orca-cyan font-semibold text-[10.5px]">{child.title}: </span>
                      <span className="text-slate-300 font-sans text-[11px]">“{child.summary}”</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Evidence References */}
            {evidenceCount > 0 && (
              <div className="pt-2 border-t border-orca-border/40">
                <span className="text-[10px] uppercase text-orca-muted tracking-wider block mb-1">
                  Authoritative Evidence References ({evidenceCount})
                </span>
                <div className="flex flex-wrap gap-1">
                  {item.evidenceIds?.map((evId) => (
                    <span
                      key={evId}
                      className="px-1.5 py-0.5 rounded bg-orca-dark border border-orca-border/70 text-[10px] text-slate-300"
                    >
                      {evId}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata Badges if present */}
            {item.metadata && Object.keys(item.metadata).length > 0 && (
              <div className="pt-2 border-t border-orca-border/40 text-[10.5px] text-orca-dim flex flex-wrap gap-x-3 gap-y-1">
                {Object.entries(item.metadata)
                  .filter(([k]) => k !== "raw_summary" && k !== "summary" && k !== "evidence_ids")
                  .map(([key, val]) => (
                    <div key={key} className="flex items-center gap-1">
                      <span className="text-orca-muted">{key}:</span>
                      <span className="text-slate-300 font-medium">
                        {typeof val === "object" ? JSON.stringify(val) : String(val)}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
