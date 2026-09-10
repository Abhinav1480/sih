"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { MapView } from "@/components/MapView";
import { QueryInput } from "@/components/QueryInput";
import { ResultContainer } from "@/components/Results/ResultContainer";
import { ClarificationCard } from "@/components/Results/ClarificationCard";
import { SummaryTable } from "@/components/Results/SummaryTable";
import { AgentActivityFeed } from "@/components/AgentActivityFeed";
import { AgentTraceTimeline } from "@/components/AgentTraceTimeline";
import { EvidenceProvider } from "@/components/Evidence/evidenceContext";
import { EvidencePanel } from "@/components/Evidence/EvidencePanel";
import { EvidenceRegistry } from "@/components/Evidence/EvidenceRegistry";
import { FishermanPanel, FishermanHome } from "@/components/Fisherman";
import { t } from "@/lib/i18n";
import { initNativeShell, isNative, registerBackHandler } from "@/lib/native";
import { getCachedMarker } from "@/lib/api";
import { loadBackendConfig } from "@/lib/backend";
import { useGeofence } from "@/lib/geofence";
import { GeofenceBanner, TrackPlayer } from "@/components/Geofence";
import { ConnectivityBanner, StaleWarning, TripCard, SaveTripCardButton } from "@/components/Offline";
import { loadLastResponse, loadTripCard, getJSON, setJSON, KEYS, type TripCard as TripCardData } from "@/lib/offline";
import { BackendSettings } from "@/components/Settings";
import { AlertsModal } from "@/components/AlertsModal";
import { ReportModal } from "@/components/ReportModal";
import {
  submitMarineQuery,
  fetchActiveAlerts,
  fetchConversations,
  exportMarkdownReport,
  DEFAULT_USER_LOCATION,
} from "@/lib/api";
import {
  OrcaAnalysisResponse,
  MarineAlert,
  ConversationSummary,
  TraceItem,
  Coordinates,
} from "@/lib/types";
import { streamOrcaAnalysis, accumulateTraceItems } from "@/lib/stream";
import { AlertTriangle, Anchor, MessageSquare, Map as MapIcon, RotateCcw, Play, ClipboardList, X } from "lucide-react";

// The eight canonical PS 26176 questions. Shown until the first result arrives.
const CANONICAL_QUERIES = [
  "Where is the nearest Potential Fishing Zone today?",
  "Is it safe to venture into the sea tomorrow morning?",
  "What are the tide, weather and sea conditions near my fishing location?",
  "Are there any lightning or cyclone alerts in my area?",
  "Which regions show high chlorophyll concentration and favourable sea surface temperature?",
  "What is the safest route for a fishing vessel considering weather and sea state conditions?",
  "Why has fish productivity declined in a particular coastal region?",
  "Which fishing zones should be avoided due to hazardous marine conditions or geofencing restrictions?",
];

const VERDICT_CLASS: Record<string, string> = {
  GO: "text-calm border-calm/40",
  CAUTION: "text-caution border-caution/40",
  NO_GO: "text-severe border-severe/40",
  NOT_APPLICABLE: "text-muted border-border-base",
};
const BAND_CLASS: Record<string, string> = {
  LOW: "text-calm",
  MODERATE: "text-caution",
  HIGH: "text-hazard",
  SEVERE: "text-severe",
};

