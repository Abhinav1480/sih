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

/** Contract 1.3.0 envelope slices the drawer needs; registered by ResultContainer. */
export interface EvidenceEnvelope {
  risk?: any | null;
  meta?: any | null;
  cards?: any[];
}

interface EvidenceContextValue {
  /** Deduped evidence records for the CURRENT result only. */
  records: EvidenceRecord[];
  risk?: DeterministicRiskResult;
  envelope: EvidenceEnvelope;
  isLoading: boolean;

  isOpen: boolean;
  mode: EvidenceMode;
  focusedId: string | null;
  /** When set, the registry lists only these ids (a card's evidence_ids). */
  filterIds: string[] | null;

  /** Open the drawer focused on the evidence behind a specific value. */
  openWhy: (variableHint: string, title?: string) => void;
  /** Open the drawer at exactly these evidence ids (1 → record, n → filtered registry). */
  openRecords: (ids: string[]) => void;
  /** Open the consolidated registry of every source for this result. */
  openRegistry: () => void;
  /** Open the derived-calculation view (risk factors). */
  openCalculation: () => void;
  /** Focus a specific record by id within the open drawer. */
  focusRecord: (id: string) => void;
  /** Return to the consolidated registry view (keeps the drawer open). */
  backToRegistry: () => void;
  close: () => void;
  /** Result components register envelope slices (meta.limitations, risk) here. */
  registerEnvelope: (env: EvidenceEnvelope) => void;

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

/** Same as useEvidence but null outside a provider (styleguide, storybook-ish pages). */
export function useEvidenceOptional(): EvidenceContextValue | null {
  return useContext(EvidenceContext);
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
  const [filterIds, setFilterIds] = useState<string[] | null>(null);
  const [envelope, setEnvelope] = useState<EvidenceEnvelope>({});

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
    setFilterIds(null);
    setMode("registry");
    setEnvelope({});
  }, [queryKey]);

  const registerEnvelope = useCallback((env: EvidenceEnvelope) => {
    setEnvelope((prev) =>
      prev.risk === env.risk && prev.meta === env.meta && prev.cards === env.cards ? prev : env
    );
  }, []);

  const openWhy = useCallback(
    (variableHint: string) => {
      rememberTrigger();
      const match = matchRecord(deduped, variableHint);
      setFilterIds(null);
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

  const openRecords = useCallback(
    (ids: string[]) => {
      rememberTrigger();
      const known = ids.filter((id) => deduped.some((r) => r.id === id));
      if (known.length === 1) {
        setFilterIds(null);
        setFocusedId(known[0]);
        setMode("record");
      } else {
        setFilterIds(known.length > 0 ? known : null);
        setFocusedId(null);
        setMode("registry");
      }
      setIsOpen(true);
    },
    [deduped]
  );

  const openRegistry = useCallback(() => {
    rememberTrigger();
    setFilterIds(null);
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
    setFilterIds(null);
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
      envelope,
      isLoading,
      isOpen,
      mode,
      focusedId,
      filterIds,
      openWhy,
      openRecords,
      openRegistry,
      openCalculation,
      focusRecord,
      backToRegistry,
      close,
      registerEnvelope,
      viewOnMap,
      canViewOnMap,
    }),
    [
      deduped,
      risk,
      envelope,
      isLoading,
      isOpen,
      mode,
      focusedId,
      filterIds,
      openWhy,
      openRecords,
      openRegistry,
      openCalculation,
      focusRecord,
      backToRegistry,
      close,
      registerEnvelope,
      viewOnMap,
      canViewOnMap,
    ]
  );

  return <EvidenceContext.Provider value={value}>{children}</EvidenceContext.Provider>;
};
