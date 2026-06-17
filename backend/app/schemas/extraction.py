"""Request/response models for the Model Extraction + Transfer tab."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

Dataset = Literal["mnist", "cifar10"]
Attack = Literal["fgsm", "pgd"]


class ExtractionRequest(BaseModel):
    dataset: Dataset = "mnist"
    query_budget: int = Field(2000, ge=200, le=4000)
    attack: Attack = "fgsm"
    eps: float = Field(0.3, gt=0, le=1)
    epochs: int = Field(8, ge=2, le=15)
    n_test: int = Field(300, ge=100, le=1000)
    seed: int = 0


class FidelityPoint(BaseModel):
    budget: int
    fidelity: float


class TransferSample(BaseModel):
    true: int
    true_name: str
    orig_png: str
    adv_png: str
    target_orig: int
    target_orig_name: str
    target_adv: int
    target_adv_name: str


class ExtractionResponse(BaseModel):
    dataset: Dataset
    attack: Attack
    eps: float
    query_budget: int
    n_test: int
    target_acc: float
    substitute_acc: float
    fidelity: float
    curve: list[FidelityPoint]
    whitebox_sub_success: float
    transfer_success: float
    direct_success: float
    n_eval: int
    samples: list[TransferSample]
