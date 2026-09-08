"use client";

import React, { useState } from "react";
import { Send, Sparkles, Loader2, Compass, CornerDownLeft } from "lucide-react";

interface QueryInputProps {
  onSubmit: (query: string) => void;
  isLoading: boolean;
  activeQueryText?: string;
  onFollowUp: (followUp: string) => void;
}

const FOLLOW_UP_SUGGESTIONS = [
  "What about tomorrow morning?",
  "Show areas with higher chlorophyll nearby",
  "Does this route cross protected waters?",
  "Why was this location rejected?",
  "Explain this analysis in Telugu",
];

export const QueryInput: React.FC<QueryInputProps> = ({
  onSubmit,
  isLoading,
  onFollowUp,
}) => {
  const [text, setText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isLoading) return;
    onSubmit(text.trim());
    setText("");
  };

  return (
    <div className="w-full space-y-2">
      {/* Contextual Follow-up Suggestions */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        <span className="text-[10px] uppercase font-bold text-orca-muted flex items-center gap-1 flex-shrink-0">
          <Sparkles className="w-3 h-3 text-orca-cyan" /> Suggested Follow-ups:
        </span>
        {FOLLOW_UP_SUGGESTIONS.map((sug, idx) => (
          <button
            key={idx}
            onClick={() => onFollowUp(sug)}
            className="flex-shrink-0 bg-orca-card/60 hover:bg-orca-card border border-orca-border hover:border-orca-cyan/40 text-orca-muted hover:text-white px-2.5 py-1 rounded-full text-[11px] transition"
          >
            {sug}
          </button>
        ))}
      </div>

      {/* Main Input Field */}
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <div className="absolute left-4 pointer-events-none text-orca-muted">
          <Compass className="w-5 h-5 text-orca-cyan" />
        </div>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask ORCA anything: 'Is it safe near Vizag tomorrow?', 'Find fishing areas with calm waves', 'Compare Chennai & Kakinada'..."
          disabled={isLoading}
          className="w-full bg-orca-card/90 border border-orca-border focus:border-orca-cyan text-white text-sm rounded-xl pl-12 pr-28 py-3.5 focus:outline-none transition shadow-lg placeholder:text-orca-muted/60"
        />
        <button
          type="submit"
          disabled={isLoading || !text.trim()}
          className="absolute right-2 px-4 py-2 rounded-lg bg-gradient-to-r from-orca-blue to-orca-cyan text-orca-darkest font-semibold text-xs flex items-center gap-1.5 hover:opacity-95 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-glow"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <span>Analyze</span>
              <CornerDownLeft className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
