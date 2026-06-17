"""Model extraction + black-box transfer evasion (COAE modules 8 & 11).

Two linked black-box attacks an adversary runs when they can only *query* a target
model (no weights, no gradients):

1. **Extraction (model stealing).** Send unlabeled inputs to the target, keep its
   predicted labels, and train a local *substitute* on those (input, target-label)
   pairs. We measure **fidelity** — how often the substitute agrees with the target
   on held-out data — and how it grows with the query budget.

2. **Transfer evasion.** The attacker now has a differentiable stand-in. They craft
   adversarial examples white-box on the substitute, then replay them against the
   black-box target. Because different models share decision boundaries, many
   transfer. We compare transfer success to a direct white-box attack on the target
   (the upper bound the attacker can't normally reach).

The substitute deliberately uses a *different, smaller* architecture than the
target — the attacker doesn't know the target's design, yet the attack still works.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import torch
import torch.nn as nn
import torch.nn.functional as F

from app.attacks.defense import _fgsm_batch, _pgd_batch
from app.core.data import get_dataset, get_spec
from app.core.registry import get_model


# --------------------------------------------------------------------------- #
# Substitute model — compact CNN on [0,1] pixels (different from the target)
# --------------------------------------------------------------------------- #
class _Substitute(nn.Module):
    def __init__(self, channels: int, num_classes: int, size: int):
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv2d(channels, 16, 3, padding=1), nn.ReLU(), nn.MaxPool2d(2),
            nn.Conv2d(16, 32, 3, padding=1), nn.ReLU(), nn.MaxPool2d(2),
        )
        flat = 32 * (size // 4) * (size // 4)
        self.classifier = nn.Sequential(
            nn.Flatten(), nn.Linear(flat, 64), nn.ReLU(), nn.Linear(64, num_classes)
        )

    def forward(self, x):
        return self.classifier(self.features(x))


def _build_substitute(dataset: str):
    spec = get_spec(dataset)
    size = 28 if spec.name == "mnist" else 32
    return _Substitute(spec.channels, spec.num_classes, size)


# --------------------------------------------------------------------------- #
# Data + query helpers
# --------------------------------------------------------------------------- #
def _subset(dataset: str, train: bool, n: int, seed: int):
    ds = get_dataset(dataset, train=train)
    g = torch.Generator().manual_seed(seed + (0 if train else 1))
    idx = torch.randperm(len(ds), generator=g)[: min(n, len(ds))]
    x = torch.stack([ds[int(i)][0] for i in idx])
    y = torch.tensor([int(ds[int(i)][1]) for i in idx])
    return x, y


@torch.no_grad()
def _query_labels(target, x, batch=256) -> torch.Tensor:
    """Black-box, label-only query: keep only the target's argmax prediction."""
    out = [target(x[i : i + batch]).argmax(1) for i in range(0, len(x), batch)]
    return torch.cat(out)


def _train_substitute(sub, x, y, epochs, lr=1e-3, batch_size=128, seed=0):
    opt = torch.optim.Adam(sub.parameters(), lr=lr)
    g = torch.Generator().manual_seed(seed + 3)
    sub.train()
    for _ in range(epochs):
        perm = torch.randperm(len(x), generator=g)
        for i in range(0, len(x), batch_size):
            bi = perm[i : i + batch_size]
            opt.zero_grad()
            F.cross_entropy(sub(x[bi]), y[bi]).backward()
            opt.step()
    sub.eval()
    return sub


@torch.no_grad()
def _fidelity(sub, target, x, batch=256) -> float:
    """Agreement between substitute and target predictions (extraction quality)."""
    agree = 0
    for i in range(0, len(x), batch):
        xb = x[i : i + batch]
        agree += int((sub(xb).argmax(1) == target(xb).argmax(1)).sum())
    return agree / len(x)


@torch.no_grad()
def _acc(model, x, y, batch=256) -> float:
    correct = sum(int((model(x[i : i + batch]).argmax(1) == y[i : i + batch]).sum())
                  for i in range(0, len(x), batch))
    return correct / len(x)


