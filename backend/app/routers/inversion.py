"""Model Inversion tab — reconstruct a class prototype from the model (module 11)."""

from __future__ import annotations

from dataclasses import asdict

from fastapi import APIRouter, HTTPException

from app.attacks.inversion import model_inversion
from app.core.registry import WeightsNotFound
from app.schemas.inversion import InversionRequest, InversionResponse

router = APIRouter(prefix="/inversion", tags=["inversion"])


@router.get("/info")
def info() -> dict:
    return {
        "tab": "inversion",
        "status": "ready",
        "technique": "model_inversion",
        "note": "Gradient-ascends an input to reproduce the model's mean internal "
                "representation of a target class (with TV + jitter + blur priors), "
                "reconstructing a recognisable class prototype — training-data leakage.",
    }


@router.post("/run", response_model=InversionResponse)
def run(req: InversionRequest) -> InversionResponse:
    try:
        r = model_inversion(
            dataset=req.dataset, target_class=req.target_class, steps=req.steps,
            lr=req.lr, tv_reg=req.tv_reg, seed=req.seed,
        )
    except WeightsNotFound as e:
        raise HTTPException(status_code=409, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return InversionResponse(**asdict(r))
