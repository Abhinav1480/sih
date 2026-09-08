"use client";

import React from "react";
import { Waves, Bell, FileText, Globe, ShieldAlert, Sparkles } from "lucide-react";

interface HeaderProps {
  mode: string;
  activeAlertsCount: number;
  onOpenAlerts: () => void;
  onExportReport: () => void;
  selectedLanguage: string;
  onSelectLanguage: (lang: string) => void;
  hasAnalysis: boolean;
}

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "te", label: "తెలుగు (Telugu)" },
  { code: "hi", label: "हिन्दी (Hindi)" },
  { code: "ta", label: "தமிழ் (Tamil)" },
  { code: "kn", label: "ಕನ್ನಡ (Kannada)" },
  { code: "ml", label: "മലയാളം (Malayalam)" },
  { code: "mr", label: "मराठी (Marathi)" },
  { code: "bn", label: "বাংলা (Bengali)" },
  { code: "gu", label: "ગુજરાતી (Gujarati)" },
  { code: "or", label: "ଓଡ଼ିଆ (Odia)" },
];

export const Header: React.FC<HeaderProps> = ({
  mode,
  activeAlertsCount,
  onOpenAlerts,
  onExportReport,
  selectedLanguage,
  onSelectLanguage,
  hasAnalysis,
}) => {
  return (
    <header className="h-16 border-b border-orca-border bg-orca-dark/95 backdrop-blur px-4 md:px-6 flex items-center justify-between z-30 sticky top-0">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orca-blue to-orca-cyan flex items-center justify-center shadow-glow">
          <Waves className="w-6 h-6 text-orca-darkest font-bold" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-xl tracking-wider text-white">
              ORCA
            </span>
            <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-orca-cyan/10 text-orca-cyan border border-orca-cyan/30">
              SIH 2026 PS 26176
            </span>
          </div>
          <p className="text-[11px] text-orca-muted hidden sm:block">
            Marine EcOsystem Reasoning with Collaborative Agents
          </p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Mode Badge */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
            mode === "LIVE"
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              : "bg-amber-500/10 text-amber-400 border-amber-500/30"
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${mode === "LIVE" ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
          <span>{mode === "LIVE" ? "LIVE AUTHORITATIVE" : "DEMO DATA — NOT LIVE"}</span>
        </div>

        {/* Vernacular Language Selector */}
        <div className="relative flex items-center">
          <Globe className="w-4 h-4 text-orca-cyan absolute left-2.5 pointer-events-none" />
          <select
            value={selectedLanguage}
            onChange={(e) => onSelectLanguage(e.target.value)}
            className="bg-orca-card border border-orca-border text-xs rounded-lg pl-8 pr-3 py-1.5 text-orca-text focus:outline-none focus:border-orca-cyan transition cursor-pointer appearance-none"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code} className="bg-orca-card text-white">
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        {/* Active Marine Hazard Alerts Button */}
        <button
          onClick={onOpenAlerts}
          className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orca-card border border-orca-border hover:border-orca-amber text-xs font-medium text-orca-text transition hover:bg-orca-amber/10"
          title="Active Coastal Marine Alerts"
        >
          <Bell className="w-4 h-4 text-orca-amber" />
          <span className="hidden md:inline">Alerts</span>
          {activeAlertsCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-orca-red text-[10px] font-bold flex items-center justify-center text-white">
              {activeAlertsCount}
            </span>
          )}
        </button>

        {/* Export Formal Report */}
        {hasAnalysis && (
          <button
            onClick={onExportReport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orca-cyan/10 border border-orca-cyan/40 hover:bg-orca-cyan hover:text-orca-darkest text-xs font-medium text-orca-cyan transition shadow-glow"
            title="Download Formal Advisory Report"
          >
            <FileText className="w-4 h-4" />
            <span className="hidden md:inline">Export Report</span>
          </button>
        )}
      </div>
    </header>
  );
};
