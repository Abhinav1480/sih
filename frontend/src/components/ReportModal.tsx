"use client";

import React, { useState } from "react";
import { X, Copy, Check, Printer } from "lucide-react";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportContent: string;
}

export const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, reportContent }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(reportContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-orca-card border border-orca-border rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-orca-border flex items-center justify-between bg-orca-dark">
          <div className="font-display font-bold text-base text-white">
            Formal Marine Intelligence Advisory Report
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orca-card border border-orca-border hover:border-orca-cyan text-xs text-white transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orca-cyan text-orca-darkest font-semibold text-xs transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-orca-border/50 text-orca-muted hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed bg-orca-darkest/60 select-text">
          {reportContent}
        </div>
      </div>
    </div>
  );
};
