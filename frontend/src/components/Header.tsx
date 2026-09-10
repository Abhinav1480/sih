"use client";

import React, { useState, useRef, useEffect } from "react";
import { Bell, FileText, Globe, Check, ChevronDown, Anchor, LayoutDashboard, Settings } from "lucide-react";
import { BackendModeChip } from "@/components/Settings";

interface HeaderProps {
  mode: string;
  activeAlertsCount: number;
  onOpenAlerts: () => void;
  onExportReport: () => void;
  selectedLanguage: string;
  onSelectLanguage: (lang: string) => void;
  hasAnalysis: boolean;
  uiMode: "fisherman" | "console";
  onToggleUiMode: () => void;
  onOpenSettings: () => void;
}

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "te", label: "తెలుగు" },
  { code: "hi", label: "हिन्दी" },
  { code: "ta", label: "தமிழ்" },
  { code: "kn", label: "ಕನ್ನಡ" },
  { code: "ml", label: "മലയാളം" },
  { code: "mr", label: "मराठी" },
  { code: "bn", label: "বাংলা" },
  { code: "gu", label: "ગુજરાતી" },
  { code: "or", label: "ଓଡ଼ିଆ" },
];

const chip =
  "flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-border-base bg-panel/60 text-[11px] font-medium text-muted hover:text-text hover:border-border-strong transition-colors";

export const Header: React.FC<HeaderProps> = ({
  mode,
  activeAlertsCount,
  onOpenAlerts,
  onExportReport,
  selectedLanguage,
  onSelectLanguage,
  hasAnalysis,
  uiMode,
  onToggleUiMode,
  onOpenSettings,
}) => {
  const [isLangOpen, setIsLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const activeLang = LANGUAGES.find((l) => l.code === selectedLanguage) || LANGUAGES[0];
  const isLive = mode === "LIVE";

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setIsLangOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setIsLangOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <header className="h-12 flex-shrink-0 border-b border-border-base bg-base px-3 md:px-4 flex items-center justify-between z-30">
      <div className="flex items-baseline gap-2.5 min-w-0">
        <span className="font-display font-bold text-[17px] tracking-tight text-text leading-none">ORCA</span>
        <span className="hidden sm:inline text-[11px] text-muted truncate">Marine Operations Console</span>
      </div>

      <div className="flex items-center gap-1.5">
        {/* UI mode toggle: fisherman (phone) / console (map dominant) */}
        <button
          type="button"
          id="orca-ui-mode-btn"
          onClick={onToggleUiMode}
          aria-pressed={uiMode === "fisherman"}
          className={`${chip} ${uiMode === "fisherman" ? "border-accent/50 text-accent hover:text-accent" : ""}`}
          title={uiMode === "fisherman" ? "Switch to console" : "Switch to fisherman mode"}
        >
          {uiMode === "fisherman" ? <Anchor className="w-3.5 h-3.5" /> : <LayoutDashboard className="w-3.5 h-3.5" />}
          <span className="hidden md:inline">{uiMode === "fisherman" ? "Fisherman" : "Console"}</span>
        </button>

        {/* Backend mode chip opens settings */}
        <BackendModeChip lang={selectedLanguage} onClick={onOpenSettings} />
        <button type="button" onClick={onOpenSettings} className={chip} title="Backend settings" aria-label="Backend settings">
          <Settings className="w-3.5 h-3.5" />
        </button>

        {/* Data mode readout */}
        <div className={`${chip} hover:text-muted hover:border-border-base cursor-default`} title="Data mode">
          <span className={`w-1.5 h-1.5 rounded-full ${isLive ? "bg-calm" : "bg-caution"}`} />
          <span className={`num text-[10px] tracking-wider ${isLive ? "text-calm" : "text-caution"}`}>{mode}</span>
        </div>

        {/* Language */}
        <div className="relative" ref={langRef}>
          <button
            type="button"
            id="orca-language-btn"
            onClick={() => setIsLangOpen((v) => !v)}
            className={`${chip} ${isLangOpen ? "border-accent/50 text-text" : ""}`}
            title="Response language"
            aria-expanded={isLangOpen}
            aria-haspopup="listbox"
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{activeLang.label}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          {isLangOpen && (
            <div
              role="listbox"
              id="orca-language-dropdown"
              className="absolute right-0 mt-1.5 w-40 rounded-md bg-panel border border-border-base py-1 z-50"
            >
              {LANGUAGES.map((lang) => {
                const selected = selectedLanguage === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    role="option"
                    id={`orca-lang-opt-${lang.code}`}
                    aria-selected={selected}
                    onClick={() => {
                      onSelectLanguage(lang.code);
                      setIsLangOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-raised/50 ${
                      selected ? "text-accent font-semibold" : "text-text"
                    }`}
                  >
                    <span className="w-3.5 flex-shrink-0">{selected && <Check className="w-3.5 h-3.5" />}</span>
                    <span>{lang.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Alerts */}
        <button
          onClick={onOpenAlerts}
          className={`${chip} ${activeAlertsCount > 0 ? "border-caution/40 text-caution hover:text-caution" : ""}`}
          title="Active coastal marine alerts"
        >
          <Bell className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Alerts</span>
          {activeAlertsCount > 0 && (
            <span className="num min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-caution text-[10px] font-semibold text-base">
              {activeAlertsCount}
            </span>
          )}
        </button>

        {/* Export */}
        {hasAnalysis && (
          <button
            onClick={onExportReport}
            className={`${chip} border-accent/30 text-accent hover:text-accent hover:bg-accent/10`}
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