# --------------------------------------------------------------------------- #
# Experiment
# --------------------------------------------------------------------------- #
@dataclass
class ExtractionResult:
    dataset: str
    attack: str
    eps: float
    query_budget: int
    n_test: int
    target_acc: float
    substitute_acc: float
    fidelity: float
    curve: list[dict] = field(default_factory=list)        # {budget, fidelity}
    whitebox_sub_success: float = 0.0    # adv flips the substitute (sanity)
    transfer_success: float = 0.0        # adv crafted on sub flips the target (black-box)
    direct_success: float = 0.0          # adv crafted ON target flips it (white-box ref)
    n_eval: int = 0                      # # test points attacked (target-correct ones)
    samples: list[dict] = field(default_factory=list)


def extraction_experiment(dataset: str, query_budget: int = 2000, attack: str = "fgsm",
                          eps: float = 0.3, epochs: int = 8, n_test: int = 300,
                          pgd_steps: int = 10, seed: int = 0) -> ExtractionResult:
    from app.core.imaging import tensor_to_b64png

    spec = get_spec(dataset)
    target = get_model(dataset)

    # Attacker's unlabeled query pool + the labels the target hands back.
    x_pool, _ = _subset(dataset, True, query_budget, seed)
    y_pool = _query_labels(target, x_pool)

    x_te, y_te = _subset(dataset, False, n_test, seed)

    # Fidelity-vs-budget curve: train a substitute at each budget (ascending). The
    # final one (== query_budget) is reused as the attacker's working substitute.
    budgets = sorted({b for b in (200, 500, 1000, query_budget) if b <= query_budget})
    curve, substitute = [], None
    for b in budgets:
        sub = _train_substitute(_build_substitute(dataset), x_pool[:b], y_pool[:b],
                                 epochs=epochs, seed=seed)
        curve.append({"budget": b, "fidelity": _fidelity(sub, target, x_te)})
        substitute = sub

    fidelity = curve[-1]["fidelity"]
    target_acc = _acc(target, x_te, y_te)
    substitute_acc = _acc(substitute, x_te, y_te)

    # Transfer evasion on test points the TARGET gets right (worth flipping).
    with torch.no_grad():
        tgt_pred = target(x_te).argmax(1)
    mask = tgt_pred == y_te
    x_atk, y_atk = x_te[mask], tgt_pred[mask]
    n_eval = len(x_atk)

    def craft(model, x, y):
        return _pgd_batch(model, x, y, eps, steps=pgd_steps) if attack == "pgd" \
            else _fgsm_batch(model, x, y, eps)

    wb_sub = tr = direct = 0.0
    if n_eval:
        x_adv_sub = craft(substitute, x_atk, y_atk)        # crafted on substitute
        x_adv_tgt = craft(target, x_atk, y_atk)            # crafted on target (ref)
        with torch.no_grad():
            wb_sub = float((substitute(x_adv_sub).argmax(1) != y_atk).float().mean())
            tr = float((target(x_adv_sub).argmax(1) != y_atk).float().mean())
            direct = float((target(x_adv_tgt).argmax(1) != y_atk).float().mean())

        # A few transferred examples that actually flip the target.
        with torch.no_grad():
            tgt_adv_pred = target(x_adv_sub).argmax(1)
        samples = []
        for j in range(n_eval):
            if int(tgt_adv_pred[j]) != int(y_atk[j]):
                samples.append({
                    "true": int(y_atk[j]), "true_name": spec.class_names[int(y_atk[j])],
                    "orig_png": tensor_to_b64png(x_atk[j]),
                    "adv_png": tensor_to_b64png(x_adv_sub[j]),
                    "target_orig": int(y_atk[j]), "target_orig_name": spec.class_names[int(y_atk[j])],
                    "target_adv": int(tgt_adv_pred[j]), "target_adv_name": spec.class_names[int(tgt_adv_pred[j])],
                })
            if len(samples) >= 4:
                break
    else:
        samples = []

    return ExtractionResult(
        dataset=dataset, attack=attack, eps=eps, query_budget=query_budget,
        n_test=len(x_te), target_acc=target_acc, substitute_acc=substitute_acc,
        fidelity=fidelity, curve=curve,
        whitebox_sub_success=wb_sub, transfer_success=tr, direct_success=direct,
        n_eval=n_eval, samples=samples,
    )
