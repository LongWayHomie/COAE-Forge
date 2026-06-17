"""Shared schemas, including the placeholder shape used by not-yet-built tabs."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class StubRequest(BaseModel):
    """Generic request for stubbed tabs; accepts arbitrary params."""

    params: dict[str, Any] = Field(default_factory=dict)


class StubResponse(BaseModel):
    """Stable shape the frontend can render before a tab is implemented."""

    tab: str
    status: str = "not_implemented"
    message: str
    planned: list[str] = Field(default_factory=list)
    echo: dict[str, Any] = Field(default_factory=dict)
