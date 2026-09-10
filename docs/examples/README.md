# Reference responses — contract 1.4.0

Every file here is the **verbatim body ORCA returned**, not a hand-written
example. They are the frozen shape the website is built against.

| File | What it is |
| :--- | :--- |
| `canonical-01..08-*.json` | The eight problem-statement queries, in order, each with the request that produced it |
| `alerts.json` | `GET /api/alerts` |
| `conversation.json` | Three turns carrying conversation state: a route request, an alternative-route follow-up, then a comparison |

## Regenerating

```bash
python backend/scripts/capture_contract_examples.py
```

**If that changes a file, you changed the contract.** Bump `CONTRACT_VERSION`
in `backend/app/models/envelope.py` and add a changelog entry to
`docs/API_CONTRACT.md`. Do not regenerate to make a red test green — the test
being red is the point.

## Why they are reproducible

The captures are taken with `ORCA_DEMO_NOW` pinned to `2026-09-09T06:00:00Z`.
The committed ISRO granules cover 1–9 September 2026 and each product declares
its own validity, so without a fixed clock the same query returns real granule
data one week and the labelled synthetic fallback the next — and the diff would
be the calendar moving, not the contract.

Values that are genuinely different on every run — request ids, `generated_at`,
trace durations, `retrieval_time`, `issued_at` — are **real** in a live
response and are replaced here with fixed placeholders of the same type, so the
captures still validate against the live model while comparing cleanly. The
freeze test ignores exactly this set.

## What the freeze test checks

`backend/tests/test_api_contract_frozen.py`, two independent locks:

1. **Every capture still validates** against the live Pydantic envelope, so
   removing a field or narrowing an enum fails with the file that broke.
2. **The live response still matches the capture, field for field.** A capture
   keeps validating after a field is removed, because most fields are optional
   — so the key paths the API produces now are compared against the ones it
   produced when the contract was frozen. Adding a field fails too, until it is
   captured and documented.
