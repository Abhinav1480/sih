"""Tiered provider chain: try the most authoritative source first, fall back honestly.

Ordering is structural, not a convention someone has to remember. Providers are
sorted by `provider_tier`, so ISRO is attempted before a national agency and a
national agency before a foreign model or a synthetic value. Adding a provider
in the wrong list position cannot change that.

Two properties this exists to guarantee:

1. **A provider cannot emit a tier it is not registered for.** Every value is
   validated against the declaring provider's tier before it is accepted. A
   mismatch is refused and the chain moves on, so a mislabelled value can never
   reach a response.
2. **Every attempt is recorded.** The trace shows what was tried, what it cost,
   and why it failed, so "why is this Open-Meteo and not ISRO?" has an answer
   on screen rather than in a log file.

The chain is deliberately generic. BE-03's planner selects its language-model
backend (Anthropic, local Ollama, deterministic rules) through this same class,
so the LLM tier appears in the trace exactly like a data source does.
"""

import time
from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable, Generic, List, Optional, Sequence, TypeVar

from app.models.schemas import ProviderTier
from app.providers.base import ProviderUnavailable, TieredProvider
from app.providers.provenance import classify_tier

T = TypeVar("T")

# Most authoritative first. Used to order attempts.
_TIER_RANK = {
    ProviderTier.ISRO: 0,
    ProviderTier.NATIONAL: 1,
    ProviderTier.FALLBACK: 2,
}

OUTCOME_OK = "ok"
OUTCOME_NOT_CONFIGURED = "not_configured"
OUTCOME_UNAVAILABLE = "unavailable"
OUTCOME_ERROR = "error"
OUTCOME_PROVENANCE_VIOLATION = "provenance_violation"


@dataclass
class ProviderAttempt:
    """One provider's turn at answering, successful or not."""

    provider: str
    tier: ProviderTier
    outcome: str
    detail: str
    duration_ms: int = 0

    def describe(self) -> str:
        return f"[{self.tier.value}] {self.provider}: {self.outcome} - {self.detail}"


@dataclass
class ChainResult(Generic[T]):
    value: Optional[T] = None
    provider: Optional[str] = None
    tier: Optional[ProviderTier] = None
    attempts: List[ProviderAttempt] = field(default_factory=list)

    @property
    def succeeded(self) -> bool:
        return self.value is not None

    @property
    def used_fallback(self) -> bool:
        """True when the answer did not come from the most authoritative tier."""
        return self.tier is not None and self.tier != ProviderTier.ISRO

    @property
    def skipped(self) -> List[ProviderAttempt]:
        return [a for a in self.attempts if a.outcome != OUTCOME_OK]


def observation_validator(value: Any, provider: TieredProvider) -> Optional[str]:
    """Reject a value whose own source does not classify to the declared tier.

    This is what stops a provider registered as ISRO from returning something
    sourced from Open-Meteo, whether by a wiring mistake or a copied line.
    Returns None when the value is acceptable, or the reason to refuse it.
    """
    source = getattr(value, "source", None)
    if source is None:
        return None

    actual = classify_tier(source, getattr(value, "status", None))
    if actual != provider.provider_tier:
        return (
            f"declared tier {provider.provider_tier.value} but returned a value "
            f"sourced from {source!r}, which classifies as {actual.value}"
        )
    return None


class TieredChain(Generic[T]):
    """Calls providers in tier order until one produces an acceptable value."""

    def __init__(
        self,
        name: str,
        providers: Sequence[TieredProvider],
        validator: Callable[[Any, TieredProvider], Optional[str]] = observation_validator,
    ):
        self.name = name
        self.validator = validator
        self.providers = sorted(providers, key=lambda p: _TIER_RANK[p.provider_tier])

    async def fetch(self, call: Callable[[Any], Awaitable[T]]) -> ChainResult[T]:
        result: ChainResult[T] = ChainResult()

        for provider in self.providers:
            if not provider.is_configured():
                result.attempts.append(ProviderAttempt(
                    provider=provider.provider_name,
                    tier=provider.provider_tier,
                    outcome=OUTCOME_NOT_CONFIGURED,
                    detail=provider.not_configured_reason(),
                ))
                continue

            started = time.perf_counter()
            try:
                value = await call(provider)
            except ProviderUnavailable as exc:
                result.attempts.append(ProviderAttempt(
                    provider=provider.provider_name,
                    tier=provider.provider_tier,
                    outcome=OUTCOME_UNAVAILABLE,
                    detail=str(exc),
                    duration_ms=_elapsed_ms(started),
                ))
                continue
            except Exception as exc:
                # Fail soft: one broken provider must not cost the user an answer.
                result.attempts.append(ProviderAttempt(
                    provider=provider.provider_name,
                    tier=provider.provider_tier,
                    outcome=OUTCOME_ERROR,
                    detail=f"{type(exc).__name__}: {exc}"[:200],
                    duration_ms=_elapsed_ms(started),
                ))
                continue

            duration = _elapsed_ms(started)

            if value is None:
                result.attempts.append(ProviderAttempt(
                    provider=provider.provider_name,
                    tier=provider.provider_tier,
                    outcome=OUTCOME_UNAVAILABLE,
                    detail="provider returned no value",
                    duration_ms=duration,
                ))
                continue

            violation = self.validator(value, provider) if self.validator else None
            if violation:
                # Refuse rather than publish. A mislabelled source discredits
                # every other number in the response.
                result.attempts.append(ProviderAttempt(
                    provider=provider.provider_name,
                    tier=provider.provider_tier,
                    outcome=OUTCOME_PROVENANCE_VIOLATION,
                    detail=violation,
                    duration_ms=duration,
                ))
                continue

            result.attempts.append(ProviderAttempt(
                provider=provider.provider_name,
                tier=provider.provider_tier,
                outcome=OUTCOME_OK,
                detail="served",
                duration_ms=duration,
            ))
            result.value = value
            result.provider = provider.provider_name
            result.tier = provider.provider_tier
            return result

        return result


def _elapsed_ms(started: float) -> int:
    return int((time.perf_counter() - started) * 1000)
