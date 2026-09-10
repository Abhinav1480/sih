"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Waves,
  Plus,
  MessageSquare,
  Bookmark,
  FileText,
  Bell,
  Database,
  Activity,
  Settings,
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

const WORKSPACE_NAV = [
  { key: "conversations", label: "Conversations", icon: MessageSquare },
  { key: "saved", label: "Saved Analyses", icon: Bookmark },
  { key: "reports", label: "Reports", icon: FileText },
  { key: "alerts", label: "Alerts", icon: Bell },
] as const;

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewAnalysis,
  onOpenAlerts,
  onOpenReport,
  onOpenEvidence,
  onOpenSettings,
  alertsCount = 0,
}) => {
  // Asynchronously resolved titles map (conversation ID -> derived title)
  const [resolvedTitles, setResolvedTitles] = useState<Record<string, string>>({});
  const [savedCount] = useState<number>(0);

  // Group conversations chronologically: TODAY, Yesterday, Earlier
  const grouped = useMemo(
    () => groupConversationsByDate(conversations),
    [conversations]
  );

  // Resolve titles for any conversations that have generic titles or need async fetching
  useEffect(() => {
    let isCancelled = false;

    const resolveTitles = async () => {
      const updates: Record<string, string> = {};
      for (const conv of conversations) {
        // First get synchronous heuristic title
        const immediateTitle = deriveConversationTitle(conv.title);
        updates[conv.id] = immediateTitle;

        // If it was generic "Marine Decision Session" or empty, resolve from analysis endpoint
        if (!conv.title || conv.title === "Marine Decision Session") {
          resolveConversationTitle(conv).then((resolved) => {
            if (!isCancelled && resolved) {
              setResolvedTitles((prev) => ({
                ...prev,
                [conv.id]: resolved,
              }));
            }
          });
        }
      }

      if (!isCancelled) {
        setResolvedTitles((prev) => ({ ...updates, ...prev }));
      }
    };

    resolveTitles();

    return () => {
      isCancelled = true;
    };
  }, [conversations]);

  const handleWorkspaceClick = (key: string) => {
    if (key === "alerts" && onOpenAlerts) {
      onOpenAlerts();
    } else if (key === "reports" && onOpenReport) {
      onOpenReport();
    }
  };

  return (
    <aside
      id="orca-left-sidebar"
      className="w-full md:w-64 lg:w-[270px] flex-shrink-0 border-r border-white/[0.08] bg-[#0b1329] flex flex-col h-screen overflow-hidden text-xs select-none"
    >
      {/* ==================================================
          1. ORCA HEADER & BRANDING AREA
      ================================================== */}
      <div className="px-4 pt-4 pb-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Logo Mark */}
          <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-orca-cyan/30 flex items-center justify-center flex-shrink-0 shadow-inner">
            <Waves className="w-5 h-5 text-orca-cyan stroke-[2.25]" />
          </div>

          {/* Identity & PS Code */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-[24px] tracking-tight text-white leading-none">
                ORCA
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-orca-cyan/90 tracking-wider">
                PS 26176
              </span>
            </div>
            <span className="text-[10.5px] font-mono text-slate-400 tracking-wide mt-1">
              SIH 2026
            </span>
          </div>
        </div>

        {/* Unclipped Subtitle with Clean Breathing Room */}
        <p className="text-[11px] text-slate-400 leading-snug font-normal mt-2.5">
          Marine EcOsystem Reasoning with Collaborative Agents
        </p>
      </div>

      {/* ==================================================
          2. NEW ANALYSIS BUTTON
      ================================================== */}
      <div className="px-3.5 pt-1 pb-2 flex-shrink-0">
        <button
          type="button"
          id="orca-new-analysis-btn"
          onClick={onNewAnalysis}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-lg bg-orca-cyan/[0.08] hover:bg-orca-cyan/[0.14] border border-orca-cyan/30 hover:border-orca-cyan/50 text-orca-cyan font-medium text-[13.5px] transition-all duration-150 shadow-sm group"
        >
          <Plus className="w-4 h-4 text-orca-cyan group-hover:scale-110 transition-transform duration-150" />
          <span>New Analysis</span>
        </button>
      </div>

      {/* Divider 1: Header/New Analysis -> Workspace */}
      <div className="h-[1px] bg-white/[0.06] mx-3.5 my-1.5 flex-shrink-0" />

      {/* ==================================================
          3. WORKSPACE NAVIGATION
      ================================================== */}
      <div className="px-3.5 py-1.5 flex-shrink-0">
        <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold px-2 mb-1.5">
          Workspace
        </div>
        <nav className="space-y-0.5">
          {WORKSPACE_NAV.map(({ key, label, icon: Icon }) => {
            const count =
              key === "conversations"
                ? conversations.length
                : key === "alerts"
                ? alertsCount
                : key === "saved"
                ? savedCount
                : 0;

            return (
              <button
                key={key}
                type="button"
                id={`orca-nav-${key}`}
                onClick={() => handleWorkspaceClick(key)}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/[0.04] transition text-[13.5px] group text-left"
              >
                <Icon className="w-4 h-4 text-slate-400 group-hover:text-slate-200 transition-colors flex-shrink-0" />
                <span className="flex-1 truncate">{label}</span>

                {/* Subtle Counts */}
                {key === "conversations" && count > 0 && (
                  <span className="text-[11px] text-slate-400 font-mono flex-shrink-0">
                    {count}
                  </span>
                )}

                {key === "alerts" && count > 0 && (
                  <span className="min-w-[18px] h-4 px-1.5 flex items-center justify-center rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold font-mono flex-shrink-0">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Divider 2: Workspace -> Recent */}
      <div className="h-[1px] bg-white/[0.06] mx-3.5 my-1.5 flex-shrink-0" />

      {/* ==================================================
          4 & 5. RECENT CONVERSATIONS (GROUPED & DERIVED TITLES)
      ================================================== */}
      <div className="px-3.5 pt-1.5 flex-1 min-h-0 flex flex-col">
        <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold px-2 mb-1 flex-shrink-0">
          Recent
        </div>

        {conversations.length === 0 ? (
          <div className="px-2.5 py-5 text-[12px] text-slate-400 leading-relaxed italic">
            No analyses yet. Ask ORCA a question to begin.
          </div>
        ) : (
          <div
            id="orca-recent-conversations-list"
            className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1 py-1 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.1)_transparent]"
          >
            {/* TODAY Group */}
            {grouped.today.length > 0 && (
              <div className="space-y-0.5">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold px-2 pb-1">
                  TODAY
                </div>
                {grouped.today.map((conv) => renderConversationItem(conv))}
              </div>
            )}

            {/* Yesterday Group */}
            {grouped.yesterday.length > 0 && (
              <div className="space-y-0.5">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold px-2 pt-1 pb-1">
                  Yesterday
                </div>
                {grouped.yesterday.map((conv) => renderConversationItem(conv))}
              </div>
            )}

            {/* Earlier Group */}
            {grouped.earlier.length > 0 && (
              <div className="space-y-0.5">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold px-2 pt-1 pb-1">
                  Earlier
                </div>
                {grouped.earlier.map((conv) => renderConversationItem(conv))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Divider 3: Recent -> Bottom Utilities */}
      <div className="h-[1px] bg-white/[0.06] mx-3.5 my-1.5 flex-shrink-0" />

      {/* ==================================================
          8. BOTTOM UTILITIES (FIXED / ANCHORED)
      ================================================== */}
      <div className="mt-auto flex-shrink-0 px-3.5 pb-3 pt-1 space-y-0.5 border-t border-transparent">
        {/* Data & Evidence */}
        <button
          type="button"
          id="orca-util-data-evidence"
          onClick={onOpenEvidence}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/[0.04] transition text-[13px] group text-left"
        >
          <Database className="w-4 h-4 text-slate-400 group-hover:text-slate-200 transition-colors flex-shrink-0" />
          <span className="flex-1 truncate">Data &amp; Evidence</span>
        </button>

        {/* System Status with Subtle 4/4 indicator */}
        <div
          id="orca-util-system-status"
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-slate-300 text-[13px]"
        >
          <Activity className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span className="flex-1 truncate">System Status</span>
          <span className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            4/4
          </span>
        </div>

        {/* Settings */}
        <button
          type="button"
          id="orca-util-settings"
          onClick={onOpenSettings}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/[0.04] transition text-[13px] group text-left"
        >
          <Settings className="w-4 h-4 text-slate-400 group-hover:text-slate-200 transition-colors flex-shrink-0" />
          <span className="flex-1 truncate">Settings</span>
        </button>
      </div>
    </aside>
  );

  /**
   * Helper to render a conversation item with subtle selected state
   * and concise derived title.
   */
  function renderConversationItem(conv: ConversationSummary) {
    const isSelected = conv.id === currentConversationId;
    const title = resolvedTitles[conv.id] || deriveConversationTitle(conv.title);

    return (
      <button
        key={conv.id}
        type="button"
        id={`orca-conv-${conv.id}`}
        onClick={() => onSelectConversation(conv.id)}
        title={title}
        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[13px] transition-colors flex items-center gap-2.5 group relative ${
          isSelected
            ? "bg-white/[0.07] text-white font-medium shadow-sm"
            : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]"
        }`}
      >
        {/* Subtle cyan accent indicator for active conversation */}
        {isSelected ? (
          <span
            className="w-1 h-3.5 rounded-full bg-orca-cyan flex-shrink-0 shadow-[0_0_8px_rgba(6,182,212,0.4)]"
            aria-hidden="true"
          />
        ) : (
          <span
            className="w-1 h-1 rounded-full bg-slate-600 group-hover:bg-slate-400 transition-colors flex-shrink-0 ml-0.5 mr-0.5"
            aria-hidden="true"
          />
        )}

        {/* Derived, Meaningful Conversation Title */}
        <span className="truncate flex-1 leading-snug">{title}</span>
      </button>
    );
  }
};
