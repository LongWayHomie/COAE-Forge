"""Request/response models for the Differential Privacy tab."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

Dataset = Literal["mnist", "cifar10"]


class DPRequest(BaseModel):
    dataset: Dataset = "mnist"
    epsilons: list[float] = Field(default_factory=lambda: [1.0, 4.0, 10.0], max_length=6)
    delta: float = Field(1e-5, gt=0, lt=1)
    epochs: int = Field(15, ge=3, le=60)
    max_grad_norm: float = Field(1.0, gt=0, le=10)
    size: int = Field(500, ge=200, le=2000)
    seed: int = 0


class DPPointModel(BaseModel):
    epsilon_target: float
    epsilon_spent: float
    noise_multiplier: float
    accuracy: float
    mia_auc: float


class DPResponse(BaseModel):
    dataset: Dataset
    delta: float
    size: int
    epochs: int
    max_grad_norm: float
    baseline_accuracy: float
    baseline_mia_auc: float
    points: list[DPPointModel]
