"""Adversarial Examples tab — real endpoints."""

from __future__ import annotations

import torch.nn.functional as F
from fastapi import APIRouter, HTTPException, Query

from app.attacks.adversarial import run_attack, _as_batch
from app.core.data import get_sample, get_spec
from app.core.imaging import perturbation_to_b64png, tensor_to_b64png
from app.core.registry import WeightsNotFound, get_model
from app.schemas.adversarial import AttackRequest, AttackResponse, SampleResponse

router = APIRouter(prefix="/adversarial", tags=["adversarial"])


def _load(dataset: str):
    try:
        return get_model(dataset)
    except WeightsNotFound as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.get("/sample", response_model=SampleResponse)
def get_sample_endpoint(
    dataset: str = Query("mnist"),
    index: int = Query(0, ge=0),
) -> SampleResponse:
    spec = get_spec(dataset)
    x, label = get_sample(dataset, index)
    model = _load(dataset)

    probs = F.softmax(model(_as_batch(x))[0], dim=-1)
    pred = int(probs.argmax())
    return SampleResponse(
        dataset=dataset,
        index=index,
        label=label,
        label_name=spec.class_names[label],
        image_png=tensor_to_b64png(x),
        pred=pred,
        pred_name=spec.class_names[pred],
        confidence=float(probs.max()),
    )


@router.post("/attack", response_model=AttackResponse)
def attack_endpoint(req: AttackRequest) -> AttackResponse:
    spec = get_spec(req.dataset)
    x, label = get_sample(req.dataset, req.sample_index)
    model = _load(req.dataset)

    outcome = run_attack(
        model, x, label, req.attack, req.params, num_classes=spec.num_classes
    )

    return AttackResponse(
        dataset=req.dataset,
        attack=req.attack,
        label=label,
        label_name=spec.class_names[label],
        original_png=tensor_to_b64png(x),
        adversarial_png=tensor_to_b64png(outcome.x_adv),
        perturbation_png=perturbation_to_b64png(outcome.x_adv - x),
        orig_pred=outcome.orig_pred,
        orig_pred_name=spec.class_names[outcome.orig_pred],
        orig_conf=outcome.orig_conf,
        adv_pred=outcome.adv_pred,
        adv_pred_name=spec.class_names[outcome.adv_pred],
        adv_conf=outcome.adv_conf,
        l2=outcome.l2,
        linf=outcome.linf,
        l0=outcome.l0,
        success=outcome.success,
    )
