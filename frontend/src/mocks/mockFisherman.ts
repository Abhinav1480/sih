import type { VerdictValue } from "@/components/Fisherman/FishermanVerdict";

/**
 * FE-07 demo fixtures for Fisherman Mode.
 *
 * The GO/CAUTION/NO_GO/NOT_APPLICABLE verdict is NOT part of the current API
 * contract (the backend does not emit `answer.verdict` yet — see the backend
 * request noted in the FE-07 report). These fixtures exist only to verify the
 * <FishermanVerdict /> component renders every state correctly in demo mode.
 * They are demo data, clearly labelled, and never presented as live provenance.
 */
export interface MockVerdictScenario {
  verdict: VerdictValue;
  /** Stands in for the backend `recommendation` explanation. */
  explanation: string;
}

export const mockVerdictScenarios: MockVerdictScenario[] = [
  {
    verdict: "GO",
    explanation: "Calm seas and light winds — safe for standard fishing operations.",
  },
  {
    verdict: "CAUTION",
    explanation: "Marginal sea state with rising swell — proceed with heightened caution.",
  },
  {
    verdict: "NO_GO",
    explanation: "High wave exposure and gale-force gusts — do not put to sea.",
  },
  {
    verdict: "NOT_APPLICABLE",
    explanation: "This query is informational; no go / no-go decision applies.",
  },
];

/** An unknown/absent verdict must fall back honestly (never fabricated). */
export const mockUnknownVerdict = { verdict: undefined, explanation: undefined };
