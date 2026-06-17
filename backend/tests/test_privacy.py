"""Tests for the DP-SGD privacy/utility trade-off (Opacus).

Raw-pixel MLPs, small subsets — no pretrained weights needed.
"""

from __future__ import annotations

import warnings

import pytest

from app.attacks.privacy import dp_tradeoff

warnings.filterwarnings("ignore")


def test_tradeoff_shape_and_budget():
    r = dp_tradeoff("mnist", epsilons=[1.0, 8.0], epochs=10, size=400, seed=0)
    assert len(r.points) == 2
    # Points come back sorted by epsilon, and Opacus hits the target budget.
    assert r.points[0].epsilon_target == 1.0 and r.points[1].epsilon_target == 8.0
    for p in r.points:
        assert abs(p.epsilon_spent - p.epsilon_target) < 0.3


def test_smaller_epsilon_means_more_noise_and_less_utility():
    r = dp_tradeoff("mnist", epsilons=[1.0, 8.0], epochs=10, size=400, seed=0)
    low, high = r.points  # eps=1, eps=8
    # Tighter privacy (smaller epsilon) -> more noise.
    assert low.noise_multiplier > high.noise_multiplier
    # DP costs utility: the non-private baseline beats the tightest-budget model.
    assert r.baseline_accuracy > low.accuracy
    # DP must not increase the membership leak (it defends it).
    assert low.mia_auc <= r.baseline_mia_auc + 0.07


def test_metrics_in_range():
    r = dp_tradeoff("mnist", epsilons=[4.0], epochs=8, size=400)
    p = r.points[0]
    for v in (p.accuracy, p.mia_auc, r.baseline_accuracy, r.baseline_mia_auc):
        assert 0.0 <= v <= 1.0
    assert p.noise_multiplier > 0


def test_rejects_nonpositive_epsilon():
    with pytest.raises(ValueError):
        dp_tradeoff("mnist", epsilons=[-1.0], epochs=5, size=400)
