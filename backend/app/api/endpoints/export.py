from fastapi import APIRouter
from app.models.schemas import OrcaAnalysisResponse

router = APIRouter()

@router.post("/export/report")
async def generate_markdown_report(analysis: OrcaAnalysisResponse) -> dict:
    """
    Generates a structured, printable formal Marine Decision Support Report.
    """
    risk_score = analysis.risk_assessment.overall_score if analysis.risk_assessment else "N/A"
    risk_cat = analysis.risk_assessment.category.value if analysis.risk_assessment else "ASSESSED"

    report_md = f"""# ORCA MARINE INTELLIGENCE ADVISORY REPORT
**Document ID:** ORCA-REP-{analysis.query_id[:8].upper()}
**Issued At:** {analysis.temporal.start_time.strftime('%Y-%m-%d %H:%M UTC')}
**System Mode:** {analysis.mode}

---

## 1. Executive Summary & Query Context
- **User Query:** "{analysis.query_text}"
- **Target Location:** {analysis.location.name} ({analysis.location.latitude:.4f}°N, {analysis.location.longitude:.4f}°E)
- **Maritime Basin:** {analysis.location.maritime_zone or 'Indian Coastal Waters'}
- **Nearest Major Port:** {analysis.location.nearest_port or 'N/A'}
- **Valid Period:** {analysis.temporal.label}
- **Executive Finding:** {analysis.executive_summary}

---

## 2. Marine Safety & Deterministic Risk Matrix
- **Hazard Level:** {risk_cat}
- **Composite Risk Score:** {risk_score} / 100
- **Operational Recommendation:** {analysis.recommendation}

### Contributing Factors
"""
    if analysis.risk_assessment:
        for f in analysis.risk_assessment.contributing_factors:
            report_md += f"- **{f.name}:** {f.value} (+{f.points_added} pts) — *{f.description}*\n"

        if analysis.risk_assessment.triggered_rules:
            report_md += "\n### Triggered Authoritative Rules\n"
            for r in analysis.risk_assessment.triggered_rules:
                report_md += f"- {r}\n"

    report_md += "\n---\n\n## 3. Key Environmental Indicators\n"
    if analysis.ocean_conditions:
        report_md += f"- **Significant Wave Height:** {analysis.ocean_conditions.significant_wave_height_m} m\n"
        report_md += f"- **Swell Wave State:** {analysis.ocean_conditions.swell_height_m} m (Period: {analysis.ocean_conditions.swell_period_sec}s)\n"
        report_md += f"- **Sea Surface Temperature (SST):** {analysis.ocean_conditions.sea_surface_temp_c} °C\n"
        report_md += f"- **Sea State:** {analysis.ocean_conditions.sea_state}\n"

    if analysis.weather_conditions:
        report_md += f"- **Surface Winds:** {analysis.weather_conditions.wind_speed_knots} kt (Gusts: {analysis.weather_conditions.wind_gust_knots} kt)\n"
        report_md += f"- **Visibility:** {analysis.weather_conditions.visibility_km} km\n"
        report_md += f"- **Precipitation:** {analysis.weather_conditions.precipitation_mm} mm\n"
        report_md += f"- **Coastal Warning Alert:** {analysis.weather_conditions.alert_level.upper()}\n"

    if analysis.fishing_zones:
        report_md += "\n---\n\n## 4. Potential Fishing Zones (PFZ)\n"
        for z in analysis.fishing_zones[:3]:
            report_md += f"- **Rank {z.rank}: {z.name}** | Suitability: {z.suitability_score}/100 | Chl-a: {z.chlorophyll_mg_m3} mg/m³ | SST: {z.sst_c}°C | Waves: {z.wave_height_m}m | MPA: {'Yes (Restricted)' if z.within_mpa else 'No (Clear)'}\n"

    report_md += "\n---\n\n## 5. Authoritative Evidence & Provenance Trail\n"
    for e in analysis.evidence:
        report_md += f"- **[{e.status.value}] {e.provider}** ({e.dataset}): {e.variable} = `{e.value} {e.unit}` at {e.observation_or_forecast_time}\n"

    report_md += "\n---\n\n## 6. Regulatory Limitations & Vessel Master Disclaimer\n"
    for lim in analysis.limitations:
        report_md += f"> [!NOTE]\n> {lim}\n\n"

    report_md += "\n*Generated automatically by ORCA — Marine EcOsystem Reasoning with Collaborative Agents (SIH 2026 PS 26176)*\n"

    return {
        "report_id": f"REP-{analysis.query_id[:8].upper()}",
        "markdown_content": report_md
    }
