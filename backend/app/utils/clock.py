"""The clock the planner and providers resolve "now" against.

In LIVE mode this is the wall clock. In DEMO mode it is frozen at
``ORCA_DEMO_NOW`` so that "tomorrow morning" always means the same morning,
the same cached satellite granules are selected, and a rehearsal and the
stage run produce the same answer. Timestamps that record when ORCA did
something (trace steps, generated_at) keep using the real clock; those are
processing times, not the time the question is about.
"""

from datetime import datetime, timezone

from app.config import settings


def now() -> datetime:
    frozen = (settings.ORCA_DEMO_NOW or "").strip()
    if settings.ORCA_MODE == "DEMO" and frozen:
        parsed = datetime.fromisoformat(frozen.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
    return datetime.now(timezone.utc)
