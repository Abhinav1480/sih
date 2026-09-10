"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Waves,
  Plus,
  MessageSquare,
  Bell,
  Database,
  Settings,
  PanelLeftOpen,
  PanelLeftClose,
} from "lucide-react";
import { ConversationSummary } from "@/lib/types";
import {
  deriveConversationTitle,
  resolveConversationTitle,
  groupConversationsByDate,
} from "@/lib/conversationTitles";

interface SidebarProps {
  conversations: ConversationSummary[];
  currentConversationId?: string;
  onSelectConversation: (id: string) => void;
  onNewAnalysis: () => void;
  onSelectPrompt?: (prompt: string) => void;
  userRole?: string;
  onSelectRole?: (role: string) => void;
  onOpenAlerts?: () => void;
  onOpenReport?: () => void;
  onOpenEvidence?: () => void;
  onOpenSettings?: () => void;
  alertsCount?: number;
}

/**
 * Console sidebar: a 56px icon rail that is always present, plus a history
 * drawer that OVERLAYS the workspace when expanded. The drawer never pushes
 * the map, so the map keeps >= 55% of the viewport at 1440px.
 */
export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewAnalysis,
  onOpenAlerts,
  onOpenEvidence,
  onOpenSettings,
  alertsCount = 0,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [resolvedTitles, setResolvedTitles] = useState<Record<string, string>>({});

  const grouped = useMemo(() => groupConversationsByDate(conversations), [conversations]);

  useEffect(() => {
    let cancelled = false;
    const updates: Record<string, string> = {};
    for (const conv of conversations) {
      updates[conv.id] = deriveConversationTitle(conv.title);
      if (!conv.title || conv.title === "Marine Decision Session") {
        resolveConversationTitle(conv).then((resolved) => {
          if (!cancelled && resolved) {
            setResolvedTitles((prev) => ({ ...prev, [conv.id]: resolved }));
          }
        });
      }
    }
    if (!cancelled) setResolvedTitles((prev) => ({ ...updates, ...prev }));
    return () => {
      cancelled = true;
    };
  }, [conversations]);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setExpanded(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [expanded]);

  const railBtn =
    "w-10 h-10 rounded-md flex items-center justify-center text-muted hover:text-text hover:bg-raised/50 transition-colors relative";

  const renderGroup = (label: string, items: ConversationSummary[]) =>
    items.length > 0 && (
      <div className="space-y-0.5">
        <div className="text-[10px] uppercase tracking-wider text-muted font-semibold px-2 pb-1">{label}</div>
        {items.map((conv) => {
          const isSelected = conv.id === currentConversationId;
          const title = resolvedTitles[conv.id] || deriveConversationTitle(conv.title);
          return (
            <button
              key={conv.id}
              type="button"
              id={`orca-conv-${conv.id}`}
              onClick={() => {
                onSelectConversation(conv.id);
                setExpanded(false);
              }}
              title={title}
              className={`w-full text-left px-2.5 py-1.5 rounded-md text-[13px] flex items-center gap-2.5 ${
                isSelected ? "bg-raised/60 text-text" : "text-muted hover:text-text hover:bg-raised/30"
              }`}
            >
              <span
                className={`w-1 rounded-full flex-shrink-0 ${isSelected ? "h-3.5 bg-accent" : "h-1 bg-muted/50"}`}
                aria-hidden="true"
              />
              <span className="truncate flex-1 leading-snug">{title}</span>
            </button>
          );
        })}
      </div>
    );

  return (
    <aside id="orca-left-sidebar" className="relative flex-shrink-0 h-screen z-40 select-none">
      {/* Icon rail */}
      <div className="w-14 h-full flex flex-col items-center py-3 gap-1 bg-panel border-r border-border-base">
        <div
          className="w-10 h-10 rounded-md border border-accent/30 bg-accent/10 flex items-center justify-center mb-2"
          title="ORCA — Marine Operations Console"
        >
          <Waves className="w-5 h-5 text-accent" />
        </div>

        <button
          type="button"
          id="orca-new-analysis-btn"
          onClick={onNewAnalysis}
          className={`${railBtn} text-accent border border-accent/30 hover:bg-accent/10`}
          title="New analysis"
          aria-label="New analysis"
        >
          <Plus className="w-[18px] h-[18px]" />
        </button>

        <button
          type="button"
          id="orca-nav-conversations"
          onClick={() => setExpanded((v) => !v)}
          className={`${railBtn} ${expanded ? "bg-raised/60 text-text" : ""}`}
          title="Conversation history"
          aria-label="Conversation history"
          aria-expanded={expanded}
        >
          <MessageSquare className="w-[18px] h-[18px]" />
          {conversations.length > 0 && (
            <span className="num absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-raised text-[9px] text-muted flex items-center justify-center border border-border-base">
              {conversations.length}
            </span>
          )}
        </button>

        <button
          type="button"
          id="orca-nav-alerts"
          onClick={onOpenAlerts}
          className={railBtn}
          title="Coastal alerts"
          aria-label="Coastal alerts"
        >
          <Bell className="w-[18px] h-[18px]" />
          {alertsCount > 0 && (
            <span className="num absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-caution text-[9px] font-semibold text-base flex items-center justify-center">
              {alertsCount}
            </span>
          )}
        </button>

        <button
          type="button"
          id="orca-util-data-evidence"
          onClick={onOpenEvidence}
          className={railBtn}
          title="Data & evidence"
          aria-label="Data & evidence"
        >
          <Database className="w-[18px] h-[18px]" />
        </button>

        <div className="mt-auto flex flex-col items-center gap-1">
          <button
            type="button"
            id="orca-util-settings"
            onClick={onOpenSettings}
            className={railBtn}
            title="Settings"
            aria-label="Settings"
          >
            <Settings className="w-[18px] h-[18px]" />
          </button>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className={railBtn}
            title={expanded ? "Collapse" : "Expand"}
            aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
          >
            {expanded ? <PanelLeftClose className="w-[18px] h-[18px]" /> : <PanelLeftOpen className="w-[18px] h-[18px]" />}
          </button>
        </div>
      </div>

      {/* History drawer — overlays the workspace, never pushes the map */}
      {expanded && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setExpanded(false)} aria-hidden="true" />
          <div className="absolute left-14 top-0 h-full w-[270px] z-40 bg-panel/95 backdrop-blur border-r border-border-base flex flex-col text-xs">
            <div className="px-4 pt-4 pb-3 border-b border-border-base">
              <div className="flex items-baseline gap-2">
                <span className="font-display font-bold text-[20px] tracking-tight text-text leading-none">ORCA</span>
                <span className="num text-[10px] text-accent/90 tracking-wider">PS 26176 · SIH 2026</span>
              </div>
              <p className="text-[11px] text-muted leading-snug mt-1.5">
                Marine EcOsystem Reasoning with Collaborative Agents
              </p>
            </div>

            <div className="px-3.5 pt-3 flex-1 min-h-0 flex flex-col">
              <div className="text-[11px] uppercase tracking-wider text-muted font-semibold px-2 mb-1">Recent</div>
              {conversations.length === 0 ? (
                <div className="px-2.5 py-5 text-[12px] text-muted leading-relaxed">
                  No analyses yet. Ask ORCA a question to begin.
                </div>
              ) : (
                <div
                  id="orca-recent-conversations-list"
                  className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1 py-1"
                >
                  {renderGroup("Today", grouped.today)}
                  {renderGroup("Yesterday", grouped.yesterday)}
                  {renderGroup("Earlier", grouped.earlier)}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </aside>
  );
};
