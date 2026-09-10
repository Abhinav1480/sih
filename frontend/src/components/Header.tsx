"use client";

import React, { useState, useRef, useEffect } from "react";
import { Waves, Bell, FileText, Globe, Check, ChevronDown } from "lucide-react";

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
  { code: "te", label: "తెలుగు" },
  { code: "hi", label: "हिन्दी" },
  { code: "ta", label: "தமிழ்" },
  { code: "ml", label: "മലയാളം" },
  { code: "kn", label: "ಕನ್ನಡ" },
  { code: "bn", label: "বাংলা" },
  { code: "mr", label: "मराठी" },
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
  const [isLangOpen, setIsLangOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);
  const activeLang = LANGUAGES.find((l) => l.code === selectedLanguage) || LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsLangOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <header className="h-14 border-b border-orca-border bg-orca-darkest/95 backdrop-blur-md px-4 md:px-6 flex items-center justify-between z-30 sticky top-0">
      {/* Product & System Brand Identity (shown on small screens where sidebar is hidden) */}
      <div className="flex items-center gap-3 md:hidden">
        <div className="w-9 h-9 rounded-xl bg-orca-dark border border-orca-cyan/25 flex items-center justify-center flex-shrink-0">
          <Waves className="w-[18px] h-[18px] text-orca-cyan stroke-[2.25]" />
        </div>
        <div className="flex flex-col leading-none">
          <div className="flex items-baseline gap-2">
            <span className="font-display font-bold text-lg tracking-tight text-white">ORCA</span>
            <span className="text-[10px] font-mono text-orca-muted tracking-wide hidden sm:inline">
              SIH 2026 · PS 26176
            </span>
          </div>
          <span className="text-[10.5px] text-orca-dim tracking-wide mt-1 hidden md:inline-block">
            Marine EcOsystem Reasoning with Collaborative Agents
          </span>
        </div>
      </div>

      {/* Operational Controls & Status */}
      <div className="flex items-center gap-2 ml-auto">
        {/* System status */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-orca-border bg-orca-panel/60 text-[11px] font-medium text-slate-300">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              mode === "LIVE" ? "bg-emerald-400 animate-pulse" : "bg-emerald-400"
            }`}
          />
          <span>System Ready</span>
          <span className="text-orca-dim font-mono text-[10px] hidden lg:inline">
            · {mode === "LIVE" ? "Live Feeds" : "Demo Matrix"}
          </span>
        </div>

        {/* Language */}
        <div className="relative" ref={langDropdownRef}>
          <button
            type="button"
            id="orca-language-btn"
            onClick={() => setIsLangOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition ${
              isLangOpen
                ? "bg-orca-dark border-orca-cyan/50 text-white"
                : "bg-orca-panel/60 border-orca-border hover:border-orca-borderLight text-slate-200"
            }`}
            title="Response language"
            aria-expanded={isLangOpen}
            aria-haspopup="listbox"
          >
            <Globe className="w-3.5 h-3.5 text-orca-muted" />
            <span className="hidden sm:inline">{activeLang.label}</span>
            <ChevronDown className="w-3 h-3 text-orca-dim" />
          </button>

          {isLangOpen && (
            <div
              role="listbox"
              id="orca-language-dropdown"
              className="absolute right-0 mt-1.5 w-40 rounded-xl bg-orca-panel/98 backdrop-blur-md border border-orca-border shadow-card py-1 z-50"
            >
              {LANGUAGES.map((lang) => {
                const isSelected = selectedLanguage === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    role="option"
                    id={`orca-lang-opt-${lang.code}`}
                    aria-selected={isSelected}
                    onClick={() => {
                      onSelectLanguage(lang.code);
                      setIsLangOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition hover:bg-white/[0.05] ${
                      isSelected ? "text-orca-cyan font-semibold" : "text-slate-200"
                    }`}
                  >
                    <span className="w-3.5 flex-shrink-0">
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </span>
                    <span className="tracking-wide">{lang.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Alerts */}
        <button
          onClick={onOpenAlerts}
          className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition ${
            activeAlertsCount > 0
              ? "bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/15"
              : "bg-orca-panel/60 border-orca-border text-slate-300 hover:text-white hover:border-orca-borderLight"
          }`}
          title="Active coastal marine alerts"
        >
          <Bell className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Alerts</span>
          {activeAlertsCount > 0 && (
            <span className="min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-orca-darkest font-mono">
              {activeAlertsCount}
            </span>
          )}
        </button>

        {/* Export */}
        {hasAnalysis && (
          <button
            onClick={onExportReport}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-orca-cyan/10 border border-orca-cyan/30 hover:bg-orca-cyan/15 text-[11px] font-medium text-orca-cyan transition"
            title="Download advisory report"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Export</span>
          </button>
        )}
      </div>
    </header>
  );
};
