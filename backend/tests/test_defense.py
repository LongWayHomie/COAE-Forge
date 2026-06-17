"""Tests for adversarial training (the Defense tab).

Requires cached pretrained weights (`make pretrain`); skipped if missing. Uses tiny
subsets / few epochs so it stays fast on CPU.
"""

from __future__ import annotations

import pytest

from app.attacks.defense import defense_experiment
from app.core.registry import WeightsNotFound


@pytest.fixture(scope="module")
def result():
    try:
        return defense_experiment(
            "mnist", method="fgsm", train_eps=0.2, epochs=2,
            n_train=1200, n_test=200, seed=0,
        )
    except WeightsNotFound:
        pytest.skip("pretrained MNIST weights missing — run `make pretrain`")


def test_defense_improves_robustness(result):
    # The hardened model must be more robust under both FGSM and PGD at eval_eps.
    assert result.defended_pgd_acc > result.baseline_pgd_acc
    assert result.defended_fgsm_acc > result.baseline_fgsm_acc
    # Headline: attack success rate drops after the defense.
    assert result.defended_attack_success < result.baseline_attack_success


def test_clean_accuracy_retained(result):
    # Robustness shouldn't tank clean accuracy (allow a modest utility cost).
    assert result.defended_clean_acc > result.baseline_clean_acc - 0.25


def test_curve_shape_and_monotone_gap(result):
    pts = result.curve
    assert len(pts) >= 4
    # At epsilon 0 both equal clean accuracy (no perturbation).
    z = next(p for p in pts if p["epsilon"] == 0.0)
    assert abs(z["baseline"] - result.baseline_clean_acc) < 1e-6
    # At the largest epsilon the defended model is no worse than the baseline.
    big = max(pts, key=lambda p: p["epsilon"])
    assert big["defended"] >= big["baseline"]
