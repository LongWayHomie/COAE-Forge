"""Tests for the from-scratch adversarial attacks.

Self-contained: quick-trains a small MNIST model on a subset so the tests don't
depend on `scripts.pretrain` having run. MNIST is downloaded on first run.
"""

from __future__ import annotations

import pytest
import torch
import torch.nn.functional as F
from torch.utils.data import DataLoader, Subset

from app.attacks.adversarial import _as_batch, deepfool, ead, fgsm, jsma, pgd, run_attack
from app.core.data import get_dataset
from app.core.models import build_model


@pytest.fixture(scope="module")
def trained_mnist():
    torch.manual_seed(0)
    model = build_model("mnist")
    train = Subset(get_dataset("mnist", train=True), range(2000))
    loader = DataLoader(train, batch_size=64, shuffle=True)
    opt = torch.optim.Adam(model.parameters(), lr=1e-3)
    model.train()
    for _ in range(2):  # two quick passes over 2k samples
        for x, y in loader:
            opt.zero_grad()
            F.cross_entropy(model(x), y).backward()
            opt.step()
    model.eval()
    return model


@pytest.fixture(scope="module")
def correct_sample(trained_mnist):
    """A test image the model classifies correctly (so flips are meaningful)."""
    test = get_dataset("mnist", train=False)
    for i in range(50):
        x, y = test[i]
        pred = int(trained_mnist(_as_batch(x))[0].argmax())
        if pred == y:
            return x, y
    pytest.skip("model did not classify any of the first 50 samples correctly")


def _conf_in(model, x, cls):
    probs = F.softmax(model(_as_batch(x))[0], dim=-1)
    return float(probs[cls])


def test_fgsm_respects_linf_and_drops_confidence(trained_mnist, correct_sample):
    x, y = correct_sample
    eps = 0.25
    x_adv = fgsm(trained_mnist, x, y, epsilon=eps)

    delta = (x_adv - x)
    assert float(delta.abs().max()) <= eps + 1e-5  # clamp can only shrink it
    assert _conf_in(trained_mnist, x_adv, y) < _conf_in(trained_mnist, x, y)
    assert torch.all((x_adv >= 0) & (x_adv <= 1))


def test_pgd_respects_linf_and_flips(trained_mnist, correct_sample):
    x, y = correct_sample
    eps = 0.3
    x_adv = pgd(trained_mnist, x, y, epsilon=eps, alpha=0.03, steps=40)

    delta = (x_adv - x)
    assert float(delta.abs().max()) <= eps + 1e-5  # stays inside the L-inf ball
    assert torch.all((x_adv >= 0) & (x_adv <= 1))
    pred = int(trained_mnist(_as_batch(x_adv))[0].argmax())
    assert pred != y  # iterative attack should flip where FGSM might not


def test_jsma_is_sparse_and_flips(trained_mnist, correct_sample):
    x, y = correct_sample
    x_adv = jsma(trained_mnist, x, target=None, orig_label=y, gamma=0.14)

    pred = int(trained_mnist(_as_batch(x_adv))[0].argmax())
    l0 = int((x_adv - x).abs().gt(1e-6).sum())
    assert pred != y
    assert torch.all((x_adv >= 0) & (x_adv <= 1))
    # sparsity: far fewer than all pixels changed (gamma cap is 14%)
    assert 0 < l0 <= int(0.14 * x[0].numel()) + 1


def test_deepfool_flips_with_small_l2(trained_mnist, correct_sample):
    x, y = correct_sample
    x_adv = deepfool(trained_mnist, x, num_classes=10, max_iter=50)

    pred = int(trained_mnist(_as_batch(x_adv))[0].argmax())
    l2 = float((x_adv - x).flatten().norm())
    assert pred != y
    assert 0 < l2 < 5.0  # minimal-norm attack should stay small


def test_ead_flips_label(trained_mnist, correct_sample):
    x, y = correct_sample
    x_adv = ead(trained_mnist, x, orig_label=y, beta=0.01, steps=120, lr=0.02)

    pred = int(trained_mnist(_as_batch(x_adv))[0].argmax())
    assert pred != y
    assert torch.all((x_adv >= 0) & (x_adv <= 1))


def test_run_attack_outcome_fields(trained_mnist, correct_sample):
    x, y = correct_sample
    out = run_attack(trained_mnist, x, y, "fgsm", {"epsilon": 0.3}, num_classes=10)
    assert out.success is True
    assert out.l2 > 0 and out.linf > 0 and out.l0 > 0
    assert out.adv_pred != out.orig_pred
