"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { EvidenceRecord, DeterministicRiskResult } from "@/lib/types";
import { dedupeById, matchRecord, parseCoordinates } from "./evidenceUtils";

export type EvidenceMode = "record" | "registry" | "calculation";

interface EvidenceContextValue {
  /** Deduped evidence records for the CURRENT result only. */
  records: EvidenceRecord[];
  risk?: DeterministicRiskResult;
  isLoading: boolean;

  isOpen: boolean;
  mode: EvidenceMode;
  focusedId: string | null;

  /** Open the drawer focused on the evidence behind a specific value. */
  openWhy: (variableHint: string, title?: string) => void;
  /** Open the consolidated registry of every source for this result. */
  openRegistry: () => void;
  /** Open the derived-calculation view (risk factors). */
  openCalculation: () => void;
  /** Focus a specific record by id within the open drawer. */
  focusRecord: (id: string) => void;
  /** Return to the consolidated registry view (keeps the drawer open). */
  backToRegistry: () => void;
  close: () => void;

  /** Center the persistent map on a record's coordinates (no remount). */
  viewOnMap: (rec: EvidenceRecord) => void;
  /** Whether a given record can be shown on the map (has parseable coords). */
  canViewOnMap: (rec: EvidenceRecord) => boolean;
}

const EvidenceContext = createContext<EvidenceContextValue | null>(null);

export function useEvidence(): EvidenceContextValue {
  const ctx = useContext(EvidenceContext);
  if (!ctx) {
    throw new Error("useEvidence must be used within an <EvidenceProvider>");
  }
  return ctx;
}

interface EvidenceProviderProps {
  records?: EvidenceRecord[];
  risk?: DeterministicRiskResult;
  isLoading?: boolean;
  /** Identifies the current query/result; changing it resets drawer state. */
  queryKey?: string;
  /** Delegate to the persistent MapView's fly-to (never creates a new map). */
  onViewOnMap?: (lat: number, lon: number, label?: string) => void;
  children: React.ReactNode;
}

export const EvidenceProvider: React.FC<EvidenceProviderProps> = ({
  records,
  risk,
  isLoading = false,
  queryKey,
  onViewOnMap,
  children,
}) => {
  const deduped = useMemo(() => dedupeById(records), [records]);

  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<EvidenceMode>("registry");
  const [focusedId, setFocusedId] = useState<string | null>(null);

  // Focus restoration: remember the element that opened the drawer.
  const triggerRef = useRef<HTMLElement | null>(null);
  const rememberTrigger = () => {
    if (typeof document !== "undefined") {
      triggerRef.current = document.activeElement as HTMLElement | null;
    }
  };

  // Evidence must correspond to the CURRENT query only. When the result
  // changes, clear any active selection and close the drawer.
  useEffect(() => {
    setIsOpen(false);
    setFocusedId(null);
    setMode("registry");
  }, [queryKey]);

  const openWhy = useCallback(
    (variableHint: string) => {
      rememberTrigger();
      const match = matchRecord(deduped, variableHint);
      if (match) {
        setFocusedId(match.id);
        setMode("record");
      } else {
        // No confident association — show the full registry rather than
        // pointing at the wrong source.
        setFocusedId(null);
        setMode("registry");
      }
      setIsOpen(true);
    },
    [deduped]
  );

  const openRegistry = useCallback(() => {
    rememberTrigger();
    setFocusedId(null);
    setMode("registry");
    setIsOpen(true);
  }, []);

  const openCalculation = useCallback(() => {
    rememberTrigger();
    setMode("calculation");
    setFocusedId(null);
    setIsOpen(true);
  }, []);

  const focusRecord = useCallback((id: string) => {
    setFocusedId(id);
    setMode("record");
  }, []);

  const backToRegistry = useCallback(() => {
    setFocusedId(null);
    setMode("registry");
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    // Restore focus to the trigger that opened the drawer.
    const el = triggerRef.current;
    if (el && typeof el.focus === "function") {
      window.setTimeout(() => el.focus(), 0);
    }
  }, []);

  const canViewOnMap = useCallback(
    (rec: EvidenceRecord) => !!onViewOnMap && parseCoordinates(rec) !== null,
    [onViewOnMap]
  );

  const viewOnMap = useCallback(
    (rec: EvidenceRecord) => {
      const coord = parseCoordinates(rec);
      if (coord && onViewOnMap) {
        onViewOnMap(coord.lat, coord.lon, rec.variable);
      }
    },
    [onViewOnMap]
  );

  const value = useMemo<EvidenceContextValue>(
    () => ({
      records: deduped,
      risk,
      isLoading,
      isOpen,
      mode,
      focusedId,
      openWhy,
      openRegistry,
      openCalculation,
      focusRecord,
      backToRegistry,
      close,
      viewOnMap,
      canViewOnMap,
    }),
    [
      deduped,
      risk,
      isLoading,
      isOpen,
      mode,
      focusedId,
      openWhy,
      openRegistry,
      openCalculation,
      focusRecord,
      backToRegistry,
      close,
      viewOnMap,
      canViewOnMap,
    ]
  );

  return <EvidenceContext.Provider value={value}>{children}</EvidenceContext.Provider>;
};
