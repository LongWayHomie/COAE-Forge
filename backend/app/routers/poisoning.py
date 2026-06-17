"""Data Poisoning tab — label flipping and clean-label feature collision."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.attacks.poisoning import clean_label_attack, label_flip_experiment
from app.core.data import get_spec
from app.core.registry import WeightsNotFound
from app.schemas.poisoning import (
    CleanLabelRequest,
    CleanLabelResponse,
    LabelFlipRequest,
    LabelFlipResponse,
)

router = APIRouter(prefix="/poisoning", tags=["poisoning"])


def _guard(fn):
    try:
        return fn()
    except WeightsNotFound as e:
        raise HTTPException(status_code=409, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.get("/info")
def info() -> dict:
    return {
        "tab": "poisoning",
        "status": "ready",
        "techniques": ["label_flip", "clean_label"],
        "note": "Frozen pretrained CNN features + a fast linear head, so poisoning "
                "the training labels/data retrains in seconds.",
    }


@router.post("/label-flip", response_model=LabelFlipResponse)
def label_flip(req: LabelFlipRequest) -> LabelFlipResponse:
    spec = get_spec(req.dataset)
    r = _guard(lambda: label_flip_experiment(
        dataset=req.dataset, rate=req.rate, mode=req.mode,
        source=req.source, target=req.target,
        n_train=req.n_train, n_test=req.n_test, seed=req.seed,
    ))
    return LabelFlipResponse(
        dataset=req.dataset, mode=req.mode,
        clean_acc=r.clean_acc, poisoned_acc=r.poisoned_acc, acc_drop=r.acc_drop,
        num_flipped=r.num_flipped, num_train=r.num_train,
        class_names=spec.class_names,
        per_class_clean=r.per_class_clean, per_class_poisoned=r.per_class_poisoned,
        samples=r.samples,
        source_recall_clean=r.source_recall_clean,
        source_recall_poisoned=r.source_recall_poisoned,
    )


@router.post("/clean-label", response_model=CleanLabelResponse)
def clean_label(req: CleanLabelRequest) -> CleanLabelResponse:
    r = _guard(lambda: clean_label_attack(
        dataset=req.dataset, target_index=req.target_index, base_class=req.base_class,
        num_poisons=req.num_poisons, beta=req.beta, steps=req.steps, lr=req.lr,
        n_train=req.n_train, seed=req.seed,
    ))
    return CleanLabelResponse(dataset=req.dataset, **r.__dict__)
