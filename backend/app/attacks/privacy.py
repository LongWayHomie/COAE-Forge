"""Differential Privacy (DP-SGD via Opacus) — the privacy/utility trade-off, and
DP as a defense against membership inference.

For each target privacy budget epsilon we train the same small MLP (on raw pixels
of a fixed members set) with **DP-SGD**: per-sample gradient clipping
(`max_grad_norm`) + Gaussian noise, with Opacus picking the noise multiplier to
hit the target epsilon for the given delta/epochs. We then measure:

  - utility : test accuracy on held-out non-members
  - privacy : a confidence-threshold membership-inference AUC (Yeom et al. 2018)
              — how separable member vs non-member confidences are

A non-private baseline (epsilon = infinity) anchors the curve. Smaller epsilon =>
more noise => lower accuracy but a smaller membership leak. This directly defends
the attack from the Membership Inference tab.
"""

from __future__ import annotations

import warnings
from dataclasses import dataclass, field
from functools import lru_cache

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from opacus import PrivacyEngine
from sklearn.metrics import roc_auc_score
from torch.utils.data import DataLoader, TensorDataset

from app.core.data import get_dataset, get_spec


@lru_cache(maxsize=4)
def _split(dataset: str, size: int, seed: int):
    """Cached disjoint (members, non-members) as flattened pixels + labels."""
    ds = get_dataset(dataset, train=True)
    g = torch.Generator().manual_seed(seed)
    idx = torch.randperm(len(ds), generator=g)[: 2 * size]
    if len(idx) < 2 * size:
        raise ValueError(f"Not enough data for size={size}.")
    X = torch.stack([ds[int(i)][0].flatten() for i in idx])
    y = torch.tensor([int(ds[int(i)][1]) for i in idx])
    return X[:size], y[:size], X[size:], y[size:]


def _make_mlp(d: int, hidden: int, num_classes: int) -> nn.Module:
    return nn.Sequential(nn.Linear(d, hidden), nn.ReLU(), nn.Linear(hidden, num_classes))


@torch.no_grad()
def _accuracy(model, X, y) -> float:
    model.eval()
    return float((model(X).argmax(1) == y).float().mean())


@torch.no_grad()
def _confidence(model, X) -> np.ndarray:
    model.eval()
    return F.softmax(model(X), dim=1).max(dim=1).values.numpy()


def _confidence_mia_auc(model, X_mem, X_non) -> float:
    scores = np.concatenate([_confidence(model, X_mem), _confidence(model, X_non)])
    labels = np.concatenate([np.ones(len(X_mem)), np.zeros(len(X_non))])
    return float(roc_auc_score(labels, scores))


def _train_plain(X, y, nc, hidden, epochs, lr, batch_size) -> nn.Module:
    model = _make_mlp(X.shape[1], hidden, nc)
    opt = torch.optim.Adam(model.parameters(), lr=lr)
    model.train()
    loader = DataLoader(TensorDataset(X, y), batch_size=batch_size, shuffle=True)
    for _ in range(epochs):
        for xb, yb in loader:
            opt.zero_grad()
            F.cross_entropy(model(xb), yb).backward()
            opt.step()
    return model


def _train_dp(X, y, nc, hidden, epochs, lr, batch_size, target_epsilon, delta, max_grad_norm):
    model = _make_mlp(X.shape[1], hidden, nc)
    opt = torch.optim.Adam(model.parameters(), lr=lr)
    loader = DataLoader(TensorDataset(X, y), batch_size=batch_size, shuffle=True)
    engine = PrivacyEngine()
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        model, opt, loader = engine.make_private_with_epsilon(
            module=model, optimizer=opt, data_loader=loader,
            epochs=epochs, target_epsilon=target_epsilon, target_delta=delta,
            max_grad_norm=max_grad_norm,
        )
        model.train()
        for _ in range(epochs):
            for xb, yb in loader:
                opt.zero_grad()
                F.cross_entropy(model(xb), yb).backward()
                opt.step()
    return model, float(engine.get_epsilon(delta)), float(opt.noise_multiplier)


@dataclass
class DPPoint:
    epsilon_target: float
    epsilon_spent: float
    noise_multiplier: float
    accuracy: float
    mia_auc: float


@dataclass
class DPResult:
    dataset: str
    delta: float
    size: int
    epochs: int
    max_grad_norm: float
    baseline_accuracy: float
    baseline_mia_auc: float
    points: list[DPPoint] = field(default_factory=list)


def dp_tradeoff(dataset: str, epsilons: list[float] | None = None, delta: float = 1e-5,
                epochs: int = 15, max_grad_norm: float = 1.0, size: int = 500,
                hidden: int = 128, lr: float = 0.015, batch_size: int = 128,
                seed: int = 0) -> DPResult:
    epsilons = sorted(epsilons or [1.0, 4.0, 10.0])
    if any(e <= 0 for e in epsilons):
        raise ValueError("epsilons must be positive")
    spec = get_spec(dataset)
    nc = spec.num_classes
    X_mem, y_mem, X_non, y_non = _split(dataset, size, seed)

    # Non-private baseline (epsilon = infinity).
    base = _train_plain(X_mem, y_mem, nc, hidden, epochs, lr, batch_size)
    base_acc = _accuracy(base, X_non, y_non)
    base_auc = _confidence_mia_auc(base, X_mem, X_non)

    points: list[DPPoint] = []
    for eps in epsilons:
        model, eps_spent, noise = _train_dp(
            X_mem, y_mem, nc, hidden, epochs, lr, batch_size, eps, delta, max_grad_norm
        )
        points.append(DPPoint(
            epsilon_target=eps, epsilon_spent=eps_spent, noise_multiplier=noise,
            accuracy=_accuracy(model, X_non, y_non),
            mia_auc=_confidence_mia_auc(model, X_mem, X_non),
        ))

    return DPResult(
        dataset=dataset, delta=delta, size=size, epochs=epochs, max_grad_norm=max_grad_norm,
        baseline_accuracy=base_acc, baseline_mia_auc=base_auc, points=points,
    )