export default function Home() {
  const [currentAnalysis, setCurrentAnalysis] = useState<OrcaAnalysisResponse | null>(null);
  const [activeTraceItems, setActiveTraceItems] = useState<TraceItem[]>([]);
  const traceAbortRef = useRef<AbortController | null>(null);
  const lastQueryRef = useRef<string>("");
  const userLocationRef = useRef<Coordinates>(DEFAULT_USER_LOCATION);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>(undefined);
  const [alerts, setAlerts] = useState<MarineAlert[]>([]);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportMarkdown, setReportMarkdown] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [userRole, setUserRole] = useState("Commercial Fisherman");
  const [fishermanMode, setFishermanMode] = useState(false);
  // Native shell state: backend settings sheet, geofence, trip card, cache markers.
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [demoPos, setDemoPos] = useState<{ lat: number; lon: number } | null>(null);
  const [showTrackPlayer, setShowTrackPlayer] = useState(false);
  const [tripCard, setTripCard] = useState<TripCardData | null>(null);
  const [isTripCardOpen, setIsTripCardOpen] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ── Split canvas: conversation (left ~40%) | persistent map (right ~60%).
  // Both panes are ALWAYS mounted; only sizing/visibility changes, so the single
  // MapView instance never unmounts across queries, loading, errors, or tabs.
  const splitRef = useRef<HTMLDivElement>(null);
  const [leftPct, setLeftPct] = useState(40);
  const [isDragging, setIsDragging] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const [mobileTab, setMobileTab] = useState<"chat" | "map">("map");
  const [resizeSignal, setResizeSignal] = useState(0);
  const [mapFocus, setMapFocus] = useState<{ lat: number; lon: number; nonce: number } | null>(null);

  const handleViewOnMap = (lat: number, lon: number) => {
    setMapFocus((prev) => ({ lat, lon, nonce: (prev?.nonce || 0) + 1 }));
    setMobileTab("map");
    setResizeSignal((s) => s + 1);
  };

  useEffect(() => {
    // Backend mode must be known before the first fetch.
    loadBackendConfig().then(() => {
      fetchActiveAlerts().then(setAlerts).catch(() => {});
      fetchConversations().then(setConversations).catch(() => {});
    });
    initNativeShell();
    getJSON<string>(KEYS.UI_MODE).then((m) => {
      if (m === "fisherman" || m === "console") setFishermanMode(m === "fisherman");
      else if (isNative() || window.innerWidth < 768) setFishermanMode(true);
    });
    getJSON<string>(KEYS.LANG).then((l) => l && setSelectedLanguage(l));
    loadTripCard().then((c) => c && setTripCard(c));
    // Never open empty offline: restore the last synced result, clearly marked as cached.
    loadLastResponse().then((c) => {
      if (!c) return;
      setLastSyncAt(c.savedAt);
      if (isNative()) {
        const r = c.response;
        (r as any).__cached = { savedAt: c.savedAt, source: "last" };
        setCurrentAnalysis(r);
        lastQueryRef.current = r.meta?.query_text || r.query_text || "";
      }
    });
  }, []);

  const setUiMode = (fisherman: boolean) => {
    setFishermanMode(fisherman);
    setJSON(KEYS.UI_MODE, fisherman ? "fisherman" : "console");
  };
  const selectLanguage = (l: string) => {
    setSelectedLanguage(l);
    setJSON(KEYS.LANG, l);
  };

  // ── Geofence: real GPS by default, the bundled demo track when the player is driving.
  const geofence = useGeofence({
    enabled: true,
    source: demoPos ? "demo" : "gps",
    demoPosition: demoPos,
  });
  useEffect(() => {
    const p = geofence.position;
    if (p && !demoPos) userLocationRef.current = { latitude: p.lat, longitude: p.lon };
  }, [geofence.position, demoPos]);

  // ── Hardware back: close sheets first, then leave the result, else minimise (native.ts).
  useEffect(() => {
    return registerBackHandler(() => {
      if (isSettingsOpen) return (setIsSettingsOpen(false), true);
      if (isTripCardOpen) return (setIsTripCardOpen(false), true);
      if (isAlertsOpen) return (setIsAlertsOpen(false), true);
      if (isReportOpen) return (setIsReportOpen(false), true);
      if (!isDesktop && mobileTab === "map") return (setMobileTab("chat"), true);
      if (currentAnalysis) return (handleNewAnalysis(), true);
      return false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSettingsOpen, isTripCardOpen, isAlertsOpen, isReportOpen, isDesktop, mobileTab, currentAnalysis]);

  // Browser geolocation only when already granted; otherwise Kakinada default.
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.permissions || !navigator.geolocation) return;
    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((p) => {
        if (p.state !== "granted") return;
        navigator.geolocation.getCurrentPosition((pos) => {
          userLocationRef.current = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => {
      setIsDesktop(mq.matches);
      setResizeSignal((s) => s + 1);
    };
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const startDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const onMove = (ev: PointerEvent) => {
      const el = splitRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      // Upper clamp keeps the map >= ~57% of a 1440px viewport with the 56px rail.
      setLeftPct(Math.min(42, Math.max(28, pct)));
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

  const selectMobileTab = (tab: "chat" | "map") => {
    setMobileTab(tab);
    setResizeSignal((s) => s + 1);
  };

  const handleQuerySubmit = async (queryText: string) => {
    lastQueryRef.current = queryText;
    traceAbortRef.current?.abort();
    const abortCtrl = new AbortController();
    traceAbortRef.current = abortCtrl;

    setActiveTraceItems([]);
    setIsLoading(true);
    setErrorMessage(null);
    if (!isDesktop) setMobileTab("chat");

    const streamPromise = streamOrcaAnalysis(
      queryText,
      activeConversationId,
      selectedLanguage,
      {
        onEvent: (event) => setActiveTraceItems((prev) => accumulateTraceItems(prev, event)),
        onComplete: () => {},
        onError: (err) => console.warn("[ORCA Trace] Stream error:", err),
      },
      abortCtrl
    );

    try {
      const response = await submitMarineQuery(
        queryText,
        activeConversationId,
        selectedLanguage,
        userLocationRef.current
      );
      await streamPromise.catch(() => {});
      setCurrentAnalysis(response);
      const cached = getCachedMarker(response);
      if (!cached) setLastSyncAt(new Date().toISOString());
      // session_id comes back as conversation_id (see api.ts) — send it on follow-ups.
      if (!cached) setActiveConversationId(response.session_id || response.conversation_id);
      fetchConversations().then(setConversations).catch(() => {});
    } catch (err: any) {
      abortCtrl.abort();
      setErrorMessage(err?.message || "An unexpected error occurred while executing the analysis.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCoordinateSelect = (lat: number, lon: number) => {
    handleQuerySubmit(`Analyze ocean conditions and marine safety at coordinate ${lat}°N, ${lon}°E.`);
  };

  const handleExportReport = async () => {
    if (!currentAnalysis) return;
    try {
      const res = await exportMarkdownReport(currentAnalysis);
      setReportMarkdown(res.markdown_content);
      setIsReportOpen(true);
    } catch {
      alert("Failed to generate report export.");
    }
  };

  const handleNewAnalysis = () => {
    traceAbortRef.current?.abort();
    setActiveTraceItems([]);
    setCurrentAnalysis(null);
    setActiveConversationId(undefined);
    setErrorMessage(null);
  };

  const followUpSuggestions = useMemo(() => {
    const rt = currentAnalysis?.visualization_plan?.result_type || currentAnalysis?.intent;
    if (!rt) return undefined;
    if (rt.includes("route")) return ["What about tomorrow evening?", "Why is this route safer?", "Show the alternative route"];
    if (rt.includes("fishing")) return ["Why is the top zone ranked first?", "What about tomorrow evening?", "Show zones with higher chlorophyll"];
    if (rt.includes("spatial")) return ["What changes 50 km offshore instead?", "Compare with the origin conditions", "Is it safe out there?"];
    if (rt.includes("comparison")) return ["Which is safer for fishing?", "What about tomorrow morning?"];
    if (rt.includes("historical") || rt.includes("trend")) return ["What is the forecast for tomorrow?", "Explain the biggest change"];
    return ["What about tomorrow evening?", "Is it safe for small vessels?", "Explain this in Telugu"];
  }, [currentAnalysis]);

  // ── Envelope-derived readouts (contract 1.3.0; legacy aliases as fallback)
  const isClarification =
    currentAnalysis?.intent === "needs_clarification" || currentAnalysis?.needs_clarification === true;
  const clarificationQuestion = isClarification
    ? currentAnalysis?.answer?.headline || currentAnalysis?.clarification_question || undefined
    : undefined;
  const meta = currentAnalysis?.meta;
  const location = meta?.location || currentAnalysis?.location;
  const temporal = meta?.temporal || currentAnalysis?.temporal;
  const verdict = currentAnalysis?.answer?.verdict;
  const band = currentAnalysis?.risk?.band || currentAnalysis?.risk_assessment?.category;
  const score = currentAnalysis?.risk?.score ?? currentAnalysis?.risk_assessment?.overall_score;
  const mode = meta?.mode || currentAnalysis?.mode || "DEMO";
  const showResult = !!currentAnalysis && !isLoading && !isClarification;
  const showEmpty = !currentAnalysis && !isLoading && !errorMessage;
  const cachedMarker = currentAnalysis ? getCachedMarker(currentAnalysis) : null;

  // Elements shared by both UI modes: connectivity, geofence, cache age.
  const geofenceBlock = (
    <GeofenceBanner status={geofence.status} position={geofence.position} lang={selectedLanguage} />
  );
  const trackPlayerBlock = (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          id="orca-demo-track-btn"
          onClick={() => {
            setShowTrackPlayer((v) => !v);
            if (showTrackPlayer) setDemoPos(null);
          }}
          className={`inline-flex items-center gap-1.5 h-14 px-4 rounded-md border text-[13px] font-medium ${
            showTrackPlayer ? "bg-accent/15 border-accent/40 text-accent" : "border-border-base text-muted"
          }`}
        >
          <Play className="w-4 h-4" /> {t("geofence.demo", selectedLanguage)}
        </button>
        {tripCard && (
          <button
            type="button"
            id="orca-trip-card-btn"
            onClick={() => setIsTripCardOpen(true)}
            className="inline-flex items-center gap-1.5 h-14 px-4 rounded-md border border-border-base text-[13px] font-medium text-text"
          >
            <ClipboardList className="w-4 h-4" /> {t("offline.tripCard.open", selectedLanguage)}
          </button>
        )}
      </div>
      {showTrackPlayer && <TrackPlayer onPosition={setDemoPos} lang={selectedLanguage} />}
    </div>
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-base text-text">
      <Sidebar
        conversations={conversations}
        currentConversationId={activeConversationId}
        onSelectConversation={(id) => setActiveConversationId(id)}
        onNewAnalysis={handleNewAnalysis}
        onSelectPrompt={(p) => handleQuerySubmit(p)}
        userRole={userRole}
        onSelectRole={setUserRole}
        onOpenAlerts={() => setIsAlertsOpen(true)}
        alertsCount={alerts.length}
      />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header
          mode={mode}
          activeAlertsCount={alerts.length}
          onOpenAlerts={() => setIsAlertsOpen(true)}
          onExportReport={handleExportReport}
          selectedLanguage={selectedLanguage}
          onSelectLanguage={selectLanguage}
          hasAnalysis={!!currentAnalysis}
          uiMode={fishermanMode ? "fisherman" : "console"}
          onToggleUiMode={() => setUiMode(!fishermanMode)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
        <ConnectivityBanner lang={selectedLanguage} lastSyncAt={lastSyncAt} />

        <EvidenceProvider
          records={currentAnalysis?.evidence}
          risk={currentAnalysis?.risk_assessment}
          isLoading={isLoading}
          queryKey={currentAnalysis?.request_id || currentAnalysis?.query_id}
          onViewOnMap={handleViewOnMap}
        >
          <div className="flex-1 relative min-h-0 overflow-hidden">
            <div
              ref={splitRef}
              className={`h-full w-full flex flex-col md:flex-row ${isDragging ? "select-none cursor-col-resize" : ""}`}
            >
              {/* LEFT — conversation / results column, query bar docked at its foot */}
              <section
                id="orca-results-column"
                className={`min-w-0 flex-col border-r border-border-base ${
                  isDesktop ? "flex h-full flex-shrink-0" : mobileTab === "chat" ? "flex flex-1 min-h-0" : "hidden"
                }`}
                style={isDesktop ? { width: `${leftPct}%` } : undefined}
              >
                {/* Result header: verdict · band · score, derived only from answer.verdict / risk */}
                {currentAnalysis && !isClarification && (
                  <div className="flex-shrink-0 border-b border-border-base bg-panel/40 px-4 py-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        {verdict && (
                          <span
                            id="orca-verdict-readout"
                            className={`num whitespace-nowrap text-[11px] font-semibold tracking-wider px-2 py-0.5 rounded border ${
                              VERDICT_CLASS[verdict] || VERDICT_CLASS.NOT_APPLICABLE
                            }`}
                          >
                            {verdict}
                            {band && <span className={`ml-1.5 ${BAND_CLASS[band] || ""}`}>· {band}</span>}
                            {typeof score === "number" && <span className="ml-1.5 text-text">· {score}/100</span>}
                          </span>
                        )}
                        <span className="text-[12.5px] font-medium text-text truncate">{location?.name ?? "—"}</span>
                      </div>
                      <div className="num text-[10.5px] text-muted mt-0.5 truncate">
                        {location && `${location.latitude.toFixed(3)}°N ${location.longitude.toFixed(3)}°E`}
                        {temporal?.label && ` · ${temporal.label}`}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUiMode(!fishermanMode)}
                      aria-pressed={fishermanMode}
                      className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border text-[11px] font-medium flex-shrink-0 ${
                        fishermanMode ? "bg-accent/15 border-accent/40 text-accent" : "border-border-base text-muted hover:text-text"
                      }`}
                    >
                      <Anchor className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">
                        {fishermanMode ? t("fisherman.exit", selectedLanguage) : t("fisherman.enter", selectedLanguage)}
                      </span>
                    </button>
                  </div>
                )}

                {/* Degraded banner — persistent, not dismissible, for the whole result */}
                {currentAnalysis && meta?.degraded && !isLoading && (
                  <div
                    id="orca-degraded-banner"
                    role="status"
                    className="flex-shrink-0 flex items-start gap-2 px-4 py-2 bg-caution/15 border-b border-caution/40 text-[12px] text-caution"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <div className="space-y-0.5">
                      <div className="font-semibold uppercase tracking-wider text-[10px]">Degraded data</div>
                      {(meta.notes?.length ? meta.notes : ["Some values came from a fallback source."]).map((n) => (
                        <div key={n} className="text-text/90">{n}</div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Scrollable body */}
                <div className="flex-1 min-h-0 overflow-y-auto px-3 md:px-4 py-3 space-y-3">
                  {fishermanMode && !isClarification ? (
                    <FishermanHome
                      analysis={showResult ? currentAnalysis : null}
                      isLoading={isLoading}
                      lang={selectedLanguage}
                      onSubmitQuery={handleQuerySubmit}
                      cachedAt={cachedMarker?.savedAt ?? null}
                      extra={
                        <div className="space-y-3">
                          {errorMessage && (
                            <div className="p-3.5 rounded-md bg-severe/10 border border-severe/40 text-[13px] text-text">
                              <div className="text-severe font-semibold text-[10px] uppercase tracking-wider mb-0.5">Request failed</div>
                              {errorMessage}
                              <button
                                type="button"
                                onClick={() => handleQuerySubmit(lastQueryRef.current)}
                                className="mt-2 inline-flex items-center gap-1.5 h-14 px-4 rounded-md border border-severe/40 text-severe text-[13px] font-medium"
                              >
                                <RotateCcw className="w-4 h-4" /> Retry
                              </button>
                            </div>
                          )}
                          {trackPlayerBlock}
                          {showResult && currentAnalysis && (
                            <>
                              <SaveTripCardButton
                                analysis={currentAnalysis}
                                lang={selectedLanguage}
                                onSaved={(c) => setTripCard(c)}
                              />
                              <FishermanPanel
                                analysis={currentAnalysis}
                                lang={selectedLanguage}
                                alerts={alerts}
                                onSelectLocation={(locName) =>
                                  handleQuerySubmit(`${meta?.query_text || currentAnalysis.query_text} near ${locName}`)
                                }
                              />
                              <AgentActivityFeed
                                steps={currentAnalysis.agent_activity}
                                traceItems={activeTraceItems.length > 0 ? activeTraceItems : undefined}
                                defaultCollapsed={true}
                              />
                            </>
                          )}
                          {!isDesktop && (
                            <button
                              type="button"
                              onClick={() => selectMobileTab("map")}
                              className="w-full h-14 rounded-md border border-border-base bg-panel/60 text-[14px] font-medium text-text inline-flex items-center justify-center gap-2"
                            >
                              <MapIcon className="w-4 h-4" /> {t("fisherman.showMap", selectedLanguage)}
                            </button>
                          )}
                        </div>
                      }
                    >
                      {cachedMarker && <StaleWarning savedAt={cachedMarker.savedAt} lang={selectedLanguage} />}
                      {geofenceBlock}
                    </FishermanHome>
                  ) : (
                  <>
                  {cachedMarker && currentAnalysis && !isLoading && (
                    <StaleWarning savedAt={cachedMarker.savedAt} lang={selectedLanguage} />
                  )}
                  {geofenceBlock}
                  {errorMessage && (
                    <div
                      id="orca-error"
                      className="p-3.5 rounded-md bg-severe/10 border border-severe/40 text-[12.5px] text-text flex items-start justify-between gap-3"
                    >
                      <div>
                        <div className="text-severe font-semibold text-[10px] uppercase tracking-wider mb-0.5">Request failed</div>
                        {errorMessage}
                      </div>
                      <button
                        type="button"
                        id="orca-retry-btn"
                        onClick={() => handleQuerySubmit(lastQueryRef.current)}
                        className="flex-shrink-0 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-severe/40 text-severe text-[11px] font-medium hover:bg-severe/10"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Retry
                      </button>
                    </div>
                  )}

                  {showEmpty && (
                    <div className="pt-2 space-y-3">
                      <div className="text-[10px] uppercase tracking-wider text-muted font-semibold">Canonical queries</div>
                      <div id="orca-canonical-queries" className="flex flex-col gap-1.5">
                        {CANONICAL_QUERIES.map((q) => (
                          <button
                            key={q}
                            type="button"
                            onClick={() => handleQuerySubmit(q)}
                            className="text-left px-3 py-2 rounded-md border border-border-base bg-panel/50 hover:border-accent/40 hover:bg-panel text-[12.5px] text-text/90 leading-snug"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                      <p className="text-[11px] text-muted">
                        Or click any point on the map to analyse that coordinate.
                      </p>
                    </div>
                  )}

                  {isLoading && (
                    <div className="space-y-3 pt-1">
                      <div className="text-[12px] text-muted">
                        <span className="text-text/80">You asked:</span> {lastQueryRef.current}
                      </div>
                      {fishermanMode && (
                        <div className="text-[13px] text-text font-medium flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
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

                  {currentAnalysis && !isLoading && isClarification && (
                    <ClarificationCard
                      question={clarificationQuestion}
                      missingInfo={currentAnalysis.missing_information}
                      onSelectLocation={(locName) => handleQuerySubmit(locName)}
                    />
                  )}

                  {showResult && (
                    <div className="orca-data-arrive space-y-3">
                      <ResultContainer
                        analysis={currentAnalysis}
                        onSelectLocation={(locName) =>
                          handleQuerySubmit(`${meta?.query_text || currentAnalysis.query_text} near ${locName}`)
                        }
                      />
                      <AgentActivityFeed
                        steps={currentAnalysis.agent_activity}
                        traceItems={activeTraceItems.length > 0 ? activeTraceItems : undefined}
                        defaultCollapsed={true}
                      />
                      <EvidenceRegistry />
                      <SummaryTable analysis={currentAnalysis} selectedLanguage={selectedLanguage} />
                      <SaveTripCardButton analysis={currentAnalysis} lang={selectedLanguage} onSaved={(c) => setTripCard(c)} />
                    </div>
                  )}
                  {trackPlayerBlock}
                  </>
                  )}
                </div>

                {/* Query bar — docked bottom-left (console mode; fisherman mode has its own) */}
                {(!fishermanMode || isClarification) && (
                <div id="orca-query-dock" className="flex-shrink-0 border-t border-border-base bg-panel/60 px-3 md:px-4 py-3">
                  <QueryInput
                    onSubmit={handleQuerySubmit}
                    isLoading={isLoading}
                    onFollowUp={(f) => handleQuerySubmit(f)}
                    suggestions={showResult ? followUpSuggestions : undefined}
                    enableVoice={fishermanMode}
                    voiceLang={selectedLanguage}
                    prompt={clarificationQuestion}
                  />
                </div>
                )}
              </section>

              {isDesktop && (
                <div
                  role="separator"
                  aria-orientation="vertical"
                  aria-label="Resize conversation and map"
                  onPointerDown={startDrag}
                  className="relative flex-shrink-0 w-1.5 cursor-col-resize group"
                >
                  <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-border-base group-hover:bg-accent/60" />
                </div>
              )}

              {/* RIGHT — persistent marine map. NEVER unmounts. */}
              <section
                id="orca-map-column"
                className={`min-w-0 relative ${isDragging ? "pointer-events-none" : ""} ${
                  isDesktop ? "flex-1 h-full" : mobileTab === "map" ? "flex-1 min-h-0" : "hidden"
                }`}
              >
                <div className="w-full h-full">
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

            {/* Mobile tab switcher — both panes stay mounted */}
            <div className="md:hidden absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 p-1 rounded-md bg-panel/95 backdrop-blur border border-border-base">
              <button
                onClick={() => selectMobileTab("chat")}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-medium ${
                  mobileTab === "chat" ? "bg-accent text-base" : "text-muted"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" /> {fishermanMode ? t("fisherman.home", selectedLanguage) : "Console"}
              </button>
              <button
                onClick={() => selectMobileTab("map")}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-medium ${
                  mobileTab === "map" ? "bg-accent text-base" : "text-muted"
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" /> Map
              </button>
            </div>
          </div>
          <EvidencePanel />
        </EvidenceProvider>
      </div>

      <AlertsModal isOpen={isAlertsOpen} onClose={() => setIsAlertsOpen(false)} alerts={alerts} />
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-base/90 backdrop-blur-sm overflow-y-auto" role="dialog" aria-modal="true">
          <div className="max-w-lg mx-auto p-4">
            <BackendSettings lang={selectedLanguage} onClose={() => setIsSettingsOpen(false)} />
          </div>
        </div>
      )}
      {isTripCardOpen && tripCard && (
        <div className="fixed inset-0 z-50 bg-base/95 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="max-w-lg mx-auto p-4">
            <div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={() => setIsTripCardOpen(false)}
                className="h-14 w-14 rounded-md border border-border-base text-text inline-flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <TripCard card={tripCard} lang={selectedLanguage} onClose={() => setIsTripCardOpen(false)} />
          </div>
        </div>
      )}
      <ReportModal isOpen={isReportOpen} onClose={() => setIsReportOpen(false)} reportContent={reportMarkdown} />
    </div>
  );
}
