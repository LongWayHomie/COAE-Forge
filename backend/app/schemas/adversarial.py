"""Request/response models for the Adversarial Examples tab."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

Dataset = Literal["mnist", "cifar10"]
Attack = Literal["fgsm", "pgd", "deepfool", "ead", "jsma"]


class SampleResponse(BaseModel):
    dataset: Dataset
    index: int
    label: int
    label_name: str
    image_png: str  # data URI
    pred: int
    pred_name: str
    confidence: float


class AttackRequest(BaseModel):
    dataset: Dataset = "mnist"
    sample_index: int = Field(0, ge=0)
    attack: Attack = "fgsm"
    # Free-form per-attack params; see attacks/adversarial.run_attack for keys
    # (epsilon; max_iter/overshoot/num_classes; beta/c/kappa/steps/lr).
    params: dict = Field(default_factory=dict)


class AttackResponse(BaseModel):
    dataset: Dataset
    attack: Attack
    label: int
    label_name: str
    original_png: str
    adversarial_png: str
    perturbation_png: str
    orig_pred: int
    orig_pred_name: str
    orig_conf: float
    adv_pred: int
    adv_pred_name: str
    adv_conf: float
    l2: float
    linf: float
    l0: float
    success: bool
