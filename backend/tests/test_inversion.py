"""Tests for model inversion (class-prototype reconstruction).

Requires cached pretrained weights (`make pretrain`); skipped if missing.
"""

from __future__ import annotations

import pytest

from app.attacks.inversion import model_inversion
from app.core.registry import WeightsNotFound


@pytest.fixture(scope="module")
def result():
    try:
        return model_inversion("mnist", target_class=0, steps=300, seed=0)
    except WeightsNotFound:
        pytest.skip("pretrained MNIST weights missing — run `make pretrain`")


def test_reconstruction_fools_the_model(result):
    # The synthetic image — built only from gradients — is classified as the target
    # with high confidence: the model leaks a high-scoring prototype.
    assert result.final_confidence > 0.5
    assert result.recon_pred == result.target_class


def test_confidence_rises_during_optimization(result):
    confs = [p["confidence"] for p in result.curve]
    assert len(confs) >= 5
    assert confs[-1] >= confs[0]


def test_leakage_is_class_specific(result):
    # The reconstruction lands nearest its own class mean (1-in-10 by chance),
    # concrete evidence it captured class-specific structure.
    assert result.leak_confirmed
    assert result.nearest_mean_class == result.target_class
    assert result.target_rank == 1


def test_invalid_class_rejected(result):
    with pytest.raises(ValueError):
        model_inversion("mnist", target_class=99, steps=10)
