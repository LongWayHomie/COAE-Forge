"""Defense tab — adversarial training vs an undefended baseline (COAE module 12)."""

from __future__ import annotations

from dataclasses import asdict

from fastapi import APIRouter, HTTPException

from app.attacks.defense import defense_experiment
from app.core.registry import WeightsNotFound
from app.schemas.defense import DefenseRequest, DefenseResponse

router = APIRouter(prefix="/defense", tags=["defense"])


@router.get("/info")
def info() -> dict:
    return {
        "tab": "defense",
        "status": "ready",
        "technique": "adversarial_training",
        "note": "Adversarially fine-tunes a clone of the pretrained model (random-init "
                "FGSM or PGD) and compares clean vs robust accuracy against the "
                "undefended baseline, with an FGSM robustness-vs-epsilon curve.",
    }


@router.post("/train", response_model=DefenseResponse)
def train(req: DefenseRequest) -> DefenseResponse:
    try:
        r = defense_experiment(
            dataset=req.dataset, method=req.method, train_eps=req.train_eps,
            epochs=req.epochs, n_train=req.n_train, n_test=req.n_test,
            eval_eps=req.eval_eps, seed=req.seed,
        )
    except WeightsNotFound as e:
        raise HTTPException(status_code=409, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return DefenseResponse(**asdict(r))
