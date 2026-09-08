"use client";

import React from "react";
import { X, AlertTriangle, ShieldAlert, Radio } from "lucide-react";
import { MarineAlert } from "@/lib/types";

interface AlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: MarineAlert[];
}

export const AlertsModal: React.FC<AlertsModalProps> = ({ isOpen, onClose, alerts }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-orca-card border border-orca-border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="p-4 border-b border-orca-border flex items-center justify-between bg-orca-dark">
          <div className="flex items-center gap-2 text-orca-amber font-display font-bold text-base">
            <ShieldAlert className="w-5 h-5 text-orca-amber" />
            <span>Active Coastal Marine Hazard Bulletins</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-orca-border/50 text-orca-muted hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          {alerts.length === 0 ? (
            <p className="text-center text-orca-muted text-xs py-8">No active coastal alerts in effect.</p>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.alert_id}
                className="p-3.5 rounded-xl bg-orca-darkest/60 border border-orca-border space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-white">{alert.title}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                      alert.severity === "RED"
                        ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                        : alert.severity === "ORANGE"
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : alert.severity === "YELLOW"
                        ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                        : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                    }`}
                  >
                    {alert.severity}
                  </span>
                </div>

                <p className="text-slate-300 leading-relaxed">{alert.description}</p>

                <div className="p-2 rounded bg-orca-card/60 border border-orca-border text-amber-200 text-[11px] font-medium">
                  Operational Directive: {alert.recommended_action}
                </div>

                <div className="flex items-center justify-between text-[10px] text-orca-muted pt-1 border-t border-orca-border/40">
                  <span>Source: {alert.source}</span>
                  <span>Sector: {alert.sector}</span>
                  <span>Validity: {alert.valid_until}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-3 border-t border-orca-border bg-orca-dark flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-orca-card border border-orca-border hover:border-orca-cyan text-xs text-white transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
