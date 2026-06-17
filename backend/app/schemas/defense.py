"""Request/response models for the Adversarial Training (Defense) tab."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

Dataset = Literal["mnist", "cifar10"]
Method = Literal["fgsm", "pgd"]


class DefenseRequest(BaseModel):
    dataset: Dataset = "mnist"
    method: Method = "fgsm"
    train_eps: float = Field(0.2, gt=0, le=1)
    eval_eps: float | None = Field(None, gt=0, le=1)
    epochs: int = Field(3, ge=1, le=10)
    n_train: int = Field(2000, ge=500, le=6000)
    n_test: int = Field(300, ge=100, le=1000)
    seed: int = 0


class CurvePoint(BaseModel):
    epsilon: float
    baseline: float
    defended: float


class DefenseSample(BaseModel):
    true: int
    true_name: str
    orig_png: str
    adv_png: str
    baseline_pred: int
    baseline_pred_name: str
    defended_pred: int
    defended_pred_name: str
    defended_holds: bool


class DefenseResponse(BaseModel):
    dataset: Dataset
    method: Method
    train_eps: float
    eval_eps: float
    epochs: int
    n_train: int
    n_test: int
    baseline_clean_acc: float
    defended_clean_acc: float
    baseline_fgsm_acc: float
    defended_fgsm_acc: float
    baseline_pgd_acc: float
    defended_pgd_acc: float
    baseline_attack_success: float
    defended_attack_success: float
    curve: list[CurvePoint]
    samples: list[DefenseSample]
