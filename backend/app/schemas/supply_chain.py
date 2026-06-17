"""Response model for the Supply-Chain (unsafe deserialization) tab."""

from __future__ import annotations

from pydantic import BaseModel


class DeserializationResponse(BaseModel):
    token: str
    payload_source: str
    unsafe_call: str
    safe_call: str
    checkpoint_keys: list[str]
    file_size: int
    executed: bool
    evidence: dict | None
    marker_path: str
    safe_blocked: bool
    safe_error: str | None
    takeaways: list[str]
