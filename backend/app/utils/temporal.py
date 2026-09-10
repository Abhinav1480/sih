import re
from datetime import datetime, timedelta, timezone
from app.models.schemas import TemporalContext

def parse_temporal_context(query_text: str) -> TemporalContext:
    """
    Parses natural language expressions into explicit datetime intervals and flags.
    Distinguishes live observation, forward forecast, and historical analysis.
    """
    text = query_text.lower()
    now = datetime.now(timezone.utc)

    # 1. Historical checks
    if any(k in text for k in ["yesterday", "last 24 hours", "24 hours ago", "past 24 hours", "previous day"]):
        start = now - timedelta(days=1)
        end = now
        return TemporalContext(
            label="Last 24 Hours",
            start_time=start,
            end_time=end,
            is_forecast=False,
            is_historical=True,
            offset_hours=-24
        )

    if any(k in text for k in ["last week", "7 days ago", "seven days ago", "past week", "previous week"]):
        start = now - timedelta(days=7)
        end = now
        return TemporalContext(
            label="Past 7 Days (Historical Baseline)",
            start_time=start,
            end_time=end,
            is_forecast=False,
            is_historical=True,
            offset_hours=-168
        )

    if any(k in text for k in ["last month", "30 days ago", "past month"]):
        start = now - timedelta(days=30)
        end = now
        return TemporalContext(
            label="Past 30 Days (Historical Baseline)",
            start_time=start,
            end_time=end,
            is_forecast=False,
            is_historical=True,
            offset_hours=-720
        )

    # 2. Tomorrow expressions
    if "tomorrow morning" in text or "tomorrow 5 am" in text or "tomorrow dawn" in text:
        tomorrow = (now + timedelta(days=1)).replace(hour=5, minute=0, second=0, microsecond=0)
        return TemporalContext(
            label="Tomorrow Morning (05:00 - 11:00)",
            start_time=tomorrow,
            end_time=tomorrow + timedelta(hours=6),
            is_forecast=True,
            is_historical=False,
            offset_hours=24
        )

    if "tomorrow afternoon" in text:
        tomorrow = (now + timedelta(days=1)).replace(hour=12, minute=0, second=0, microsecond=0)
        return TemporalContext(
            label="Tomorrow Afternoon (12:00 - 18:00)",
            start_time=tomorrow,
            end_time=tomorrow + timedelta(hours=6),
            is_forecast=True,
            is_historical=False,
            offset_hours=30
        )

    if "tomorrow" in text:
        tomorrow = now + timedelta(days=1)
        return TemporalContext(
            label="Tomorrow (Full Day Forecast)",
            start_time=tomorrow.replace(hour=0, minute=0, second=0),
            end_time=tomorrow.replace(hour=23, minute=59, second=59),
            is_forecast=True,
            is_historical=False,
            offset_hours=24
        )

    # 3. Next N days / 24 hours
    if any(k in text for k in ["next 24 hours", "upcoming 24 hours", "next day"]):
        return TemporalContext(
            label="Next 24 Hours Forecast",
            start_time=now,
            end_time=now + timedelta(hours=24),
            is_forecast=True,
            is_historical=False,
            offset_hours=12
        )

    if any(k in text for k in ["next 3 days", "upcoming 3 days", "72 hours"]):
        return TemporalContext(
            label="Next 3 Days (72 Hours) Outlook",
            start_time=now,
            end_time=now + timedelta(days=3),
            is_forecast=True,
            is_historical=False,
            offset_hours=36
        )

    if "tonight" in text:
        tonight = now.replace(hour=20, minute=0, second=0)
        return TemporalContext(
            label="Tonight (20:00 - 04:00)",
            start_time=tonight,
            end_time=tonight + timedelta(hours=8),
            is_forecast=True,
            is_historical=False,
            offset_hours=6
        )

    # 4. Explicit time of day today
    time_match = re.search(r"(\d{1,2})\s*(am|pm)", text)
    if time_match:
        hour = int(time_match.group(1))
        meridiem = time_match.group(2)
        if meridiem == "pm" and hour < 12:
            hour += 12
        elif meridiem == "am" and hour == 12:
            hour = 0
        target = now.replace(hour=hour, minute=0, second=0)
        if target < now - timedelta(hours=1):
            target += timedelta(days=1)
        return TemporalContext(
            label=f"Specific Time Window ({hour:02d}:00 UTC)",
            start_time=target,
            end_time=target + timedelta(hours=3),
            is_forecast=True,
            is_historical=False,
            offset_hours=int((target - now).total_seconds() / 3600)
        )

    # Default to Now / Current
    return TemporalContext(
        label="Current / Real-Time",
        start_time=now - timedelta(hours=1),
        end_time=now + timedelta(hours=3),
        is_forecast=False,
        is_historical=False,
        offset_hours=0
    )
