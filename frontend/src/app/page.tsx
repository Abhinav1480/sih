"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { MapView } from "@/components/MapView";
import { QueryInput } from "@/components/QueryInput";
import { ResultContainer } from "@/components/Results/ResultContainer";
import { AgentActivityFeed } from "@/components/AgentActivityFeed";
import { EvidenceDrawer } from "@/components/EvidenceDrawer";
import { AlertsModal } from "@/components/AlertsModal";
import { ReportModal } from "@/components/ReportModal";
import {
  submitMarineQuery,
  fetchActiveAlerts,
  fetchConversations,
  exportMarkdownReport,
} from "@/lib/api";
import {
  OrcaAnalysisResponse,
  MarineAlert,
  ConversationSummary,
} from "@/lib/types";
import { Waves, Sparkles, Shield, Compass, Navigation, Radio, Terminal } from "lucide-react";

export default function Home() {
  const [currentAnalysis, setCurrentAnalysis] = useState<OrcaAnalysisResponse | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>(undefined);
  const [alerts, setAlerts] = useState<MarineAlert[]>([]);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportMarkdown, setReportMarkdown] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [userRole, setUserRole] = useState("Commercial Fisherman");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    fetchActiveAlerts().then(setAlerts).catch(() => {});
    fetchConversations().then(setConversations).catch(() => {});
  }, []);

  // Submit query handler
  const handleQuerySubmit = async (queryText: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await submitMarineQuery(
        queryText,
        activeConversationId,
        selectedLanguage
      );
      setCurrentAnalysis(response);
      setActiveConversationId(response.conversation_id);

      // Refresh conversations list
      fetchConversations().then(setConversations).catch(() => {});
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred while executing the analysis.");
    } finally {
      setIsLoading(false);
    }
  };

  // Map coordinate click handler
  const handleCoordinateSelect = (lat: number, lon: number) => {
    const prompt = `Analyze ocean conditions and marine safety at coordinate ${lat}°N, ${lon}°E.`;
    handleQuerySubmit(prompt);
  };

  // Export report
  const handleExportReport = async () => {
    if (!currentAnalysis) return;
    try {
      const res = await exportMarkdownReport(currentAnalysis);
      setReportMarkdown(res.markdown_content);
      setIsReportOpen(true);
    } catch (e) {
      alert("Failed to generate report export.");
    }
  };

  const handleNewAnalysis = () => {
    setCurrentAnalysis(null);
    setActiveConversationId(undefined);
    setErrorMessage(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-orca-darkest text-white">
      {/* Top Header */}
      <Header
        mode={currentAnalysis?.mode || "DEMO"}
        activeAlertsCount={alerts.length}
        onOpenAlerts={() => setIsAlertsOpen(true)}
        onExportReport={handleExportReport}
        selectedLanguage={selectedLanguage}
        onSelectLanguage={setSelectedLanguage}
        hasAnalysis={!!currentAnalysis}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          conversations={conversations}
          currentConversationId={activeConversationId}
          onSelectConversation={(id) => {
            setActiveConversationId(id);
            // Could load conversation history
          }}
          onNewAnalysis={handleNewAnalysis}
          onSelectPrompt={(p) => handleQuerySubmit(p)}
          userRole={userRole}
          onSelectRole={setUserRole}
        />

        {/* Center / Right Intelligence Studio */}
        <main className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-4rem)] overflow-y-auto lg:overflow-hidden p-3 md:p-4 gap-4">
          {/* Left Column: Interactive Map & Query Box */}
          <div className="flex-1 flex flex-col gap-3 min-h-[500px] lg:min-h-0">
            {/* Interactive Marine Map */}
            <div className="flex-1 min-h-[350px] w-full relative">
              <MapView
                layers={currentAnalysis?.map_layers || []}
                visualizationPlan={currentAnalysis?.visualization_plan}
                onCoordinateSelect={handleCoordinateSelect}
              />
            </div>

            {/* Bottom Query & Follow-up Input */}
            <div className="flex-shrink-0">
              <QueryInput
                onSubmit={handleQuerySubmit}
                isLoading={isLoading}
                onFollowUp={(f) => handleQuerySubmit(f)}
              />
            </div>
          </div>

          {/* Right Column: Dynamic Intelligence Results, Telemetry & Evidence */}
          <div className="w-full lg:w-[480px] xl:w-[540px] flex-shrink-0 flex flex-col gap-3 overflow-y-auto pr-1">
            {/* Error Notification */}
            {errorMessage && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                <b>Error:</b> {errorMessage}
              </div>
            )}

            {/* Initial Empty State Hero (if no analysis executed yet) */}
            {!currentAnalysis && !isLoading && (
              <div className="bg-orca-card/60 border border-orca-border rounded-2xl p-6 text-center space-y-4 shadow-xl">
                <div className="w-14 h-14 rounded-2xl bg-orca-darkest border border-orca-cyan/40 text-orca-cyan flex items-center justify-center mx-auto shadow-glow">
                  <Waves className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-lg text-white">
                    ORCA Marine Intelligence Studio
                  </h2>
                  <p className="text-xs text-orca-muted mt-1 leading-relaxed max-w-sm mx-auto">
                    Collaborative Multi-Agent Marine Decision Support for SIH 2026 PS 26176.
                    Ask any natural language query or click anywhere on the ocean map to begin.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-left text-xs pt-2">
                  <div className="p-2.5 rounded-xl bg-orca-darkest/70 border border-orca-border">
                    <Compass className="w-4 h-4 text-orca-cyan mb-1" />
                    <div className="font-semibold text-white text-[11px]">Dynamic Reasoning</div>
                    <div className="text-[10px] text-orca-muted">Zero canned answers; plans tasks on the fly.</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-orca-darkest/70 border border-orca-border">
                    <Shield className="w-4 h-4 text-emerald-400 mb-1" />
                    <div className="font-semibold text-white text-[11px]">Deterministic Risk</div>
                    <div className="text-[10px] text-orca-muted">Calculates verified INCOIS & IMD hazard scores.</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-orca-darkest/70 border border-orca-border">
                    <Navigation className="w-4 h-4 text-orca-teal mb-1" />
                    <div className="font-semibold text-white text-[11px]">Geofence Audits</div>
                    <div className="text-[10px] text-orca-muted">Exact PostGIS / Shapely Marine Sanctuary limits.</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-orca-darkest/70 border border-orca-border">
                    <Radio className="w-4 h-4 text-amber-400 mb-1" />
                    <div className="font-semibold text-white text-[11px]">Vernacular AI</div>
                    <div className="text-[10px] text-orca-muted">10 coastal languages with localized synthesis.</div>
                  </div>
                </div>
              </div>
            )}

            {/* Dynamic Result Container */}
            {currentAnalysis && <ResultContainer analysis={currentAnalysis} />}

            {/* Agent Telemetry Timeline */}
            {currentAnalysis && (
              <AgentActivityFeed steps={currentAnalysis.agent_activity} />
            )}

            {/* Evidence & Provenance Drawer */}
            {currentAnalysis && (
              <EvidenceDrawer evidence={currentAnalysis.evidence} />
            )}
          </div>
        </main>
      </div>

      {/* Coastal Alerts Modal */}
      <AlertsModal
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        alerts={alerts}
      />

      {/* Export Report Modal */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        reportContent={reportMarkdown}
      />
    </div>
  );
}
