"use client";

import React from "react";
import {
  PlusCircle,
  Compass,
  Fish,
  Navigation,
  GitCompare,
  History,
  ShieldCheck,
  Radio,
  ExternalLink,
  LifeBuoy
} from "lucide-react";
import { ConversationSummary } from "@/lib/types";

interface SidebarProps {
  conversations: ConversationSummary[];
  currentConversationId?: string;
  onSelectConversation: (id: string) => void;
  onNewAnalysis: () => void;
  onSelectPrompt: (prompt: string) => void;
  userRole: string;
  onSelectRole: (role: string) => void;
}

const SAMPLE_PROMPTS = [
  {
    icon: LifeBuoy,
    label: "Marine Safety",
    query: "Is it safe to go fishing tomorrow morning near Visakhapatnam?",
  },
  {
    icon: Fish,
    label: "PFZ & Chlorophyll",
    query: "Show potential fishing zones within 40 km of Visakhapatnam with favorable chlorophyll and calm waves.",
  },
  {
    icon: GitCompare,
    label: "Regional Comparison",
    query: "Compare SST, wind speed, and wave height between Chennai and Visakhapatnam.",
  },
  {
    icon: Navigation,
    label: "Vessel Passage Route",
    query: "Does this vessel route from Kakinada to Visakhapatnam cross protected waters?",
  },
  {
    icon: History,
    label: "24h Temporal Anomaly",
    query: "What changed in sea conditions over the last 24 hours near Visakhapatnam?",
  },
  {
    icon: Compass,
    label: "Telugu Vernacular",
    query: "విశాఖపట్నం దగ్గర రేపు ఉదయం సముద్ర పరిస్థితులు ఎలా ఉన్నాయి? Explain in Telugu",
  },
];

const STAKEHOLDER_ROLES = [
  "Commercial Fisherman",
  "Maritime Vessel Master",
  "Disaster Management",
  "Marine Researcher",
];

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewAnalysis,
  onSelectPrompt,
  userRole,
  onSelectRole,
}) => {
  return (
    <aside className="w-full md:w-80 flex-shrink-0 border-r border-orca-border bg-orca-dark/70 flex flex-col h-[calc(100vh-4rem)] overflow-y-auto">
      {/* New Analysis Action */}
      <div className="p-4 border-b border-orca-border">
        <button
          onClick={onNewAnalysis}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-orca-blue to-orca-cyan text-orca-darkest font-semibold text-sm hover:opacity-95 transition shadow-glow"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Marine Analysis</span>
        </button>
      </div>

      {/* Stakeholder Persona */}
      <div className="p-4 border-b border-orca-border">
        <label className="text-[11px] uppercase tracking-wider text-orca-muted font-bold block mb-2">
          Operational Persona
        </label>
        <select
          value={userRole}
          onChange={(e) => onSelectRole(e.target.value)}
          className="w-full bg-orca-card border border-orca-border text-xs rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orca-cyan transition"
        >
          {STAKEHOLDER_ROLES.map((role) => (
            <option key={role} value={role} className="bg-orca-card text-white">
              {role}
            </option>
          ))}
        </select>
      </div>

      {/* Suggested Unseen Intelligence Queries */}
      <div className="p-4 border-b border-orca-border">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] uppercase tracking-wider text-orca-muted font-bold">
            Analysis Templates
          </span>
          <span className="text-[10px] text-orca-cyan">Dynamic Engine</span>
        </div>
        <div className="space-y-1.5">
          {SAMPLE_PROMPTS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                onClick={() => onSelectPrompt(item.query)}
                className="w-full text-left p-2 rounded-lg bg-orca-card/50 hover:bg-orca-card border border-orca-border/60 hover:border-orca-cyan/40 transition group"
              >
                <div className="flex items-center gap-2 text-xs font-medium text-white group-hover:text-orca-cyan">
                  <Icon className="w-3.5 h-3.5 text-orca-teal flex-shrink-0" />
                  <span>{item.label}</span>
                </div>
                <p className="text-[11px] text-orca-muted line-clamp-1 mt-0.5 pl-5">
                  {item.query}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Session History */}
      <div className="p-4 flex-1">
        <span className="text-[11px] uppercase tracking-wider text-orca-muted font-bold block mb-3">
          Session History
        </span>
        {conversations.length === 0 ? (
          <p className="text-xs text-orca-muted/70 italic">No saved analyses yet.</p>
        ) : (
          <div className="space-y-1">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`w-full text-left p-2 rounded-lg text-xs transition line-clamp-1 ${
                  conv.id === currentConversationId
                    ? "bg-orca-cyan/15 text-orca-cyan border border-orca-cyan/30"
                    : "text-orca-muted hover:text-white hover:bg-orca-card/60"
                }`}
              >
                {conv.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Authoritative Service Health Badges */}
      <div className="p-4 border-t border-orca-border bg-orca-darkest/40 text-[11px]">
        <span className="text-[10px] uppercase font-bold text-orca-muted block mb-2">
          Data Services Telemetry
        </span>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <Radio className="w-3 h-3 animate-pulse" />
            <span>INCOIS OSF</span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-400">
            <Radio className="w-3 h-3 animate-pulse" />
            <span>IMD Mausam</span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-400">
            <ShieldCheck className="w-3 h-3" />
            <span>MoEFCC MPAs</span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-400">
            <Radio className="w-3 h-3" />
            <span>Copernicus</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
