import time
from typing import Optional, List, Dict, Any
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from app.models.schemas import AgentStepRecord

class BaseSpecialistAgent(ABC):
    def __init__(self, name: str, role: str):
        self.name = name
        self.role = role

    @abstractmethod
    async def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Executes agent-specific domain logic."""
        pass

    def record_step(
        self,
        action: str,
        tool: Optional[str] = None,
        duration_ms: int = 50,
        details: Optional[str] = None,
        status: str = "COMPLETED"
    ) -> AgentStepRecord:
        return AgentStepRecord(
            agent=self.name,
            action=action,
            tool=tool,
            status=status,
            duration_ms=duration_ms,
            details=details,
            timestamp=datetime.now(timezone.utc)
        )
