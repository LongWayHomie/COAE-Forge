"""LLM Attacks tab — prompt injection, jailbreak, system-prompt leakage.

Targets a local HF instruct model (settings.llm_model_id), loaded lazily on first
use. For education / authorized testing only.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.attacks import llm
from app.config import settings
from app.schemas.llm import (
    ChatRequest,
    ChatResponse,
    LoadResponse,
    RagRequest,
    RagResponse,
    RagScenarioResponse,
    ScenarioModel,
    ScenariosResponse,
)

router = APIRouter(prefix="/llm", tags=["llm"])


@router.get("/info")
def info() -> dict:
    return {
        "tab": "llm",
        "status": "ready",
        "model_id": settings.llm_model_id,
        "loaded": llm.is_loaded(),
        "attack_types": ["prompt_injection", "jailbreak", "system_prompt_leak"],
        "note": "Local instruct model plays a victim assistant hiding a secret; attacks try "
                "to extract it. Defense toggle adds a hardened prompt + output filter.",
    }


@router.get("/scenarios", response_model=ScenariosResponse)
def scenarios() -> ScenariosResponse:
    return ScenariosResponse(
        model_id=settings.llm_model_id,
        loaded=llm.is_loaded(),
        scenarios=[ScenarioModel(**s.__dict__) for s in llm.SCENARIOS.values()],
    )


@router.post("/load", response_model=LoadResponse)
def load() -> LoadResponse:
    """Preload the model so the first chat isn't slowed by the download/load."""
    try:
        llm.load_model()
    except Exception as e:  # noqa: BLE001 - surface load/download errors to the UI
        raise HTTPException(status_code=503, detail=f"Model load failed: {e}")
    return LoadResponse(model_id=settings.llm_model_id, loaded=llm.is_loaded())


@router.get("/rag-scenario", response_model=RagScenarioResponse)
def rag_scenario() -> RagScenarioResponse:
    sc = llm.RAG_SCENARIO
    return RagScenarioResponse(
        model_id=settings.llm_model_id, loaded=llm.is_loaded(),
        title=sc.title, description=sc.description, system=sc.system, marker=sc.marker,
        question=sc.question, documents=sc.documents,
        poisoned_index=sc.poisoned_index, injection=sc.injection,
    )


@router.post("/rag", response_model=RagResponse)
def rag(req: RagRequest) -> RagResponse:
    try:
        turn = llm.run_rag(
            question=req.question, injection=req.injection,
            poisoned_index=req.poisoned_index, documents=req.documents,
            defense=req.defense, max_new_tokens=req.max_new_tokens,
            temperature=req.temperature,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=f"Generation failed: {e}")
    return RagResponse(
        reply=turn.reply, injected=turn.leaked, blocked=turn.blocked,
        succeeded=turn.succeeded, marker=turn.secret, defense=turn.defense,
        model_id=turn.model_id,
    )


@router.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest) -> ChatResponse:
    if req.scenario_id:
        try:
            sc = llm.get_scenario(req.scenario_id)
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))
        system, secret = sc.system, sc.secret
    elif req.custom_system is not None:
        system, secret = req.custom_system, (req.custom_secret or "")
    else:
        raise HTTPException(status_code=422, detail="Provide scenario_id or custom_system.")

    try:
        turn = llm.run_chat(
            system=system, secret=secret,
            history=[m.model_dump() for m in req.history], message=req.message,
            defense=req.defense, max_new_tokens=req.max_new_tokens, temperature=req.temperature,
        )
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=f"Generation failed: {e}")

    return ChatResponse(**turn.__dict__)
