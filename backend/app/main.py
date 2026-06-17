"""COAE-Forge FastAPI application.

Mounts one router per attack tab under /api. Only the Adversarial Examples tab is
fully implemented; the rest return stable 'not implemented' placeholders.
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import (
    adversarial, defense, extraction, inversion, llm, membership, poisoning, privacy,
    supply_chain,
)

app = FastAPI(title="COAE-Forge", description="AI Attack Playground", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_PREFIX = "/api"
app.include_router(adversarial.router, prefix=API_PREFIX)
app.include_router(poisoning.router, prefix=API_PREFIX)
app.include_router(membership.router, prefix=API_PREFIX)
app.include_router(privacy.router, prefix=API_PREFIX)
app.include_router(defense.router, prefix=API_PREFIX)
app.include_router(extraction.router, prefix=API_PREFIX)
app.include_router(inversion.router, prefix=API_PREFIX)
app.include_router(supply_chain.router, prefix=API_PREFIX)
app.include_router(llm.router, prefix=API_PREFIX)


@app.get(f"{API_PREFIX}/health", tags=["meta"])
def health() -> dict:
    return {"status": "ok", "device": settings.device, "service": "coae-forge"}


@app.get(f"{API_PREFIX}/tabs", tags=["meta"])
def tabs() -> dict:
    """Tab registry the frontend can use to render navigation."""
    return {
        "tabs": [
            {"id": "adversarial", "title": "Adversarial Examples", "status": "ready"},
            {"id": "poisoning", "title": "Data Poisoning", "status": "ready"},
            {"id": "membership", "title": "Membership Inference", "status": "ready"},
            {"id": "privacy", "title": "Differential Privacy", "status": "ready"},
            {"id": "defense", "title": "Adversarial Training", "status": "ready"},
            {"id": "extraction", "title": "Model Extraction", "status": "ready"},
            {"id": "inversion", "title": "Model Inversion", "status": "ready"},
            {"id": "supply_chain", "title": "Supply Chain", "status": "ready"},
            {"id": "llm", "title": "LLM Attacks", "status": "ready"},
        ]
    }
