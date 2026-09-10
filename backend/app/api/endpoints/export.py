from fastapi import APIRouter

from app.models.envelope import GeofenceWarningCard, PfzRankingCard, QueryEnvelope

router = APIRouter()


@router.post("/export/report")
async def generate_markdown_report(envelope: QueryEnvelope) -> dict:
    """
    Generates a structured, printable formal Marine Decision Support Report.

    Takes the same envelope `/api/query` returned, so the report can never
    disagree with what the user was shown. The environmental indicators are
    rendered straight from the evidence records rather than from a parallel
    list, which means every figure in the report carries its provider and
    provenance tier.
    """
    risk = envelope.risk
    risk_score = risk.score if risk else "N/A"
    risk_cat = risk.band.value if risk else "ASSESSED"

    report_md = f"""# ORCA MARINE INTELLIGENCE ADVISORY REPORT
**Document ID:** ORCA-REP-{envelope.request_id[:8].upper()}
**Issued At:** {envelope.meta.generated_at.strftime('%Y-%m-%d %H:%M UTC')}
**System Mode:** {envelope.meta.mode}
**Contract Version:** {envelope.meta.contract_version}

---

## 1. Executive Summary & Query Context
- **User Query:** "{envelope.meta.query_text}"
- **Target Location:** {envelope.meta.location.name} ({envelope.meta.location.latitude:.4f}°N, {envelope.meta.location.longitude:.4f}°E)
- **Maritime Basin:** {envelope.meta.location.maritime_zone or 'Indian Coastal Waters'}
- **Nearest Major Port:** {envelope.meta.location.nearest_port or 'N/A'}
- **Valid Period:** {envelope.meta.temporal.label}
- **Detected Language:** {envelope.language}
- **Executive Finding:** {envelope.answer.headline}
- **Operational Verdict:** **{envelope.answer.verdict.value}** (confidence {envelope.answer.confidence}%)

{envelope.answer.narrative}

"""

    if envelope.meta.degraded:
        report_md += (
            "> [!WARNING]\n"
            "> This advisory contains values from fallback or synthetic sources. "
            "Check the provenance tier of each figure in section 5 before operational use.\n\n"
        )

    report_md += f"""---

## 2. Marine Safety & Deterministic Risk Matrix
- **Hazard Level:** {risk_cat}
- **Composite Risk Score:** {risk_score} / 100
"""

    if risk:
        report_md += f"- **Data Quality:** {risk.data_quality}\n"
        if risk.missing_inputs:
            report_md += f"- **Unavailable Inputs:** {', '.join(risk.missing_inputs)} (score renormalised over the inputs that were available)\n"

        report_md += "\n### Contributing Factors\n"
        for f in risk.factors:
            report_md += f"- **{f.name}:** {f.value} (+{f.points_added} pts) — *{f.description}*\n"
        report_md += f"\n*Factor points sum to {sum(f.points_added for f in risk.factors)} / 100, the reported score.*\n"

        if risk.triggered_rules:
            report_md += "\n### Triggered Rules\n"
            for r in risk.triggered_rules:
                report_md += f"- {r}\n"

    report_md += "\n---\n\n## 3. Key Environmental Indicators\n"
    if envelope.evidence:
        report_md += "| Variable | Value | Source | Tier | Status |\n|---|---|---|---|---|\n"
        for e in envelope.evidence:
            report_md += f"| {e.variable} | {e.value} {e.unit} | {e.provider} | {e.provider_tier.value} | {e.status.value} |\n"
    else:
        report_md += "*No observations were retrieved for this request.*\n"

    pfz_cards = [c for c in envelope.cards if isinstance(c, PfzRankingCard)]
    if pfz_cards and pfz_cards[0].zones:
        report_md += "\n---\n\n## 4. Potential Fishing Zones (PFZ)\n"
        for z in pfz_cards[0].zones[:3]:
            report_md += (
                f"- **Rank {z.rank}: {z.name}** | Suitability: {z.suitability_score}/100 "
                f"| Chl-a: {z.chlorophyll_mg_m3} mg/m³ | SST: {z.sst_c}°C | Waves: {z.wave_height_m}m "
                f"| MPA: {'Yes (Restricted)' if z.within_mpa else 'No (Clear)'} "
                f"| Source: {z.source} [{z.status.value}]\n"
            )

    geofence_cards = [c for c in envelope.cards if isinstance(c, GeofenceWarningCard)]
    if geofence_cards:
        report_md += "\n---\n\n## 4b. Geofencing Restrictions\n"
        for c in geofence_cards:
            report_md += f"- **[{c.severity.value}] {c.zone_name}** — {c.detail}\n"

    if envelope.alerts:
        report_md += "\n---\n\n## 4c. Active Alerts\n"
        for a in envelope.alerts:
            report_md += f"- **[{a.severity.value}] {a.title}** ({a.type.value}) — {a.description} *(source: {a.source}, tier {a.provider_tier.value})*\n"

    report_md += "\n---\n\n## 5. Evidence & Provenance Trail\n"
    if envelope.evidence:
        for e in envelope.evidence:
            report_md += (
                f"- **[{e.status.value} / {e.provider_tier.value}] {e.provider}** ({e.dataset}): "
                f"{e.variable} = `{e.value} {e.unit}` at {e.observation_or_forecast_time}\n"
            )
            if e.reliability_notes:
                report_md += f"  - *{e.reliability_notes}*\n"
    else:
        report_md += "*No provenance records were produced for this request.*\n"

    report_md += "\n---\n\n## 6. Regulatory Limitations & Vessel Master Disclaimer\n"
    for lim in envelope.meta.limitations:
        report_md += f"> [!NOTE]\n> {lim}\n\n"
    for note in envelope.meta.notes:
        report_md += f"> [!NOTE]\n> {note}\n\n"

    report_md += "\n*Generated automatically by ORCA — Marine EcOsystem Reasoning with Collaborative Agents (SIH 2026 PS 26176)*\n"

    return {
        "report_id": f"REP-{envelope.request_id[:8].upper()}",
        "markdown_content": report_md
    }
