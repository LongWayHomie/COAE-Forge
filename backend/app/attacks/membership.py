"""Membership Inference Attack (Shokri et al. 2017) via shadow models.

Goal: given the target model's output on a sample, decide whether that sample was
in its training set. This only works when the model **overfits** — members get
higher confidence than non-members.

We train small **MLP classifiers on raw pixels** of tiny subsets, so the models
genuinely memorize their members and generalize poorly to non-members (a large
train/test confidence gap — strongest on CIFAR-10). Using raw pixels (rather than
the well-generalizing pretrained CNN features) is what makes the leak visible, and
means this attack needs no pretrained weights. Pipeline:

  1. Build a pool of (flattened pixels, label) and split it into disjoint
     (members, non-members) sets for the target and K shadow models.
  2. Train each shadow model on its members; record its output posteriors on
     members (label 1) and non-members (label 0).
  3. Train an attack classifier on (sorted posterior -> membership).
  4. Train the target model; run the attack on its members/non-members and score.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from functools import lru_cache

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_score, recall_score, roc_auc_score

from app.core.data import get_dataset, get_spec


@lru_cache(maxsize=4)
def _pixel_pool(dataset: str, pool_size: int, seed: int):
    """Cached (flattened pixels, labels) drawn from the train split."""
    ds = get_dataset(dataset, train=True)
    g = torch.Generator().manual_seed(seed)
    idx = torch.randperm(len(ds), generator=g)[: min(pool_size, len(ds))]
    images = torch.stack([ds[int(i)][0].flatten() for i in idx])
    labels = torch.tensor([int(ds[int(i)][1]) for i in idx])
    return images, labels


class MLPClassifier(nn.Module):
    def __init__(self, d: int, hidden: int, num_classes: int):
        super().__init__()
        self.net = nn.Sequential(nn.Linear(d, hidden), nn.ReLU(), nn.Linear(hidden, num_classes))

    def forward(self, x):
        return self.net(x)


def _train_overfit(feats, labels, num_classes, hidden, epochs, lr):
    """Train with NO regularization so the model memorizes its members."""
    model = MLPClassifier(feats.shape[1], hidden, num_classes)
    opt = torch.optim.Adam(model.parameters(), lr=lr)  # no weight_decay -> overfits
    model.train()
    for _ in range(epochs):
        opt.zero_grad()
        F.cross_entropy(model(feats), labels).backward()
        opt.step()
    model.eval()
    return model


@torch.no_grad()
def _posteriors(model, feats) -> torch.Tensor:
    return F.softmax(model(feats), dim=1)


@torch.no_grad()
def _accuracy(model, feats, labels) -> float:
    return float((model(feats).argmax(1) == labels).float().mean())


def _attack_features(post: torch.Tensor) -> np.ndarray:
    """Class-agnostic attack features: posteriors sorted descending."""
    return torch.sort(post, dim=1, descending=True).values.numpy()


@dataclass
class MembershipResult:
    dataset: str
    num_shadows: int
    size_per_split: int
    target_train_acc: float
    target_test_acc: float
    overfit_gap: float
    attack_accuracy: float
    attack_precision: float
    attack_recall: float
    attack_auc: float
    baseline: float
    mean_conf_member: float
    mean_conf_nonmember: float
    hist_bins: list[float] = field(default_factory=list)
    hist_member: list[int] = field(default_factory=list)
    hist_nonmember: list[int] = field(default_factory=list)


def membership_inference(dataset: str, num_shadows: int = 5, size: int = 300,
                         epochs: int = 120, hidden: int = 256, lr: float = 0.001,
                         seed: int = 0) -> MembershipResult:
    spec = get_spec(dataset)
    nc = spec.num_classes

    # Need disjoint (members, non-members) for the target + each shadow.
    n_models = num_shadows + 1
    needed = n_models * 2 * size
    feats, labels = _pixel_pool(dataset, needed, seed)
    if len(feats) < needed:
        raise ValueError(f"Not enough data: need {needed}, have {len(feats)}. Reduce size/shadows.")

    def slice_model(m: int):
        base = m * 2 * size
        return (feats[base : base + size], labels[base : base + size]), \
               (feats[base + size : base + 2 * size], labels[base + size : base + 2 * size])

    # ---- Shadow models -> attack training set ---- #
    X_attack, y_attack = [], []
    for s in range(num_shadows):
        (fm, lm), (fn, _ln) = slice_model(s)
        model = _train_overfit(fm, lm, nc, hidden, epochs, lr)
        X_attack += [_attack_features(_posteriors(model, fm)), _attack_features(_posteriors(model, fn))]
        y_attack += [np.ones(size), np.zeros(size)]
    X_attack = np.concatenate(X_attack)
    y_attack = np.concatenate(y_attack)

    attack_clf = LogisticRegression(max_iter=1000)
    attack_clf.fit(X_attack, y_attack)

    # ---- Target model -> run the attack ---- #
    (tfm, tlm), (tfn, tln) = slice_model(num_shadows)
    target = _train_overfit(tfm, tlm, nc, hidden, epochs, lr)
    target_train_acc = _accuracy(target, tfm, tlm)
    target_test_acc = _accuracy(target, tfn, tln)

    post_mem = _posteriors(target, tfm)
    post_non = _posteriors(target, tfn)
    X_eval = np.concatenate([_attack_features(post_mem), _attack_features(post_non)])
    y_eval = np.concatenate([np.ones(size), np.zeros(size)])

    pred = attack_clf.predict(X_eval)
    proba = attack_clf.predict_proba(X_eval)[:, 1]

    conf_mem = post_mem.max(dim=1).values.numpy()
    conf_non = post_non.max(dim=1).values.numpy()
    bins = np.linspace(0, 1, 21)
    h_mem, _ = np.histogram(conf_mem, bins=bins)
    h_non, _ = np.histogram(conf_non, bins=bins)

    return MembershipResult(
        dataset=dataset, num_shadows=num_shadows, size_per_split=size,
        target_train_acc=target_train_acc, target_test_acc=target_test_acc,
        overfit_gap=target_train_acc - target_test_acc,
        attack_accuracy=float(accuracy_score(y_eval, pred)),
        attack_precision=float(precision_score(y_eval, pred, zero_division=0)),
        attack_recall=float(recall_score(y_eval, pred, zero_division=0)),
        attack_auc=float(roc_auc_score(y_eval, proba)),
        baseline=0.5,
        mean_conf_member=float(conf_mem.mean()),
        mean_conf_nonmember=float(conf_non.mean()),
        hist_bins=bins.tolist(),
        hist_member=h_mem.tolist(),
        hist_nonmember=h_non.tolist(),
    )
