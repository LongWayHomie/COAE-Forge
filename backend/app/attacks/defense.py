"""Adversarial training — the canonical evasion *defense* (COAE module 12).

Idea: an undefended model is brittle because it has never seen adversarial inputs.
Adversarial training fixes this by generating adversarial examples on the fly and
training on them, so the decision boundary is pushed away from natural images.

To stay interactive on CPU we don't train from scratch: we take the cached
pretrained model as the **baseline**, clone it, and *adversarially fine-tune* the
clone for a few epochs. We then compare both models':
  - clean accuracy           (utility — should barely move)
  - robust accuracy under FGSM / PGD at a budget epsilon (the defense payoff)
and sweep FGSM robustness across epsilons for a curve.

Training adversary defaults to **random-init FGSM** ("Fast is better than free",
Wong et al. 2020) — almost as robust as PGD training but far cheaper. PGD training
is also available.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import torch
import torch.nn.functional as F

from app.core.data import get_dataset, get_spec
from app.core.models import build_model
from app.core.registry import get_model


# --------------------------------------------------------------------------- #
# Batched adversary helpers (operate on a whole batch, perturb [0,1] pixels)
# --------------------------------------------------------------------------- #
def _fgsm_batch(model, x, y, eps, random_start=True):
    """Random-init single-step FGSM on a batch. Returns adversarial images."""
    if eps <= 0:
        return x.detach()
    if random_start:
        delta = torch.empty_like(x).uniform_(-eps, eps)
        x_adv = (x + delta).clamp(0, 1).detach()
    else:
        x_adv = x.clone().detach()
    x_adv.requires_grad_(True)
    loss = F.cross_entropy(model(x_adv), y)
    grad = torch.autograd.grad(loss, x_adv)[0]
    x_adv = (x_adv.detach() + eps * grad.sign())
    x_adv = torch.min(torch.max(x_adv, x - eps), x + eps).clamp(0, 1)
    return x_adv.detach()


def _pgd_batch(model, x, y, eps, alpha=None, steps=10):
    """Multi-step PGD on a batch (stronger eval / training adversary)."""
    if eps <= 0:
        return x.detach()
    if alpha is None:
        alpha = max(eps / 4.0, 0.01)
    delta = torch.empty_like(x).uniform_(-eps, eps)
    x_adv = (x + delta).clamp(0, 1).detach()
    for _ in range(steps):
        x_adv.requires_grad_(True)
        loss = F.cross_entropy(model(x_adv), y)
        grad = torch.autograd.grad(loss, x_adv)[0]
        x_adv = x_adv.detach() + alpha * grad.sign()
        x_adv = torch.min(torch.max(x_adv, x - eps), x + eps).clamp(0, 1)
    return x_adv.detach()


# --------------------------------------------------------------------------- #
# Subset loading + training
# --------------------------------------------------------------------------- #
def _subset(dataset: str, train: bool, n: int, seed: int):
    ds = get_dataset(dataset, train=train)
    g = torch.Generator().manual_seed(seed + (0 if train else 1))
    idx = torch.randperm(len(ds), generator=g)[: min(n, len(ds))]
    x = torch.stack([ds[int(i)][0] for i in idx])
    y = torch.tensor([int(ds[int(i)][1]) for i in idx])
    return x, y


def _clone_pretrained(dataset: str):
    """A fresh model initialised from the cached pretrained weights."""
    base = get_model(dataset)
    clone = build_model(dataset)
    clone.load_state_dict(base.state_dict())
    return clone


def _adversarial_finetune(model, x, y, method, eps, epochs, batch_size=128,
                          lr=1e-3, pgd_steps=7, seed=0):
    """Fine-tune `model` on adversarial examples regenerated every batch."""
    opt = torch.optim.Adam(model.parameters(), lr=lr)
    g = torch.Generator().manual_seed(seed + 7)
    n = len(x)
    model.train()
    for _ in range(epochs):
        perm = torch.randperm(n, generator=g)
        for i in range(0, n, batch_size):
            bi = perm[i : i + batch_size]
            xb, yb = x[bi], y[bi]
            if method == "pgd":
                xb_adv = _pgd_batch(model, xb, yb, eps, steps=pgd_steps)
            else:
                xb_adv = _fgsm_batch(model, xb, yb, eps)
            opt.zero_grad()
            F.cross_entropy(model(xb_adv), yb).backward()
            opt.step()
    model.eval()
    return model


# --------------------------------------------------------------------------- #
# Evaluation
# --------------------------------------------------------------------------- #
@torch.no_grad()
def _clean_acc(model, x, y, batch=256) -> float:
    correct = 0
    for i in range(0, len(x), batch):
        correct += int((model(x[i : i + batch]).argmax(1) == y[i : i + batch]).sum())
    return correct / len(x)


def _robust_acc(model, x, y, eps, kind="fgsm", pgd_steps=10, batch=128) -> float:
    """Accuracy under attack. Adversarial examples are crafted white-box per model."""
    correct = 0
    for i in range(0, len(x), batch):
        xb, yb = x[i : i + batch], y[i : i + batch]
        if kind == "pgd":
            xa = _pgd_batch(model, xb, yb, eps, steps=pgd_steps)
        else:
            xa = _fgsm_batch(model, xb, yb, eps)
        with torch.no_grad():
            correct += int((model(xa).argmax(1) == yb).sum())
    return correct / len(x)


@dataclass
class DefenseResult:
    dataset: str
    method: str
    train_eps: float
    eval_eps: float
    epochs: int
    n_train: int
    n_test: int
    baseline_clean_acc: float
    defended_clean_acc: float
    baseline_fgsm_acc: float
    defended_fgsm_acc: float
    baseline_pgd_acc: float
    defended_pgd_acc: float
    baseline_attack_success: float   # 1 - pgd_acc (share of test points flipped)
    defended_attack_success: float
    curve: list[dict] = field(default_factory=list)   # {epsilon, baseline, defended} FGSM
    samples: list[dict] = field(default_factory=list)  # visual: adv that fools baseline


def defense_experiment(dataset: str, method: str = "fgsm", train_eps: float = 0.2,
                       epochs: int = 3, n_train: int = 2000, n_test: int = 300,
                       eval_eps: float | None = None, seed: int = 0) -> DefenseResult:
    from app.core.imaging import tensor_to_b64png

    spec = get_spec(dataset)
    if eval_eps is None:
        eval_eps = train_eps

    x_tr, y_tr = _subset(dataset, True, n_train, seed)
    x_te, y_te = _subset(dataset, False, n_test, seed)

    baseline = get_model(dataset)                       # undefended (cached)
    defended = _adversarial_finetune(                   # hardened clone
        _clone_pretrained(dataset), x_tr, y_tr, method, train_eps, epochs, seed=seed
    )

    # Headline metrics at eval_eps.
    b_clean = _clean_acc(baseline, x_te, y_te)
    d_clean = _clean_acc(defended, x_te, y_te)
    b_fgsm = _robust_acc(baseline, x_te, y_te, eval_eps, "fgsm")
    d_fgsm = _robust_acc(defended, x_te, y_te, eval_eps, "fgsm")
    b_pgd = _robust_acc(baseline, x_te, y_te, eval_eps, "pgd")
    d_pgd = _robust_acc(defended, x_te, y_te, eval_eps, "pgd")

    # FGSM robustness curve across a few budgets (cheap, single-step).
    grid = [0.0, 0.05, 0.1, 0.15, 0.2, 0.3]
    curve = [
        {
            "epsilon": e,
            "baseline": _robust_acc(baseline, x_te, y_te, e, "fgsm"),
            "defended": _robust_acc(defended, x_te, y_te, e, "fgsm"),
        }
        for e in grid
    ]

    # Visual samples: pick test images the baseline gets right, craft FGSM adv on
    # the baseline at eval_eps, then show both models' predictions on that adv image.
    samples: list[dict] = []
    with torch.no_grad():
        base_pred = baseline(x_te).argmax(1)
    correct_idx = [i for i in range(len(x_te)) if int(base_pred[i]) == int(y_te[i])]
    for i in correct_idx:
        xi = x_te[i : i + 1]
        yi = y_te[i : i + 1]
        xa = _fgsm_batch(baseline, xi, yi, eval_eps)
        with torch.no_grad():
            bp = int(baseline(xa).argmax(1))
            dp = int(defended(xa).argmax(1))
        if bp != int(yi):  # adv that actually fools the baseline — the interesting case
            samples.append({
                "true": int(yi), "true_name": spec.class_names[int(yi)],
                "orig_png": tensor_to_b64png(xi[0]),
                "adv_png": tensor_to_b64png(xa[0]),
                "baseline_pred": bp, "baseline_pred_name": spec.class_names[bp],
                "defended_pred": dp, "defended_pred_name": spec.class_names[dp],
                "defended_holds": dp == int(yi),
            })
        if len(samples) >= 4:
            break

    return DefenseResult(
        dataset=dataset, method=method, train_eps=train_eps, eval_eps=eval_eps,
        epochs=epochs, n_train=len(x_tr), n_test=len(x_te),
        baseline_clean_acc=b_clean, defended_clean_acc=d_clean,
        baseline_fgsm_acc=b_fgsm, defended_fgsm_acc=d_fgsm,
        baseline_pgd_acc=b_pgd, defended_pgd_acc=d_pgd,
        baseline_attack_success=1.0 - b_pgd, defended_attack_success=1.0 - d_pgd,
        curve=curve, samples=samples,
    )
