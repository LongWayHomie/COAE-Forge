"""Request/response models for the Membership Inference tab."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

Dataset = Literal["mnist", "cifar10"]


class MembershipRequest(BaseModel):
    dataset: Dataset = "mnist"
    num_shadows: int = Field(5, ge=1, le=12)
    size: int = Field(300, ge=100, le=2000, description="members = non-members per model")
    epochs: int = Field(120, ge=20, le=600, description="more epochs -> more overfitting")
    hidden: int = Field(256, ge=16, le=512)
    lr: float = Field(0.001, gt=0, le=0.1)
    seed: int = 0


class MembershipResponse(BaseModel):
    dataset: Dataset
    num_shadows: int
    size_per_split: int
    # Overfitting is what makes the attack possible.
    target_train_acc: float
    target_test_acc: float
    overfit_gap: float
    # Attack quality.
    attack_accuracy: float
    attack_precision: float
    attack_recall: float
    attack_auc: float
    baseline: float
    mean_conf_member: float
    mean_conf_nonmember: float
    # Confidence histograms (member vs non-member) for visualization.
    hist_bins: list[float]
    hist_member: list[int]
    hist_nonmember: list[int]
