"""Extraction tab — model stealing + black-box transfer evasion (modules 8 & 11)."""

from __future__ import annotations

from dataclasses import asdict

from fastapi import APIRouter, HTTPException

from app.attacks.extraction import extraction_experiment
from app.core.registry import WeightsNotFound
from app.schemas.extraction import ExtractionRequest, ExtractionResponse

router = APIRouter(prefix="/extraction", tags=["extraction"])


@router.get("/info")
def info() -> dict:
    return {
        "tab": "extraction",
        "status": "ready",
        "technique": "model_extraction + transfer_evasion",
        "note": "Steals a substitute by querying the target (label-only), reports "
                "fidelity vs query budget, then crafts adversarial examples on the "
                "substitute and measures transfer to the black-box target vs a direct "
                "white-box attack.",
    }


@router.post("/run", response_model=ExtractionResponse)
def run(req: ExtractionRequest) -> ExtractionResponse:
    try:
        r = extraction_experiment(
            dataset=req.dataset, query_budget=req.query_budget, attack=req.attack,
            eps=req.eps, epochs=req.epochs, n_test=req.n_test, seed=req.seed,
        )
    except WeightsNotFound as e:
        raise HTTPException(status_code=409, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return ExtractionResponse(**asdict(r))
