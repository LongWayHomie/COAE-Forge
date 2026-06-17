"""Request/response models for the Model Inversion tab."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

Dataset = Literal["mnist", "cifar10"]


class InversionRequest(BaseModel):
    dataset: Dataset = "mnist"
    target_class: int = Field(0, ge=0, le=9)
    steps: int = Field(400, ge=50, le=1200)
    lr: float = Field(0.05, gt=0, le=1)
    tv_reg: float = Field(3.0, ge=0, le=20)
    seed: int = 0


class InversionPoint(BaseModel):
    step: int
    confidence: float


class InversionResponse(BaseModel):
    dataset: Dataset
    target_class: int
    class_name: str
    steps: int
    final_confidence: float
    recon_pred: int
    recon_pred_name: str
    recon_png: str
    mean_png: str
    example_png: str
    recon_vs_mean_l2: float
    nearest_mean_class: int
    nearest_mean_name: str
    leak_confirmed: bool
    target_rank: int
    curve: list[InversionPoint]
