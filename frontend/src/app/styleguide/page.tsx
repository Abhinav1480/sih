"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Waves,
  ArrowLeft,
  Compass,
  Search,
  Send,
  Download,
  AlertTriangle,
  Radio,
  Clock,
  Shield,
  Layers,
  Sparkles,
  Check,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Filter,
} from "lucide-react";
import {
  Button,
  IconButton,
  Input,
  Textarea,
  Select,
  Badge,
  StatusBadge,
  Pill,
  Panel,
  Section,
  Divider,
  Metric,
  Measurement,
  Coordinate,
  Timestamp,
  Duration,
  Distance,
  Percentage,
  RiskBadge,
  RiskIndicator,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Tabs,
  Tooltip,
  EmptyState,
  LoadingState,
  ErrorState,
} from "@/components/ui";
import { RiskGauge, RiskFactorList, RiskIntelligenceModule } from "@/components/Risk";
import { colors, spacing, radius, typography, breakpoints } from "@/lib/tokens";

export default function StyleguidePage() {
  const [selectedPill, setSelectedPill] = useState<string>("visakhapatnam");
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [inputValue, setInputValue] = useState<string>("");
  const [inputError, setInputError] = useState<string>("");

  const SECTIONS = [
    { id: "colors", label: "1. Colors" },
    { id: "typography", label: "2. Typography" },
    { id: "spacing", label: "3. Spacing" },
    { id: "buttons", label: "4. Buttons" },
    { id: "inputs", label: "5. Inputs & Forms" },
    { id: "badges", label: "6. Badges & Pills" },
    { id: "status", label: "7. Status States" },
    { id: "risk", label: "8. Risk System" },
    { id: "panels", label: "9. Panels & Sections" },
    { id: "metrics", label: "10. Metrics & Data" },
    { id: "tables", label: "11. Tables" },
    { id: "responsive", label: "12. Responsive Matrix" },
  ];

  return (
    <div className="min-h-screen bg-bg-base text-text-primary flex flex-col antialiased selection:bg-accent-base selection:text-bg-base">
      {/* Top Console Navigation Bar */}
      <header className="sticky top-0 z-sticky h-14 bg-surface-base/95 backdrop-blur border-b border-border-base px-4 md:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-mono text-text-secondary hover:text-accent-base transition-colors mr-2 group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>ORCA App</span>
          </Link>
          <div className="h-4 w-[1px] bg-border-base" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-surface-elevated border border-accent-base/30 flex items-center justify-center">
              <Waves className="w-4 h-4 text-accent-base" />
            </div>
            <div>
              <span className="font-display font-bold text-sm text-text-primary tracking-tight">
                ORCA Design System
              </span>
              <span className="text-[10px] font-mono text-accent-base ml-2 px-1.5 py-0.2 rounded bg-accent-base/10 border border-accent-base/25">
                FE-01 Foundation
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <StatusBadge status="LIVE" size="sm" />
          <span className="text-[11px] font-mono text-text-muted hidden md:inline">
            SIH 2026 · PS 26176
          </span>
        </div>
      </header>

      {/* Subnav Anchor Jump Bar */}
      <nav className="sticky top-14 z-raised bg-surface-subtle/90 backdrop-blur border-b border-border-subtle px-4 md:px-6 py-2 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 min-w-max">
          {SECTIONS.map((sec) => (
            <a
              key={sec.id}
              href={`#${sec.id}`}
              className="text-xs font-mono text-text-secondary hover:text-accent-base hover:bg-surface-elevated px-2 py-1 rounded transition-colors"
            >
              {sec.label}
            </a>
          ))}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-8 py-8 space-y-12">
        {/* Intro Mission Control Header */}
        <div className="space-y-2 border-b border-border-base pb-6">
          <h1 className="orca-display text-text-primary">
            Maritime Operations Console Design System
          </h1>
          <p className="text-sm text-text-secondary max-w-2xl leading-relaxed">
            Standardized design tokens, atomic UI primitives, and guidelines for the ORCA Marine Intelligence platform.
            Engineered for high information density, mission-critical calm, and mathematical precision across Indian coastal waters.
          </p>
        </div>

        {/* ==================================================
            1. COLORS
        ================================================== */}
        <section id="colors" className="space-y-4">
          <div className="flex items-center justify-between border-b border-border-subtle pb-2">
            <h2 className="orca-heading text-text-primary">1. Color Tokens</h2>
            <span className="text-xs font-mono text-text-muted">Semantic Ocean Palette</span>
          </div>

          <div className="space-y-6">
            {/* Backgrounds & Surfaces */}
            <div>
              <h3 className="text-xs font-mono uppercase tracking-wider text-text-secondary mb-2.5">
                Surfaces & Backgrounds
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-md bg-[#040914] border border-border-base space-y-1">
                  <div className="text-xs font-mono font-bold text-text-primary">bg.base</div>
                  <div className="text-[11px] font-mono text-text-muted">#040914</div>
                  <div className="text-[10px] text-text-secondary">Abyssal floor backdrop</div>
                </div>
                <div className="p-3 rounded-md bg-[#071226] border border-border-base space-y-1">
                  <div className="text-xs font-mono font-bold text-text-primary">bg.elevated</div>
                  <div className="text-[11px] font-mono text-text-muted">#071226</div>
                  <div className="text-[10px] text-text-secondary">Elevated backdrop</div>
                </div>
                <div className="p-3 rounded-md bg-[#0b1834] border border-border-base space-y-1">
                  <div className="text-xs font-mono font-bold text-text-primary">surface.base</div>
                  <div className="text-[11px] font-mono text-text-muted">#0b1834</div>
                  <div className="text-[10px] text-text-secondary">Standard panel container</div>
                </div>
                <div className="p-3 rounded-md bg-[#0f2042] border border-border-base space-y-1">
                  <div className="text-xs font-mono font-bold text-text-primary">surface.elevated</div>
                  <div className="text-[11px] font-mono text-text-muted">#0f2042</div>
                  <div className="text-[10px] text-text-secondary">Interactive raised surface</div>
                </div>
              </div>
            </div>

            {/* Accents & Brand */}
            <div>
              <h3 className="text-xs font-mono uppercase tracking-wider text-text-secondary mb-2.5">
                Brand & Accents
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-md bg-surface-base border border-border-base space-y-1">
                  <div className="h-6 w-full rounded bg-[#00f0d0] mb-2" />
                  <div className="text-xs font-mono font-bold text-text-primary">accent.base</div>
                  <div className="text-[11px] font-mono text-text-muted">#00f0d0 (Marine Cyan)</div>
                </div>
                <div className="p-3 rounded-md bg-surface-base border border-border-base space-y-1">
                  <div className="h-6 w-full rounded bg-[#00b4d8] mb-2" />
                  <div className="text-xs font-mono font-bold text-text-primary">accent.strong</div>
                  <div className="text-[11px] font-mono text-text-muted">#00b4d8 (Deep Teal)</div>
                </div>
                <div className="p-3 rounded-md bg-surface-base border border-border-base space-y-1">
                  <div className="h-6 w-full rounded bg-[#00f0d0]/15 border border-[#00f0d0]/30 mb-2" />
                  <div className="text-xs font-mono font-bold text-text-primary">accent.soft</div>
                  <div className="text-[11px] font-mono text-text-muted">rgba(0, 240, 208, 0.12)</div>
                </div>
              </div>
            </div>

            {/* Semantic Feedback & Risk Ramp */}
            <div>
              <h3 className="text-xs font-mono uppercase tracking-wider text-text-secondary mb-2.5">
                Deterministic Risk Ramp & Semantic State
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-md bg-nominal/10 border border-nominal/35 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-nominal">
                    <span className="w-2 h-2 rounded-full bg-nominal" />
                    LOW RISK
                  </div>
                  <div className="text-[11px] font-mono text-nominal/80">#10b981 · 0–24</div>
                </div>
                <div className="p-3 rounded-md bg-advisory/10 border border-advisory/35 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-advisory">
                    <span className="w-2 h-2 rounded-full bg-advisory" />
                    MODERATE
                  </div>
                  <div className="text-[11px] font-mono text-advisory/80">#f59e0b · 25–49</div>
                </div>
                <div className="p-3 rounded-md bg-orange-500/10 border border-orange-500/35 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-orange-400">
                    <span className="w-2 h-2 rounded-full bg-orange-400" />
                    HIGH RISK
                  </div>
                  <div className="text-[11px] font-mono text-orange-400/80">#f97316 · 50–74</div>
                </div>
                <div className="p-3 rounded-md bg-hazard/10 border border-hazard/35 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-hazard">
                    <span className="w-2 h-2 rounded-full bg-hazard animate-pulse" />
                    SEVERE
                  </div>
                  <div className="text-[11px] font-mono text-hazard/80">#ef4444 · 75–100</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================
            2. TYPOGRAPHY
        ================================================== */}
        <section id="typography" className="space-y-4">
          <div className="flex items-center justify-between border-b border-border-subtle pb-2">
            <h2 className="orca-heading text-text-primary">2. Typography Scale</h2>
            <span className="text-xs font-mono text-text-muted">Outfit / Inter / JetBrains Mono</span>
          </div>

          <Panel noPadding className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Style Token</TableHead>
                  <TableHead>Font / Weight</TableHead>
                  <TableHead>Size / Line</TableHead>
                  <TableHead>Sample Output</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell mono className="text-accent-base">display</TableCell>
                  <TableCell>Outfit 700</TableCell>
                  <TableCell mono>28px / 34px</TableCell>
                  <TableCell><span className="orca-display text-text-primary">ORCA Intelligence</span></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell mono className="text-accent-base">heading</TableCell>
                  <TableCell>Outfit 600</TableCell>
                  <TableCell mono>20px / 26px</TableCell>
                  <TableCell><span className="orca-heading text-text-primary">Marine Safety Assessment</span></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell mono className="text-accent-base">subheading</TableCell>
                  <TableCell>Inter 600</TableCell>
                  <TableCell mono>16px / 22px</TableCell>
                  <TableCell><span className="orca-subheading text-text-primary">Coastal EEZ Sector 4</span></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell mono className="text-accent-base">body</TableCell>
                  <TableCell>Inter 400</TableCell>
                  <TableCell mono>14px / 20px</TableCell>
                  <TableCell><span className="orca-body text-text-secondary">Sustained surface winds within normal operating limits.</span></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell mono className="text-accent-base">small</TableCell>
                  <TableCell>Inter 400</TableCell>
                  <TableCell mono>12px / 16px</TableCell>
                  <TableCell><span className="orca-small text-text-muted">Observation calibrated via Jason-3 altimetry.</span></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell mono className="text-accent-base">caption</TableCell>
                  <TableCell>Inter 500</TableCell>
                  <TableCell mono>11px / 14px</TableCell>
                  <TableCell><span className="orca-caption text-text-secondary uppercase tracking-wider">MoEFCC RESTRICTION</span></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell mono className="text-accent-base">monoValue</TableCell>
                  <TableCell>JetBrains Mono 500</TableCell>
                  <TableCell mono>13px / 18px</TableCell>
                  <TableCell><span className="orca-mono-value text-accent-base">2.96 m SWH · 26.3 kt</span></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell mono className="text-accent-base">monoMeta</TableCell>
                  <TableCell>JetBrains Mono 400</TableCell>
                  <TableCell mono>11px / 14px</TableCell>
                  <TableCell><span className="orca-mono-meta text-text-muted">17.687°N, 83.219°E</span></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Panel>
        </section>

        {/* ==================================================
            3. SPACING
        ================================================== */}
        <section id="spacing" className="space-y-4">
          <div className="flex items-center justify-between border-b border-border-subtle pb-2">
            <h2 className="orca-heading text-text-primary">3. Spacing Scale</h2>
            <span className="text-xs font-mono text-text-muted">4px Grid System</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { token: "3xs", px: 4 },
              { token: "2xs", px: 8 },
              { token: "xs", px: 12 },
              { token: "sm", px: 16 },
              { token: "md", px: 20 },
              { token: "lg", px: 24 },
              { token: "xl", px: 32 },
              { token: "2xl", px: 40 },
              { token: "3xl", px: 48 },
              { token: "4xl", px: 64 },
            ].map((sp) => (
              <div key={sp.token} className="p-3 rounded bg-surface-base border border-border-base space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-accent-base">{sp.token}</span>
                  <span className="text-text-muted">{sp.px}px</span>
                </div>
                <div className="bg-surface-elevated rounded h-5 flex items-center px-1">
                  <div
                    className="h-3 rounded bg-accent-base/40"
                    style={{ width: `${Math.min(sp.px, 120)}px` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ==================================================
            4. BUTTONS
        ================================================== */}
        <section id="buttons" className="space-y-4">
          <div className="flex items-center justify-between border-b border-border-subtle pb-2">
            <h2 className="orca-heading text-text-primary">4. Buttons &amp; Actions</h2>
            <span className="text-xs font-mono text-text-muted">Variants &amp; Keyboard Focusable</span>
          </div>

          <Panel title="Button Variants" description="All buttons support visible focus, loading, disabled, and icon slots">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary">Primary Action</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Hazard Action</Button>
              <Button variant="secondary" isLoading>Synthesizing</Button>
              <Button variant="secondary" disabled>Disabled</Button>
            </div>

            <Divider label="Button Sizes & Icons" />

            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm" variant="secondary" leftIcon={<Filter className="w-3.5 h-3.5" />}>
                Filter (sm)
              </Button>
              <Button size="md" variant="primary" rightIcon={<ArrowLeft className="w-4 h-4 rotate-180" />}>
                Execute Analysis (md)
              </Button>
              <Button size="lg" variant="outline" leftIcon={<Download className="w-4 h-4" />}>
                Export Advisory (lg)
              </Button>
              <IconButton aria-label="Search telemetry" size="md" variant="secondary">
                <Search className="w-4 h-4" />
              </IconButton>
              <IconButton aria-label="Refresh feeds" size="md" variant="outline">
                <RefreshCw className="w-4 h-4" />
              </IconButton>
            </div>
          </Panel>
        </section>

        {/* ==================================================
            5. INPUTS & FORMS
        ================================================== */}
        <section id="inputs" className="space-y-4">
          <div className="flex items-center justify-between border-b border-border-subtle pb-2">
            <h2 className="orca-heading text-text-primary">5. Inputs &amp; Controls</h2>
            <span className="text-xs font-mono text-text-muted">Technical Console Inputs</span>
          </div>

          <Panel title="Input States" description="High contrast inputs with focus rings and optional icon decorators">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Coordinates Query"
                placeholder="e.g. 17.687°N, 83.219°E"
                leftIcon={<Compass className="w-4 h-4" />}
                helperText="Supports decimal degrees or port names"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />

              <Input
                label="Target Port with Error"
                placeholder="Port name"
                leftIcon={<Search className="w-4 h-4" />}
                error="Invalid coastal jurisdiction"
                defaultValue="Unknown Harbour"
              />

              <Select
                label="Operational Role Persona"
                defaultValue="fisherman"
                options={[
                  { value: "fisherman", label: "Commercial Fisherman (Deep-Sea)" },
                  { value: "master", label: "Maritime Vessel Master" },
                  { value: "disaster", label: "Disaster Management Authority" },
                  { value: "researcher", label: "Marine Ecologist" },
                ]}
              />

              <Input
                label="Disabled Sensor Feed"
                disabled
                defaultValue="INCOIS Buoy BD10 (Maintenance)"
                helperText="Sensor temporarily offline"
              />
            </div>

            <div className="mt-4">
              <Textarea
                label="Advisory Observation Notes"
                placeholder="Enter navigational notes, weather observations, or local conditions..."
                rows={3}
              />
            </div>
          </Panel>
        </section>

        {/* ==================================================
            6. BADGES & PILLS
        ================================================== */}
        <section id="badges" className="space-y-4">
          <div className="flex items-center justify-between border-b border-border-subtle pb-2">
            <h2 className="orca-heading text-text-primary">6. Badges &amp; Filter Pills</h2>
            <span className="text-xs font-mono text-text-muted">Categorical &amp; Filter Elements</span>
          </div>

          <Panel title="Badge Variants" description="Compact uppercase monospace tags with optional dot indicators">
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge variant="default">DEFAULT</Badge>
              <Badge variant="accent" dot>ORCA AGENT</Badge>
              <Badge variant="success" dot>INCOIS OSF</Badge>
              <Badge variant="warning" dot>SWELL ADVISORY</Badge>
              <Badge variant="danger" dot>NO-TAKE MPA</Badge>
              <Badge variant="info" dot>COPERNICUS</Badge>
            </div>

            <Divider label="Interactive Filter Pills" />

            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: "visakhapatnam", label: "Visakhapatnam" },
                { id: "kakinada", label: "Kakinada" },
                { id: "chennai", label: "Chennai" },
                { id: "paradip", label: "Paradip" },
                { id: "tuticorin", label: "V.O. Chidambaranar" },
              ].map((pill) => (
                <Pill
                  key={pill.id}
                  selected={selectedPill === pill.id}
                  onClick={() => setSelectedPill(pill.id)}
                >
                  {pill.label}
                </Pill>
              ))}
            </div>
          </Panel>
        </section>

        {/* ==================================================
            7. STATUS STATES
        ================================================== */}
        <section id="status" className="space-y-4">
          <div className="flex items-center justify-between border-b border-border-subtle pb-2">
            <h2 className="orca-heading text-text-primary">7. Status &amp; Data Freshness</h2>
            <span className="text-xs font-mono text-text-muted">Always Icon + Text (Never Color Alone)</span>
          </div>

          <Panel title="Data Freshness Badges" description="Authoritative status badges for multi-source ocean telemetry">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status="LIVE" />
              <StatusBadge status="FORECAST" />
              <StatusBadge status="CACHED" />
              <StatusBadge status="HISTORICAL" />
              <StatusBadge status="DEMO" />
            </div>

            <Divider label="Alert Severity Badges" />

            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status="INFO" />
              <StatusBadge status="CAUTION" />
              <StatusBadge status="WARNING" />
              <StatusBadge status="SEVERE" />
            </div>
          </Panel>
        </section>

        {/* ==================================================
            8. RISK SYSTEM
        ================================================== */}
        <section id="risk" className="space-y-4">
          <div className="flex items-center justify-between border-b border-border-subtle pb-2">
            <h2 className="orca-heading text-text-primary">8. Marine Risk Presentation &amp; Factor Decomposition</h2>
            <span className="text-xs font-mono text-text-muted">FE-05 Authoritative Risk Intelligence</span>
          </div>

          <Panel title="Calibrated Segmented Risk Gauges" description="Clean mission-control indicators with dominant bands and verdict pairing">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-surface-subtle border border-border-subtle">
                <RiskGauge score={14} band="LOW" verdict="GO" label="COASTAL SAFETY" />
              </div>
              <div className="p-4 rounded-xl bg-surface-subtle border border-border-subtle">
                <RiskGauge score={30} band="MODERATE" verdict="CAUTION" label="PASSAGE HAZARD" />
              </div>
              <div className="p-4 rounded-xl bg-surface-subtle border border-border-subtle">
                <RiskGauge score={74} band="HIGH" verdict="NO_GO" label="CORRIDOR RISK (TEST CASE: 74)" />
              </div>
              <div className="p-4 rounded-xl bg-surface-subtle border border-border-subtle">
                <RiskGauge score={88} band="SEVERE" verdict="NO_GO" label="CYCLONE SQUALL WARNING" />
              </div>
            </div>
          </Panel>

          <Panel title="Deterministic Factor Decomposition (Score = 74 Test Case)" description="Points sum faithfully to total score (32 + 22 + 12 + 8 = 74 pts)">
            <RiskFactorList
              overallScore={74}
              factors={[
                {
                  name: "Significant Wave Height (SWH)",
                  value: "3.2 m",
                  points_added: 32,
                  description: "SWH above 3.0 m: INCOIS high wave alert threshold for small-craft restriction",
                  weight: 0.4,
                },
                {
                  name: "Surface Wind Velocity",
                  value: "24.5 kt (45.4 km/h)",
                  points_added: 22,
                  description: "IMD Squally Wind Advisory: Surface winds exceed safe offshore operational limits",
                  weight: 0.3,
                },
                {
                  name: "Swell Wave Surge",
                  value: "2.4 m (Period: 9.5s)",
                  points_added: 12,
                  description: "INCOIS Swell Surge Alert: High swell creates hazardous coastal surf breaking",
                  weight: 0.15,
                },
                {
                  name: "MoEFCC Geofence Sanctuary Proximity",
                  value: "Buffer Clearance 3.2 km",
                  points_added: 8,
                  description: "Proximity caution: within 5 km of protected marine sanctuary boundary",
                  weight: 0.15,
                },
              ]}
              triggeredRules={[
                "INCOIS High Wave Alert: SWH 3.2m exceeds 3.0m threshold",
                "IMD Squally Wind Advisory: 24.5 kt surface wind warning active",
              ]}
              dataQualityLabel="Authoritative INCOIS OSF & IMD Calibrated Marine Telemetry"
              showTotalCheck={true}
              defaultExpanded={true}
            />
          </Panel>

          <Panel title="Risk Badges &amp; Score Meters" description="Values reflect deterministic backend calculations">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-3 rounded bg-surface-subtle border border-border-subtle space-y-3">
                <RiskBadge category="LOW" score={12} size="md" />
                <RiskIndicator category="LOW" score={12} />
              </div>
              <div className="p-3 rounded bg-surface-subtle border border-border-subtle space-y-3">
                <RiskBadge category="MODERATE" score={42} size="md" />
                <RiskIndicator category="MODERATE" score={42} />
              </div>
              <div className="p-3 rounded bg-surface-subtle border border-border-subtle space-y-3">
                <RiskBadge category="HIGH" score={68} size="md" />
                <RiskIndicator category="HIGH" score={68} />
              </div>
              <div className="p-3 rounded bg-surface-subtle border border-border-subtle space-y-3">
                <RiskBadge category="SEVERE" score={89} size="md" />
                <RiskIndicator category="SEVERE" score={89} />
              </div>
            </div>
          </Panel>
        </section>

        {/* ==================================================
            9. PANELS VS SECTIONS
        ================================================== */}
        <section id="panels" className="space-y-4">
          <div className="flex items-center justify-between border-b border-border-subtle pb-2">
            <h2 className="orca-heading text-text-primary">9. Panel vs. Section Architecture</h2>
            <span className="text-xs font-mono text-text-muted">Avoids Card-inside-Card nesting</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Panel Example */}
            <Panel
              title="Operational Panel (Genuinely Contained)"
              description="Used when content requires explicit visual containment and framing"
              icon={<Layers className="w-4 h-4" />}
              footer={<span>Status: Synchronized with coastal radars</span>}
            >
              <p className="text-xs text-text-secondary leading-relaxed">
                Panels provide elevated boundaries for complex multi-agent intelligence modules, map sidebars, and advisory dossiers.
              </p>
            </Panel>

            {/* Section Example */}
            <div className="p-4 rounded-lg bg-surface-base border border-border-base">
              <Section
                title="Section (Flat Content Separation)"
                subtitle="Divided by spacing and clean hairlines rather than nesting cards within cards"
                divider
              >
                <p className="text-xs text-text-secondary leading-relaxed">
                  Sections allow information-dense mission control telemetry to breathe without creating heavy boxed enclosures.
                </p>
              </Section>
            </div>
          </div>
        </section>

        {/* ==================================================
            10. METRICS & DATA DISPLAY
        ================================================== */}
        <section id="metrics" className="space-y-4">
          <div className="flex items-center justify-between border-b border-border-subtle pb-2">
            <h2 className="orca-heading text-text-primary">10. Metrics &amp; Technical Values</h2>
            <span className="text-xs font-mono text-text-muted">Monospace Measurements &amp; Units</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Metric
              label="Significant Wave Height"
              value="2.96"
              unit="m"
              subtext="Sea State: Rough"
              delta={{ value: "+0.4m", direction: "up", isFavorable: false }}
            />
            <Metric
              label="Sustained Surface Wind"
              value="26.3"
              unit="kt"
              subtext="Direction: 142° SE"
              delta={{ value: "+3.1kt", direction: "up", isFavorable: false }}
            />
            <Metric
              label="Sea Surface Temp (SST)"
              value="29.8"
              unit="°C"
              subtext="MODIS Multi-Sensor"
              delta={{ value: "-0.2°C", direction: "down", isFavorable: true }}
            />
            <Metric
              label="Chlorophyll-a"
              value="1.84"
              unit="mg/m³"
              subtext="PFZ Favorable Front"
              delta={{ value: "+0.5", direction: "up", isFavorable: true }}
            />
          </div>

          <Panel title="Technical Value Primitives" description="Exact inline values formatted with monospace numbers">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-text-muted text-[10px] font-mono uppercase block">Measurement</span>
                <Measurement value={2.96} unit="m" highlight />
              </div>
              <div className="space-y-1">
                <span className="text-text-muted text-[10px] font-mono uppercase block">Coordinates</span>
                <Coordinate lat={17.6868} lon={83.2185} />
              </div>
              <div className="space-y-1">
                <span className="text-text-muted text-[10px] font-mono uppercase block">Timestamp</span>
                <Timestamp date={new Date().toISOString()} format="utc" />
              </div>
              <div className="space-y-1">
                <span className="text-text-muted text-[10px] font-mono uppercase block">Voyage Duration</span>
                <Duration hours={4.75} />
              </div>
              <div className="space-y-1">
                <span className="text-text-muted text-[10px] font-mono uppercase block">Nautical Distance</span>
                <Distance km={42.5} unit="nm" />
              </div>
              <div className="space-y-1">
                <span className="text-text-muted text-[10px] font-mono uppercase block">PFZ Suitability</span>
                <Percentage value={87.4} showSign />
              </div>
            </div>
          </Panel>
        </section>

        {/* ==================================================
            11. TABLES
        ================================================== */}
        <section id="tables" className="space-y-4">
          <div className="flex items-center justify-between border-b border-border-subtle pb-2">
            <h2 className="orca-heading text-text-primary">11. Technical Table System</h2>
            <span className="text-xs font-mono text-text-muted">Numeric Right-Alignment &amp; Status Cells</span>
          </div>

          <Panel noPadding>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zone ID</TableHead>
                  <TableHead>Target Area</TableHead>
                  <TableHead align="right" mono>Distance</TableHead>
                  <TableHead align="right" mono>Wave Height</TableHead>
                  <TableHead align="right" mono>SST</TableHead>
                  <TableHead align="right" mono>Chlorophyll</TableHead>
                  <TableHead>Advisory Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow selected>
                  <TableCell mono className="text-accent-base font-semibold">PFZ-01</TableCell>
                  <TableCell className="font-medium">Offshore Visakhapatnam East</TableCell>
                  <TableCell align="right" mono><Distance km={32.4} /></TableCell>
                  <TableCell align="right" mono><Measurement value={1.4} unit="m" /></TableCell>
                  <TableCell align="right" mono><Measurement value={28.6} unit="°C" /></TableCell>
                  <TableCell align="right" mono><Measurement value={2.1} unit="mg/m³" /></TableCell>
                  <TableCell><Badge variant="success" dot>HIGHLY SUITABLE</Badge></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell mono className="text-accent-base">PFZ-02</TableCell>
                  <TableCell>Bheemunipatnam Corridor</TableCell>
                  <TableCell align="right" mono><Distance km={18.2} /></TableCell>
                  <TableCell align="right" mono><Measurement value={1.7} unit="m" /></TableCell>
                  <TableCell align="right" mono><Measurement value={28.2} unit="°C" /></TableCell>
                  <TableCell align="right" mono><Measurement value={1.8} unit="mg/m³" /></TableCell>
                  <TableCell><Badge variant="accent" dot>FAVORABLE</Badge></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell mono className="text-accent-base">PFZ-03</TableCell>
                  <TableCell>Coringa South Bank</TableCell>
                  <TableCell align="right" mono><Distance km={54.0} /></TableCell>
                  <TableCell align="right" mono><Measurement value={2.6} unit="m" /></TableCell>
                  <TableCell align="right" mono><Measurement value={27.9} unit="°C" /></TableCell>
                  <TableCell align="right" mono><Measurement value={1.2} unit="mg/m³" /></TableCell>
                  <TableCell><Badge variant="warning" dot>CAUTION (SWELL)</Badge></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Panel>
        </section>

        {/* ==================================================
            12. RESPONSIVE BREAKPOINT MATRIX
        ================================================== */}
        <section id="responsive" className="space-y-4">
          <div className="flex items-center justify-between border-b border-border-subtle pb-2">
            <h2 className="orca-heading text-text-primary">12. Responsive Breakpoint Matrix</h2>
            <span className="text-xs font-mono text-text-muted">Mobile to Mission Control</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { bp: "sm", width: "390px", label: "Mobile Handheld", desc: "Fisherman VHF field terminal" },
              { bp: "md", width: "768px", label: "Tablet Portrait", desc: "Patrol vessel console pane" },
              { bp: "lg", width: "1024px", label: "Compact Desktop", desc: "Port operations terminal" },
              { bp: "xl", width: "1280px", label: "Standard Desktop", desc: "Marine GIS workstation" },
              { bp: "2xl", width: "1440px+", label: "Wide Console", desc: "Full command center display" },
            ].map((item) => (
              <div key={item.bp} className="p-3 rounded bg-surface-base border border-border-base space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-accent-base">{item.bp}</span>
                  <span className="text-[11px] font-mono text-text-muted">{item.width}</span>
                </div>
                <div className="text-xs font-semibold text-text-primary">{item.label}</div>
                <div className="text-[11px] text-text-secondary leading-snug">{item.desc}</div>
              </div>
            ))}
          </div>

          <Panel title="Feedback &amp; Exception States" description="Standardized empty, loading, and error states">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <EmptyState
                title="No Route Waypoints"
                description="Select origin and destination harbors on the interactive chart to compute route."
              />
              <LoadingState
                message="Querying Copernicus Altimetry"
                subtext="Synthesizing ocean current anomalies"
              />
              <ErrorState
                title="Telemetry Timeout"
                message="IMD Mausam radar stream unreachable. Falling back to cached forecast."
                onRetry={() => alert("Retrying telemetry sync...")}
              />
            </div>
          </Panel>
        </section>
      </main>
    </div>
  );
}
