"""Tests for data-poisoning attacks.

Uses the pretrained MNIST weights (run `make pretrain` first). Kept small/fast by
using modest subset sizes.
"""

from __future__ import annotations

import pytest

from app.attacks.poisoning import clean_label_attack, label_flip_experiment
from app.core.registry import WeightsNotFound

SMALL = dict(n_train=1500, n_test=800)


def _require_weights():
    try:
        label_flip_experiment("mnist", rate=0.0, **SMALL)
    except WeightsNotFound:
        pytest.skip("pretrained MNIST weights missing; run `make pretrain`")


def test_random_flip_reduces_accuracy():
    _require_weights()
    res = label_flip_experiment("mnist", rate=0.4, mode="random", seed=1, **SMALL)
    assert res.num_flipped == int(res.num_train * 0.4)
    assert res.poisoned_acc < res.clean_acc
    assert res.clean_acc > 0.9  # frozen features give a strong clean baseline


def test_targeted_flip_collapses_source_class():
    _require_weights()
    res = label_flip_experiment(
        "mnist", rate=1.0, mode="targeted", source=7, target=1, seed=1, **SMALL
    )
    # Flipping (almost) all 7->1 should wreck recall on class 7 specifically.
    assert res.source_recall_clean > 0.8
    assert res.source_recall_poisoned < res.source_recall_clean - 0.3


def test_targeted_requires_distinct_classes():
    with pytest.raises(ValueError):
        label_flip_experiment("mnist", mode="targeted", source=3, target=3, **SMALL)


def test_clean_label_flips_target_and_collides_features():
    _require_weights()
    res = clean_label_attack(
        "mnist", target_index=0, base_class=3, num_poisons=3,
        beta=0.1, steps=200, lr=0.02, n_train=1500,
    )
    # Crafting must pull poison features close to the target.
    assert res.feat_dist_after < res.feat_dist_before
    # Target was correctly classified, ends up as the base class.
    assert res.pred_before == res.target_class
    assert res.success and res.pred_after == res.base_class
