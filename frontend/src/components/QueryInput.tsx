"use client";

import React, { useState } from "react";
import { ArrowUp, Loader2, Search } from "lucide-react";
import { Pill } from "@/components/ui/Pill";
import { VoiceInput } from "@/components/Fisherman/VoiceInput";

interface QueryInputProps {
  onSubmit: (query: string) => void;
  isLoading: boolean;
  activeQueryText?: string;
  onFollowUp: (followUp: string) => void;
  /** Contextual follow-up suggestions (e.g. from the current result type) */
  suggestions?: string[];
  /** Hide the suggestion row entirely (used on the landing screen) */
  hideSuggestions?: boolean;
  /** Larger, centered treatment for the landing screen */
  landing?: boolean;
  /** FE-07: show a voice-input mic that populates this input (Fisherman Mode). */
  enableVoice?: boolean;
  /** Language code used for speech recognition. */
  voiceLang?: string;
}

const DEFAULT_SUGGESTIONS = [
  "What about tomorrow evening?",
  "Why is this ranked first?",
  "Show the alternative route",
  "Explain this in Telugu",
];

export const QueryInput: React.FC<QueryInputProps> = ({
  onSubmit,
  isLoading,
  onFollowUp,
  suggestions,
  hideSuggestions = false,
  landing = false,
  enableVoice = false,
  voiceLang = "en",
}) => {
  const [text, setText] = useState("");
  const followUps = suggestions && suggestions.length > 0 ? suggestions : DEFAULT_SUGGESTIONS;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isLoading) return;
    onSubmit(text.trim());
    setText("");
  };

  return (
    <div className="w-full space-y-2.5">
      {/* Contextual follow-up suggestions */}
      {!hideSuggestions && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
          {followUps.map((sug, idx) => (
            <Pill
              key={idx}
              size="sm"
              onClick={() => onFollowUp(sug)}
              disabled={isLoading}
              className="flex-shrink-0"
            >
              {sug}
            </Pill>
          ))}
        </div>
      )}

      {/* Main input (with optional voice mic in Fisherman Mode) */}
      <div className={enableVoice ? "flex items-start gap-2" : ""}>
        {enableVoice && (
          <div className="flex flex-col items-center gap-0.5 pt-0.5">
            <VoiceInput
              lang={voiceLang}
              onTranscript={(txt) => setText(txt)}
              disabled={isLoading}
            />
          </div>
        )}
        <form
        onSubmit={handleSubmit}
        className={`relative flex items-center rounded-2xl border bg-orca-panel/80 transition focus-within:border-orca-cyan/50 focus-within:bg-orca-panel ${
          enableVoice ? "flex-1" : ""
        } ${landing ? "border-orca-border shadow-card" : "border-orca-border"}`}
      >
        <div className="absolute left-4 pointer-events-none text-orca-muted">
          <Search className="w-4 h-4" />
        </div>
        <input
          id="marine-query-input"
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask ORCA about the marine environment..."
          disabled={isLoading}
          className={`w-full bg-transparent text-white rounded-2xl pl-11 pr-14 focus:outline-none placeholder:text-orca-dim ${
            landing ? "text-[15px] py-4" : "text-sm py-3.5"
          }`}
        />
        <button
          id="marine-query-submit-btn"
          type="submit"
          disabled={isLoading || !text.trim()}
          className="absolute right-2 w-9 h-9 rounded-xl bg-orca-cyan text-orca-darkest flex items-center justify-center transition disabled:opacity-30 disabled:cursor-not-allowed hover:bg-orca-cyan/90"
          aria-label="Submit query"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ArrowUp className="w-4 h-4 stroke-[2.5]" />
          )}
        </button>
        </form>
      </div>
    </div>
  );
};
