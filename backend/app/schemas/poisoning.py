"""Request/response models for the Data Poisoning tab."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

Dataset = Literal["mnist", "cifar10"]


# ---- Label flipping ---- #
class LabelFlipRequest(BaseModel):
    dataset: Dataset = "mnist"
    rate: float = Field(0.2, ge=0, le=1)
    mode: Literal["random", "targeted"] = "random"
    source: int = Field(0, ge=0, le=9)
    target: int = Field(1, ge=0, le=9)
    n_train: int = Field(4000, ge=200, le=20000)
    n_test: int = Field(2000, ge=200, le=10000)
    seed: int = 0


class FlippedSample(BaseModel):
    image_png: str
    true_label: int
    true_name: str
    flipped_label: int
    flipped_name: str


class LabelFlipResponse(BaseModel):
    dataset: Dataset
    mode: str
    clean_acc: float
    poisoned_acc: float
    acc_drop: float
    num_flipped: int
    num_train: int
    class_names: list[str]
    per_class_clean: list[float]
    per_class_poisoned: list[float]
    samples: list[FlippedSample]
    source_recall_clean: float | None = None
    source_recall_poisoned: float | None = None


# ---- Clean-label feature collision ---- #
class CleanLabelRequest(BaseModel):
    dataset: Dataset = "mnist"
    target_index: int = Field(0, ge=0)
    base_class: int = Field(0, ge=0, le=9)
    num_poisons: int = Field(1, ge=1, le=10)
    beta: float = Field(0.1, ge=0, le=2)
    steps: int = Field(200, ge=20, le=1000)
    lr: float = Field(0.02, gt=0, le=0.2)
    n_train: int = Field(4000, ge=200, le=20000)
    seed: int = 0


class CleanLabelResponse(BaseModel):
    dataset: Dataset
    target_index: int
    target_class: int
    target_name: str
    base_class: int
    base_name: str
    pred_before: int
    pred_before_name: str
    pred_after: int
    pred_after_name: str
    success: bool
    num_poisons: int
    feat_dist_before: float
    feat_dist_after: float
    target_png: str
    base_png: str
    poison_pngs: list[str]
