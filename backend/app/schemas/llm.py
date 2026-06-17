"""Request/response models for the LLM Attacks tab."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ScenarioModel(BaseModel):
    id: str
    title: str
    attack_type: str
    description: str
    system: str
    secret: str
    payloads: list[str]


class ScenariosResponse(BaseModel):
    model_id: str
    loaded: bool
    scenarios: list[ScenarioModel]


class ChatRequest(BaseModel):
    # Either reference a preset scenario, or supply a custom system prompt + secret.
    scenario_id: str | None = None
    custom_system: str | None = None
    custom_secret: str | None = None
    history: list[Message] = Field(default_factory=list)
    message: str
    defense: bool = False
    max_new_tokens: int = Field(160, ge=16, le=512)
    temperature: float = Field(0.0, ge=0, le=1.5)


class ChatResponse(BaseModel):
    reply: str
    leaked: bool
    blocked: bool
    succeeded: bool
    secret: str
    defense: bool
    model_id: str


class LoadResponse(BaseModel):
    model_id: str
    loaded: bool


# ---- indirect / RAG prompt injection ----
class RagScenarioResponse(BaseModel):
    model_id: str
    loaded: bool
    title: str
    description: str
    system: str
    marker: str
    question: str
    documents: list[str]
    poisoned_index: int
    injection: str


class RagRequest(BaseModel):
    question: str
    injection: str = ""
    poisoned_index: int = Field(0, ge=0)
    documents: list[str] | None = None
    defense: bool = False
    max_new_tokens: int = Field(160, ge=16, le=512)
    temperature: float = Field(0.0, ge=0, le=1.5)


class RagResponse(BaseModel):
    reply: str
    injected: bool
    blocked: bool
    succeeded: bool
    marker: str
    defense: bool
    model_id: str
