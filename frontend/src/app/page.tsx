"use client";

import React, { useState, useEffect, useRef } from "react";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { MapView } from "@/components/MapView";
import { QueryInput } from "@/components/QueryInput";
import { ResultContainer } from "@/components/Results/ResultContainer";
import { SummaryTable } from "@/components/Results/SummaryTable";
import { AgentActivityFeed } from "@/components/AgentActivityFeed";
import { AgentTraceTimeline } from "@/components/AgentTraceTimeline";
import { EvidenceProvider } from "@/components/Evidence/evidenceContext";
import { EvidencePanel } from "@/components/Evidence/EvidencePanel";
import { EvidenceRegistry } from "@/components/Evidence/EvidenceRegistry";
import { FishermanPanel } from "@/components/Fisherman";
import { t } from "@/lib/i18n";
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
  TraceItem,
} from "@/lib/types";
import { streamOrcaAnalysis, accumulateTraceItems } from "@/lib/stream";
import { Waves, Compass, MessageSquare, Map as MapIcon, Anchor } from "lucide-react";

export default function Home() {
  const [currentAnalysis, setCurrentAnalysis] = useState<OrcaAnalysisResponse | null>(null);
  const [activeTraceItems, setActiveTraceItems] = useState<TraceItem[]>([]);
  const traceAbortRef = useRef<AbortController | null>(null);
  const lastQueryRef = useRef<string>("");
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>(undefined);
  const [alerts, setAlerts] = useState<MarineAlert[]>([]);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportMarkdown, setReportMarkdown] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [userRole, setUserRole] = useState("Commercial Fisherman");
  // FE-07: Fisherman Mode — a simplified, voice/touch-friendly mode of ORCA.
  const [fishermanMode, setFishermanMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ONE-TIME CENTER INTRO ANIMATION STATE
  const [isInitialCenterState, setIsInitialCenterState] = useState(true);
  const [centerRevealDone, setCenterRevealDone] = useState(false);
  const isFirstSubmit = useRef(true);

  // ── FE-02 SPLIT CANVAS STATE ──────────────────────────────────────────────
  // Conversation (left) | persistent map (right). The two panes are ALWAYS
  // mounted; only their sizing/visibility changes, so the single MapView
  // instance below never unmounts across queries, loading, errors, clarifications,
  // breakpoint changes, or the mobile tab switch.
  const splitRef = useRef<HTMLDivElement>(null);
  const [leftPct, setLeftPct] = useState(50); // conversation width % (desktop)
  const [isDragging, setIsDragging] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true); // md+ side-by-side split
  const [mobileTab, setMobileTab] = useState<"chat" | "map">("chat");
  // Imperative reflow signal handed to MapView — bumped after layout shifts a
  // ResizeObserver may not settle in time (drag end, tab reveal, breakpoint).
  const [resizeSignal, setResizeSignal] = useState(0);

  // FE-04: "View on map" target from the Evidence drawer → flies the existing
  // persistent map (never remounts / never creates a second map).
  const [mapFocus, setMapFocus] = useState<{ lat: number; lon: number; nonce: number } | null>(null);
  const handleViewOnMap = (lat: number, lon: number) => {
    setMapFocus((prev) => ({ lat, lon, nonce: (prev?.nonce || 0) + 1 }));
    setMobileTab("map"); // ensure the map is the visible pane on mobile
    setResizeSignal((s) => s + 1);
  };

  // Load initial data
  useEffect(() => {
    fetchActiveAlerts().then(setAlerts).catch(() => {});
    fetchConversations().then(setConversations).catch(() => {});
  }, []);

  // Track the md breakpoint to decide split (desktop/tablet) vs tabs (mobile).
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => {
      setIsDesktop(mq.matches);
      setResizeSignal((s) => s + 1); // reflow the map after a breakpoint change
    };
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Draggable split divider (desktop only). The map reflows live via its own
  // ResizeObserver while dragging; we bump resizeSignal on release to settle it.
  const startDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const onMove = (ev: PointerEvent) => {
      const el = splitRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      setLeftPct(Math.min(68, Math.max(32, pct)));
    };
    const onUp = () => {
      setIsDragging(false);
      setResizeSignal((s) => s + 1);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // Mobile tab switch — keeps both panes mounted, only toggles visibility.
  const selectMobileTab = (tab: "chat" | "map") => {
    setMobileTab(tab);
    setResizeSignal((s) => s + 1); // map may have been display:none — reflow it
  };

  // Submit query handler
  const handleQuerySubmit = async (queryText: string) => {
    lastQueryRef.current = queryText;
    if (isFirstSubmit.current) {
      // One-time landing → split-canvas reveal. The map is already mounted
      // underneath the landing overlay, so this only uncovers + animates it in.
      setIsInitialCenterState(false);
      setCenterRevealDone(true);
      isFirstSubmit.current = false;
      // Reflow the map once it becomes visible, and clear the reveal flag after
      // the animation window (works even if the pane is hidden on mobile).
      setResizeSignal((s) => s + 1);
      setTimeout(() => setCenterRevealDone(false), 700);
    }

    // Abort any prior active trace stream
    if (traceAbortRef.current) {
      traceAbortRef.current.abort();
    }
    const abortCtrl = new AbortController();
    traceAbortRef.current = abortCtrl;

    // Reset trace for the new query (requirement 15: active query only)
    setActiveTraceItems([]);
    setIsLoading(true);
    setErrorMessage(null);

    // Launch streaming trace in parallel with query request
    const streamPromise = streamOrcaAnalysis(
      queryText,
      activeConversationId,
      selectedLanguage,
      {
        onEvent: (event) => {
          setActiveTraceItems((prev) => accumulateTraceItems(prev, event));
        },
        onComplete: () => {},
        onError: (err) => {
          console.warn("[ORCA Trace] Stream error:", err);
        },
      },
      abortCtrl
    );

    try {
      const response = await submitMarineQuery(
        queryText,
        activeConversationId,
        selectedLanguage
      );

      // Await stream completion or small delay for smooth visual transition
      await streamPromise.catch(() => {});

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
    if (traceAbortRef.current) {
      traceAbortRef.current.abort();
    }
    setActiveTraceItems([]);
    setCurrentAnalysis(null);
    setActiveConversationId(undefined);
    setErrorMessage(null);
  };

  // Contextual follow-up suggestions based on the current result type
  const followUpSuggestions = React.useMemo(() => {
    const rt = currentAnalysis?.visualization_plan?.result_type || currentAnalysis?.intent;
    if (!rt) return undefined;
    if (rt.includes("route")) {
      return ["What about tomorrow evening?", "Why is this route safer?", "Show the alternative route"];
    }
    if (rt.includes("fishing")) {
      return ["Why is the top zone ranked first?", "What about tomorrow evening?", "Show zones with higher chlorophyll"];
    }
    if (rt.includes("spatial")) {
      return ["What changes 50 km offshore instead?", "Compare with the origin conditions", "Is it safe out there?"];
    }
    if (rt.includes("comparison")) {
      return ["Which is safer for fishing?", "What about tomorrow morning?"];
    }
    if (rt.includes("historical") || rt.includes("trend")) {
      return ["What is the forecast for tomorrow?", "Explain the biggest change"];
    }
    return ["What about tomorrow evening?", "Is it safe for small vessels?", "Explain this in Telugu"];
  }, [currentAnalysis]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-orca-darkest text-white">
      {/* Left Sidebar */}
      <Sidebar
        conversations={conversations}
        currentConversationId={activeConversationId}
        onSelectConversation={(id) => {
          setActiveConversationId(id);
        }}
        onNewAnalysis={handleNewAnalysis}
        onSelectPrompt={(p) => handleQuerySubmit(p)}
        userRole={userRole}
        onSelectRole={setUserRole}
        onOpenAlerts={() => setIsAlertsOpen(true)}
        alertsCount={alerts.length}
      />

      {/* Main Workspace Column */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
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

        {/* Center / Right Intelligence Studio — wrapped so any result card can
            open the shared Evidence drawer (FE-04) without prop drilling. */}
        <EvidenceProvider
          records={currentAnalysis?.evidence}
          risk={currentAnalysis?.risk_assessment}
          isLoading={isLoading}
          queryKey={currentAnalysis?.query_id}
          onViewOnMap={handleViewOnMap}
        >
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Location / temporal context strip — calm and minimal, only after analysis */}
          {!isInitialCenterState && (
            <div className="bg-orca-dark/50 border-b border-orca-border/70 px-4 py-2 flex items-center justify-between gap-3 text-xs flex-shrink-0 z-10">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-orca-cyan flex-shrink-0" />
                <span className="font-medium text-white truncate">
                  {currentAnalysis
                    ? currentAnalysis.location.name
                    : "Indian Ocean · Coastal EEZ Waters"}
                </span>
                {currentAnalysis && (
                  <span className="hidden sm:inline text-orca-dim text-[11px] font-mono truncate">
                    {currentAnalysis.location.latitude.toFixed(2)}°N, {currentAnalysis.location.longitude.toFixed(2)}°E
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {/* FE-07: Fisherman Mode toggle (existing nav strip, no clutter) */}
                <button
                  type="button"
                  onClick={() => setFishermanMode((v) => !v)}
                  aria-pressed={fishermanMode}
                  className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border text-[11px] font-medium transition ${
                    fishermanMode
                      ? "bg-orca-cyan/15 border-orca-cyan/40 text-orca-cyan"
                      : "bg-orca-dark/60 border-orca-border text-orca-muted hover:text-white"
                  }`}
                >
                  <Anchor className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">
                    {fishermanMode
                      ? t("fisherman.exit", selectedLanguage)
                      : t("fisherman.enter", selectedLanguage)}
                  </span>
                </button>

                {currentAnalysis && (
                  <>
                    <span className="hidden md:inline text-[11px] text-orca-muted">
                      {currentAnalysis.temporal.label}
                    </span>
                    {currentAnalysis.risk_assessment && (
                      <span
                        className={`text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full border ${
                          currentAnalysis.risk_assessment.category === "LOW"
                            ? "border-emerald-500/30 text-emerald-300"
                            : currentAnalysis.risk_assessment.category === "MODERATE"
                            ? "border-amber-500/30 text-amber-300"
                            : "border-rose-500/30 text-rose-300"
                        }`}
                      >
                        {currentAnalysis.risk_assessment.category} · {currentAnalysis.risk_assessment.overall_score}/100
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── FE-02 SPLIT CANVAS: conversation (left) | persistent map (right) ──
              Both panes are ALWAYS mounted. Only sizing/visibility changes, so the
              single MapView instance never unmounts across queries, loading, errors,
              clarification, result-type changes, breakpoints, or the mobile tab. */}
          <div className="flex-1 relative min-h-0 overflow-hidden bg-orca-darkest">
            <div
              ref={splitRef}
              className={`h-full w-full flex flex-col md:flex-row ${
                isDragging ? "select-none cursor-col-resize" : ""
              }`}
            >
              {/* LEFT — Conversation / analysis (scrolls independently) */}
              <section
                className={`min-w-0 flex-col ${
                  isDesktop
                    ? "flex h-full flex-shrink-0"
                    : mobileTab === "chat"
                    ? "flex flex-1 min-h-0"
                    : "hidden"
                }`}
                style={isDesktop ? { width: `${leftPct}%` } : undefined}
              >
                {/* Scrollable conversation column */}
                <div className="flex-1 min-h-0 overflow-y-auto px-3 md:px-4 py-3 space-y-3">
                  {/* Error Notification — conversation-side only; map stays alive */}
                  {errorMessage && (
                    <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 flex-shrink-0" />
                      <div>
                        <b className="text-rose-200">Execution Error:</b> {errorMessage}
                      </div>
                    </div>
                  )}

                  {/* Standby (after New Analysis, before next query) */}
                  {!currentAnalysis && !isLoading && !isInitialCenterState && (
                    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
                      <div className="w-11 h-11 rounded-xl bg-orca-dark border border-orca-border flex items-center justify-center mb-4">
                        <Compass className="w-5 h-5 text-orca-muted stroke-[1.75]" />
                      </div>
                      <h2 className="font-display font-semibold text-[15px] text-white">
                        Ready for your next analysis
                      </h2>
                      <p className="text-[12.5px] text-orca-dim mt-1.5 leading-relaxed max-w-[240px]">
                        Ask about ocean conditions, fishing zones, routes, or spatial what-if scenarios.
                      </p>
                    </div>
                  )}

                  {/* Live Agent Trace Stream while processing (Mission-Control Reasoning View) */}
                  {isLoading && (
                    <div className="space-y-3 pt-1">
                      {fishermanMode && (
                        <div className="text-[13px] text-slate-300 font-medium flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-orca-cyan animate-pulse" />
                          {t("loading.analyzing", selectedLanguage)}
                        </div>
                      )}
                      <AgentTraceTimeline
                        items={activeTraceItems}
                        isRunning={true}
                        defaultCollapsed={fishermanMode}
                        onRetry={() => handleQuerySubmit(lastQueryRef.current)}
                      />
                    </div>
                  )}

                  {/* Result — Fisherman Mode shows the simplified verdict-first
                      panel; otherwise the full dynamic result container. */}
                  {currentAnalysis && !isLoading && (
                    fishermanMode ? (
                      <FishermanPanel
                        analysis={currentAnalysis}
                        lang={selectedLanguage}
                        alerts={alerts}
                        onSelectLocation={(locName) => {
                          const refined = `${currentAnalysis.query_text} near ${locName}`;
                          handleQuerySubmit(refined);
                        }}
                      />
                    ) : (
                      <ResultContainer
                        analysis={currentAnalysis}
                        onSelectLocation={(locName) => {
                          const refined = `${currentAnalysis.query_text} near ${locName}`;
                          handleQuerySubmit(refined);
                        }}
                      />
                    )
                  )}

                  {/* Agent Reasoning Trace Timeline */}
                  {currentAnalysis && !isLoading && (
                    <AgentActivityFeed
                      steps={currentAnalysis.agent_activity}
                      traceItems={activeTraceItems.length > 0 ? activeTraceItems : undefined}
                      defaultCollapsed={true}
                    />
                  )}

                  {/* Evidence & Provenance — consolidated registry summary that
                      opens the shared drawer (FE-04). Fisherman Mode renders its
                      own registry inside FishermanPanel, so skip it here. */}
                  {currentAnalysis && !fishermanMode && <EvidenceRegistry />}

                  {/* Final Decision Summary Table (End of Result) */}
                  {currentAnalysis && !fishermanMode && (
                    <SummaryTable
                      analysis={currentAnalysis}
                      selectedLanguage={selectedLanguage}
                    />
                  )}
                </div>

                {/* Query console — pinned to the bottom of the conversation pane.
                    Rendered post-landing (the landing overlay owns the intro input). */}
                {!isInitialCenterState && (
                  <div
                    className="flex-shrink-0 border-t border-orca-border/60 bg-orca-dark/40 px-3 md:px-4 py-3"
                    style={
                      centerRevealDone
                        ? { animation: "orca-search-settle 0.65s cubic-bezier(0.22, 1, 0.36, 1) forwards" }
                        : undefined
                    }
                  >
                    <QueryInput
                      onSubmit={handleQuerySubmit}
                      isLoading={isLoading}
                      onFollowUp={(f) => handleQuerySubmit(f)}
                      suggestions={followUpSuggestions}
                      enableVoice={fishermanMode}
                      voiceLang={selectedLanguage}
                    />
                  </div>
                )}
              </section>

              {/* DRAGGABLE DIVIDER — desktop/tablet only. Map reflows live via its
                  ResizeObserver during the drag; no reinitialization. */}
              {isDesktop && (
                <div
                  role="separator"
                  aria-orientation="vertical"
                  aria-label="Resize conversation and map"
                  onPointerDown={startDrag}
                  className="relative flex-shrink-0 w-2 cursor-col-resize group"
                >
                  <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-orca-border group-hover:bg-orca-cyan/50 transition-colors" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-[3px] opacity-40 group-hover:opacity-100 transition-opacity">
                    <span className="w-[3px] h-[3px] rounded-full bg-orca-muted" />
                    <span className="w-[3px] h-[3px] rounded-full bg-orca-muted" />
                    <span className="w-[3px] h-[3px] rounded-full bg-orca-muted" />
                  </div>
                </div>
              )}

              {/* RIGHT — persistent marine map surface. NEVER unmounts. */}
              <section
                className={`min-w-0 relative ${isDragging ? "pointer-events-none" : ""} ${
                  isDesktop
                    ? "flex-1 h-full"
                    : mobileTab === "map"
                    ? "flex-1 min-h-0"
                    : "hidden"
                }`}
              >
                <div
                  className="w-full h-full p-2 md:p-2.5"
                  style={
                    centerRevealDone
                      ? { animation: "orca-map-reveal 0.65s cubic-bezier(0.22, 1, 0.36, 1) forwards" }
                      : undefined
                  }
                >
                  <MapView
                    layers={(currentAnalysis as any)?.layers || currentAnalysis?.map_layers || []}
                    visualizationPlan={currentAnalysis?.visualization_plan}
                    onCoordinateSelect={handleCoordinateSelect}
                    resizeSignal={resizeSignal}
                    focusCoordinate={mapFocus || undefined}
                  />
                </div>
              </section>
            </div>

            {/* MOBILE TAB SWITCHER — floating; keeps BOTH panes mounted (map never
                destroyed, just hidden). Hidden on md+ and during the landing intro. */}
            {!isInitialCenterState && (
              <div className="md:hidden absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 p-1 rounded-full bg-orca-panel/95 backdrop-blur border border-orca-border shadow-elevation2">
                <button
                  onClick={() => selectMobileTab("chat")}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition ${
                    mobileTab === "chat" ? "bg-orca-cyan text-orca-darkest" : "text-orca-muted"
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" /> Conversation
                </button>
                <button
                  onClick={() => selectMobileTab("map")}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition ${
                    mobileTab === "map" ? "bg-orca-cyan text-orca-darkest" : "text-orca-muted"
                  }`}
                >
                  <MapIcon className="w-3.5 h-3.5" /> Map
                </button>
              </div>
            )}

            {/* ── ONE-TIME LANDING OVERLAY ──
                Covers the split during the intro. The MapView beneath is already
                mounted, so the first query simply uncovers + reveals it. */}
            {isInitialCenterState && (
              <div className="absolute inset-0 z-30 bg-orca-darkest flex flex-col items-center justify-center pb-[8vh] overflow-hidden">
                {/* Composition content — horizontally centered */}
                <div className="relative z-10 w-full max-w-[680px] px-5 sm:px-6">
                  {/* Mark */}
                  <div className="flex justify-center mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-orca-dark border border-orca-cyan/20 flex items-center justify-center">
                      <Waves className="w-6 h-6 text-orca-cyan stroke-[1.75]" />
                    </div>
                  </div>

                  {/* Heading */}
                  <h1 className="text-center font-display font-bold text-[26px] sm:text-[28px] text-white tracking-tight">
                    ORCA Intelligence
                  </h1>
                  <p className="text-center text-[15px] text-slate-400 leading-relaxed mt-2 mb-7">
                    Marine intelligence for better coastal decisions.
                  </p>

                  {/* Search bar (primary focus) */}
                  <QueryInput
                    onSubmit={handleQuerySubmit}
                    isLoading={isLoading}
                    onFollowUp={(f) => handleQuerySubmit(f)}
                    hideSuggestions
                    landing
                  />

                  {/* Example suggestion chips */}
                  <div className="flex items-center justify-center flex-wrap gap-x-2 gap-y-2 mt-5">
                    {[
                      "Fishing zones near Visakhapatnam tomorrow morning",
                      "Marine conditions near Kakinada",
                      "Lower-risk route Kakinada → Visakhapatnam",
                      "What changes 30 km offshore from Vizag?",
                    ].map((label) => (
                      <button
                        key={label}
                        onClick={() => handleQuerySubmit(label)}
                        className="px-3 py-1.5 rounded-full bg-orca-panel/50 border border-orca-border/70 hover:border-orca-cyan/30 hover:text-white text-[11.5px] text-slate-400 transition"
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Capability line */}
                  <p className="text-center text-[11px] text-orca-dim mt-6 tracking-wide">
                    Ocean Conditions · Fishing · Safety · Routes · Spatial What-If
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Shared Evidence & Provenance drawer (FE-04) — one instance for the
            whole workspace; reads from the current result only. */}
        <EvidencePanel />
        </EvidenceProvider>
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
