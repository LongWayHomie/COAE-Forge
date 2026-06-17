"""Membership Inference tab — shadow-model attack."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.attacks.membership import membership_inference
from app.schemas.membership import MembershipRequest, MembershipResponse

router = APIRouter(prefix="/membership", tags=["membership"])


@router.get("/info")
def info() -> dict:
    return {
        "tab": "membership",
        "status": "ready",
        "technique": "shadow_models",
        "note": "Shadow models in frozen-CNN feature space; overfitting MLP heads leak "
                "membership via a confidence gap. Attack model: logistic regression on "
                "sorted posteriors.",
    }


@router.post("/attack", response_model=MembershipResponse)
def attack(req: MembershipRequest) -> MembershipResponse:
    try:
        r = membership_inference(
            dataset=req.dataset, num_shadows=req.num_shadows, size=req.size,
            epochs=req.epochs, hidden=req.hidden, lr=req.lr, seed=req.seed,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return MembershipResponse(**r.__dict__)
