"""Tests for the membership inference (shadow-model) attack.

Uses raw pixels, so no pretrained weights are required (only the dataset download).
"""

from __future__ import annotations

import pytest

from app.attacks.membership import membership_inference


def test_attack_beats_baseline_and_overfits():
    r = membership_inference("mnist", num_shadows=4, size=300, epochs=120, seed=0)
    # The target must overfit (members classified better than non-members)...
    assert r.target_train_acc > r.target_test_acc
    assert r.mean_conf_member > r.mean_conf_nonmember
    # ...and the attack must beat the random 50% baseline meaningfully.
    assert r.attack_auc > 0.6
    assert r.attack_accuracy > 0.55


def test_histograms_well_formed():
    r = membership_inference("mnist", num_shadows=3, size=300, epochs=100, seed=1)
    assert len(r.hist_bins) == 21
    assert len(r.hist_member) == 20 and len(r.hist_nonmember) == 20
    assert sum(r.hist_member) == r.size_per_split
    assert sum(r.hist_nonmember) == r.size_per_split


def test_attack_metrics_in_range():
    r = membership_inference("mnist", num_shadows=3, size=300, epochs=100, seed=2)
    for v in (r.attack_accuracy, r.attack_precision, r.attack_recall, r.attack_auc):
        assert 0.0 <= v <= 1.0
    assert r.size_per_split == 300 and r.num_shadows == 3
