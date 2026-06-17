"""Differential Privacy tab — DP-SGD privacy/utility trade-off (Opacus)."""

from __future__ import annotations

from dataclasses import asdict

from fastapi import APIRouter, HTTPException

from app.attacks.privacy import dp_tradeoff
from app.schemas.privacy import DPResponse, DPRequest

router = APIRouter(prefix="/privacy", tags=["privacy"])


@router.get("/info")
def info() -> dict:
    return {
        "tab": "privacy",
        "status": "ready",
        "technique": "dp_sgd",
        "note": "Opacus DP-SGD (per-sample clipping + Gaussian noise). Sweeps target "
                "epsilon and reports test accuracy (utility) and confidence-threshold "
                "MIA AUC (privacy) vs a non-private baseline.",
    }


@router.post("/train", response_model=DPResponse)
def train(req: DPRequest) -> DPResponse:
    try:
        r = dp_tradeoff(
            dataset=req.dataset, epsilons=req.epsilons, delta=req.delta,
            epochs=req.epochs, max_grad_norm=req.max_grad_norm, size=req.size, seed=req.seed,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return DPResponse(**asdict(r))
