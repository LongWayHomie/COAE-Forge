"""Tests for model extraction + black-box transfer evasion.

Requires cached pretrained weights (`make pretrain`); skipped if missing. Uses a
modest budget / few epochs to stay fast on CPU.
"""

from __future__ import annotations

import pytest

from app.attacks.extraction import extraction_experiment
from app.core.registry import WeightsNotFound


@pytest.fixture(scope="module")
def result():
    try:
        return extraction_experiment(
            "mnist", query_budget=1000, attack="fgsm", eps=0.3,
            epochs=6, n_test=250, seed=0,
        )
    except WeightsNotFound:
        pytest.skip("pretrained MNIST weights missing — run `make pretrain`")


def test_fidelity_grows_with_budget(result):
    pts = result.curve
    assert len(pts) >= 2
    assert pts[-1]["budget"] > pts[0]["budget"]
    # More queries should not produce a worse substitute than the smallest budget.
    assert pts[-1]["fidelity"] >= pts[0]["fidelity"]
    assert 0.0 <= result.fidelity <= 1.0


def test_substitute_learns_something(result):
    # The stolen model beats random guessing on the real task.
    assert result.substitute_acc > 0.5
    assert result.target_acc > 0.9


def test_transfer_is_real_but_below_whitebox(result):
    # White-box on the substitute should work well; transfer to the target is real
    # (the substitute is a usable stand-in) yet weaker than a direct white-box attack.
    assert result.whitebox_sub_success > 0.5
    assert result.transfer_success > 0.0
    assert result.transfer_success <= result.direct_success + 1e-6
    assert result.n_eval > 0
