# ADR-001: Where a language model is, and is not, allowed

**Status:** Accepted
**Applies to:** BE-02 (provider tiering), BE-03 (planner), BE-09 (vernacular)

## Decision

Three concerns that are often lumped together as "AI" are split into three
mechanisms, and only one of them uses a language model.

| Concern | Mechanism | LLM? |
| :--- | :--- | :--- |
| 1. Language detection | Unicode script ranges plus a `langdetect`-class library | **No** |
| 2. Vernacular narrative | Per-language templates with a marine glossary, filled with engine-computed values | **No** |
| 3. Planning and clarifying questions | A provider interface with three implementations behind one contract | **Yes** |

The deterministic risk engine is untouched by all three. **The maths decides;
the model explains.**

## Why the split

**Detection needs no model.** Telugu, Tamil, Malayalam, Kannada, Odia,
Bengali and Gujarati each have their own Unicode block; Hindi and Marathi
share Devanagari and are separated by a small vocabulary check. This is
deterministic, offline, and cannot misfire on a demo machine with no network.

**Narrative generation must be reproducible.** A templated sentence filled
with values the engine computed can be verified once by a native speaker and
is then correct on every run. A generated sentence must be verified on every
run and cannot be, on stage, in a language the operator does not read. The
glossary is where the marine vocabulary lives, and it is a file a fisher can
correct.

**Planning is where a model earns its place.** Choosing which tools to run for
an unseen query, and asking a clarifying question when the query is
ambiguous, is open-ended language understanding. This is the one concern
where the model's judgement is wanted — and it is the one place its output is
structurally prevented from becoming a verdict.

## The planner provider chain

The planner backend is selected through the same `TieredChain` as the data
providers (`backend/app/providers/chain.py`), so the tier appears in the trace
exactly like a data source does:

| Order | Backend | Selected when |
| :--- | :--- | :--- |
| 1 | Anthropic API | `ANTHROPIC_API_KEY` is set and the endpoint answers |
| 2 | Local Ollama | `OLLAMA_BASE_URL` is reachable and `OLLAMA_MODEL` is loaded |
| 3 | Deterministic rules | Always available; the scored intent matcher already in `intent.py` |

Selection is automatic and per-request. A backend that is not configured or
does not answer is recorded in the trace with its reason, and the next one is
tried. The deterministic tier is not a degraded mode — it is the floor every
demo run is guaranteed to reach, and the eight canonical queries are asserted
against it.

The local path targets a **7B–8B parameter model at Q4 quantisation**, which
fits the demo machine's 6 GB of VRAM. Larger models are not to be assumed.

## What the model may and may not return

The planner contract returns a structured plan: the tools to invoke, in what
order, with what arguments, and a one-paragraph rationale. It may also return
a clarifying question instead of a plan.

It may **not** return, and the schema does not have fields for:

- a risk score, band, or verdict
- a threshold judgement ("the waves are too high")
- a numeric observation of any kind

If a backend emits any of those in free text they are discarded. The risk
engine computes the score; the envelope builder derives the verdict from the
band; the narrative templates phrase them. There is no code path by which a
model's opinion of the sea state reaches the user.

## Consequences

- `ANTHROPIC_API_KEY`, `OLLAMA_BASE_URL` and `OLLAMA_MODEL` become real
  configuration with real consumers. Today the first is declared and unused.
- The trace gains a `planner` event carrying the backend tier, so a judge sees
  "planner: deterministic rules (Anthropic: no key; Ollama: unreachable)" in
  the same format as "ocean: Open-Meteo (Bhoonidhi: no token)".
- BE-09's vernacular work is a glossary and a template set, not a prompt.
- `anthropic` and an Ollama HTTP client become dependencies; neither is
  required for `ORCA_MODE=DEMO` to pass its tests.
