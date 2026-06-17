"""Adversarial-example attacks, implemented from scratch in PyTorch.

All attacks operate on a single image in **[0, 1] pixel space**:
  - input  `x`: tensor of shape (C, H, W) or (1, C, H, W)
  - `model`: classifier returning logits, accepting [0, 1] inputs
  - output: adversarial image of shape (C, H, W), clamped to [0, 1]

Implemented:
  - fgsm     : Goodfellow et al. 2015 — single-step L-infinity sign attack
  - pgd      : Madry et al. 2018 — iterative FGSM in an L-infinity ball (first-order)
  - deepfool : Moosavi-Dezfooli et al. 2016 — iterative minimal-L2 attack
  - ead      : Chen et al. 2018 — Elastic-Net (L1+L2) attack via FISTA/ISTA
  - jsma     : Papernot et al. 2016 — Jacobian saliency-map L0 (sparse) attack
"""

from __future__ import annotations

from dataclasses import dataclass

import torch
import torch.nn.functional as F


def _as_batch(x: torch.Tensor) -> torch.Tensor:
    return x.unsqueeze(0) if x.dim() == 3 else x


# --------------------------------------------------------------------------- #
# FGSM
# --------------------------------------------------------------------------- #
def fgsm(model: torch.nn.Module, x: torch.Tensor, y: int, epsilon: float) -> torch.Tensor:
    """Fast Gradient Sign Method. Perturbs every pixel by ±epsilon."""
    xb = _as_batch(x).clone().detach()
    yb = torch.tensor([y], device=xb.device)
    xb.requires_grad_(True)

    loss = F.cross_entropy(model(xb), yb)
    grad = torch.autograd.grad(loss, xb)[0]
    x_adv = (xb + epsilon * grad.sign()).clamp(0, 1).detach()
    return x_adv.squeeze(0)


# --------------------------------------------------------------------------- #
# PGD (Projected Gradient Descent) — the canonical first-order L-infinity attack
# --------------------------------------------------------------------------- #
def pgd(
    model: torch.nn.Module,
    x: torch.Tensor,
    y: int,
    epsilon: float = 0.2,
    alpha: float = 0.03,
    steps: int = 40,
    random_start: bool = True,
) -> torch.Tensor:
    """Madry et al. 2018: iterative FGSM, projected back into the L-inf epsilon ball.

    Stronger than single-step FGSM because it takes many small `alpha` steps and
    re-projects so the total perturbation never leaves ||delta||_inf <= epsilon.
    With `random_start` the perturbation is initialised uniformly in that ball,
    which helps escape the model's local gradient masking.
    """
    x0 = _as_batch(x).clone().detach()
    yb = torch.tensor([y], device=x0.device)

    if random_start:
        delta = torch.empty_like(x0).uniform_(-epsilon, epsilon)
        x_adv = (x0 + delta).clamp(0, 1).detach()
    else:
        x_adv = x0.clone().detach()

    for _ in range(steps):
        x_adv.requires_grad_(True)
        loss = F.cross_entropy(model(x_adv), yb)
        grad = torch.autograd.grad(loss, x_adv)[0]
        x_adv = x_adv.detach() + alpha * grad.sign()
        # project back into the epsilon L-inf ball around x0, then into [0, 1]
        x_adv = torch.min(torch.max(x_adv, x0 - epsilon), x0 + epsilon)
        x_adv = x_adv.clamp(0, 1).detach()

    return x_adv.squeeze(0)


# --------------------------------------------------------------------------- #
# DeepFool
# --------------------------------------------------------------------------- #
def deepfool(
    model: torch.nn.Module,
    x: torch.Tensor,
    num_classes: int = 10,
    max_iter: int = 50,
    overshoot: float = 0.02,
) -> torch.Tensor:
    """Iteratively walk to the nearest decision boundary (minimal L2)."""
    x0 = _as_batch(x).clone().detach()

    with torch.no_grad():
        f0 = model(x0)[0]
    orig = int(f0.argmax())
    # Only consider the most-likely candidate classes for efficiency.
    candidates = [int(k) for k in f0.argsort(descending=True)[:num_classes] if int(k) != orig]

    r_tot = torch.zeros_like(x0)
    label = orig
    for _ in range(max_iter):
        if label != orig:
            break
        xk = (x0 + (1 + overshoot) * r_tot).clamp(0, 1).detach().requires_grad_(True)
        fs = model(xk)[0]
        grad_orig = torch.autograd.grad(fs[orig], xk, retain_graph=True)[0]

        best_pert, best_w = None, None
        for k in candidates:
            grad_k = torch.autograd.grad(fs[k], xk, retain_graph=True)[0]
            w_k = grad_k - grad_orig
            f_k = (fs[k] - fs[orig]).detach()
            pert_k = f_k.abs() / (w_k.flatten().norm() + 1e-8)
            if best_pert is None or pert_k < best_pert:
                best_pert, best_w = pert_k, w_k

        # +1e-4 nudges across the boundary.
        r_i = (best_pert + 1e-4) * best_w / (best_w.flatten().norm() + 1e-8)
        r_tot = r_tot + r_i

        with torch.no_grad():
            probe = (x0 + (1 + overshoot) * r_tot).clamp(0, 1)
            label = int(model(probe)[0].argmax())

    x_adv = (x0 + (1 + overshoot) * r_tot).clamp(0, 1).detach()
    return x_adv.squeeze(0)


# --------------------------------------------------------------------------- #
# EAD (Elastic-Net Attacks to DNNs)
# --------------------------------------------------------------------------- #
def _ead_loss_fn(logits: torch.Tensor, orig: int, target: int | None, kappa: float) -> torch.Tensor:
    """The smooth f-term. Untargeted: push original class below the runner-up."""
    z = logits[0]
    if target is None:  # untargeted
        other = z.clone()
        other[orig] = -float("inf")
        return torch.clamp(z[orig] - other.max() + kappa, min=0.0)
    # targeted: push target class above the best non-target
    other = z.clone()
    other[target] = -float("inf")
    return torch.clamp(other.max() - z[target] + kappa, min=0.0)


def _ead_optimize(
    model: torch.nn.Module,
    x0: torch.Tensor,
    orig_label: int,
    target: int | None,
    beta: float,
    c: float,
    kappa: float,
    steps: int,
    lr: float,
) -> tuple[torch.Tensor | None, float]:
    """Inner ISTA/FISTA optimization for a fixed `c`.

    Minimizes  c * f(x) + ||x - x0||_2^2 + beta * ||x - x0||_1  over x in [0, 1].
    Returns (best successful adversarial or None, its elastic-net distortion).
    """
    xk = x0.clone()
    yk = x0.clone()  # FISTA "slack" variable
    best_adv, best_dist = None, float("inf")

    for i in range(steps):
        yk = yk.clone().detach().requires_grad_(True)
        logits = model(yk)
        f = _ead_loss_fn(logits, orig_label, target, kappa)
        smooth = c * f + (yk - x0).pow(2).sum()  # L2 + f are the smooth part
        grad = torch.autograd.grad(smooth, yk)[0]

        # ISTA: gradient step on smooth part, then soft-threshold (the L1 prox)
        # toward x0 with threshold beta, then project to [0, 1].
        z = (yk - lr * grad).detach()
        diff = z - x0
        upper = torch.clamp(z - beta, max=1.0)
        lower = torch.clamp(z + beta, min=0.0)
        x_next = torch.where(diff > beta, upper, torch.where(diff < -beta, lower, x0))
        x_next = x_next.clamp(0, 1)

        # FISTA momentum.
        yk = (x_next + (i / (i + 3.0)) * (x_next - xk)).detach()
        xk = x_next.detach()

        # Track the best successful adversarial by elastic-net distortion.
        with torch.no_grad():
            pred = int(model(xk)[0].argmax())
        success = (pred == target) if target is not None else (pred != orig_label)
        if success:
            d = (xk - x0).pow(2).sum() + beta * (xk - x0).abs().sum()
            if d.item() < best_dist:
                best_dist, best_adv = d.item(), xk.clone()

    return best_adv, best_dist


def ead(
    model: torch.nn.Module,
    x: torch.Tensor,
    orig_label: int,
    target: int | None = None,
    beta: float = 0.01,
    c: float = 1.0,
    kappa: float = 0.0,
    steps: int = 100,
    lr: float = 0.01,
    search_steps: int = 6,
) -> torch.Tensor:
    """Elastic-net (L1+L2) attack with a binary search over the constant `c`.

    `beta` weights the L1 (sparsity) term; `c` trades adversarial loss vs.
    distortion. Following CW/EAD, we binary-search `c`: raise it until the attack
    succeeds, then lower it to shrink distortion, keeping the best image found.
    Returns the lowest-distortion successful adversarial (or the last attempt).
    """
    x0 = _as_batch(x).clone().detach()

    lo, hi = 0.0, float("inf")
    cur_c = c
    overall_best, overall_dist = None, float("inf")
    last_attempt = None

    for _ in range(max(1, search_steps)):
        adv, dist = _ead_optimize(model, x0, orig_label, target, beta, cur_c, kappa, steps, lr)
        if adv is not None:
            last_attempt = adv
            if dist < overall_dist:
                overall_best, overall_dist = adv, dist
            # success -> try a smaller c to reduce distortion
            hi = cur_c
            cur_c = (lo + hi) / 2
        else:
            # failure -> need a larger c
            lo = cur_c
            cur_c = (lo + hi) / 2 if hi < float("inf") else cur_c * 10

    out = overall_best if overall_best is not None else (last_attempt if last_attempt is not None else x0)
    return out.squeeze(0)


# --------------------------------------------------------------------------- #
# JSMA (Jacobian-based Saliency Map Attack) — sparse / L0
# --------------------------------------------------------------------------- #
def jsma(
    model: torch.nn.Module,
    x: torch.Tensor,
    target: int | None = None,
    orig_label: int | None = None,
    theta: float = 1.0,
    gamma: float = 0.14,
    num_classes: int = 10,
) -> torch.Tensor:
    """Papernot et al. 2016: change as *few pixels as possible* (an L0 attack).

    Each step computes the Jacobian of the class logits w.r.t. the input, builds a
    saliency map that scores how strongly each pixel pushes the target class up
    while pushing all other classes down, then saturates the single best pixel.
    `gamma` caps the fraction of pixels allowed to change; `theta` is the per-step
    push (+1 toward white). Untargeted runs pick the easiest wrong class as target.
    """
    x0 = _as_batch(x).clone().detach()
    n_features = x0[0].numel()
    max_changes = max(1, int(gamma * n_features))

    with torch.no_grad():
        logits0 = model(x0)[0]
    if orig_label is None:
        orig_label = int(logits0.argmax())
    if target is None:
        # untargeted: aim at the current runner-up class (easiest to reach)
        order = logits0.argsort(descending=True)
        target = int(next(k for k in order if int(k) != orig_label))

    x_adv = x0.clone().detach()
    # increasing pixels toward 1.0 (theta>0); track which are already saturated
    search_domain = (x_adv[0].flatten() < 1.0)
    changed = 0

    while changed < max_changes:
        with torch.no_grad():
            pred = int(model(x_adv)[0].argmax())
        if pred == target:
            break

        xk = x_adv.clone().detach().requires_grad_(True)
        logits = model(xk)[0]
        # Jacobian rows: gradient of each class score w.r.t. the input pixels.
        jac = torch.stack(
            [torch.autograd.grad(logits[c], xk, retain_graph=True)[0].flatten()
             for c in range(num_classes)]
        )  # (num_classes, n_features)

        grad_t = jac[target]
        grad_other = jac.sum(0) - grad_t  # sum over the non-target classes

        avail = search_domain
        # saliency: want target-grad positive and others negative; zero out the rest
        sal = torch.where((grad_t > 0) & (grad_other < 0) & avail,
                          grad_t * grad_other.abs(), torch.zeros_like(grad_t))
        if float(sal.max()) <= 0:
            break

        p = int(sal.argmax())
        flat = x_adv[0].flatten()
        flat[p] = float(min(1.0, flat[p].item() + theta))
        x_adv = flat.view_as(x_adv[0]).unsqueeze(0).detach()
        if flat[p].item() >= 1.0:
            search_domain[p] = False
        changed += 1

    return x_adv.squeeze(0)


# --------------------------------------------------------------------------- #
# Dispatch + metrics
# --------------------------------------------------------------------------- #
@dataclass
class AttackOutcome:
    x_adv: torch.Tensor
    orig_pred: int
    orig_conf: float
    adv_pred: int
    adv_conf: float
    l2: float
    linf: float
    l0: float
    success: bool


def run_attack(
    model: torch.nn.Module,
    x: torch.Tensor,
    true_label: int,
    attack: str,
    params: dict,
    num_classes: int,
) -> AttackOutcome:
    """Run a named attack and compute before/after predictions and L2/Linf/L0."""
    xb = _as_batch(x)
    with torch.no_grad():
        probs0 = F.softmax(model(xb)[0], dim=-1)
    orig_pred = int(probs0.argmax())
    orig_conf = float(probs0.max())

    if attack == "fgsm":
        x_adv = fgsm(model, x, orig_pred, float(params.get("epsilon", 0.2)))
    elif attack == "pgd":
        x_adv = pgd(
            model, x, orig_pred,
            epsilon=float(params.get("epsilon", 0.2)),
            alpha=float(params.get("alpha", 0.03)),
            steps=int(params.get("steps", 40)),
            random_start=bool(params.get("random_start", True)),
        )
    elif attack == "jsma":
        x_adv = jsma(
            model, x,
            target=params.get("target"),
            orig_label=orig_pred,
            theta=float(params.get("theta", 1.0)),
            gamma=float(params.get("gamma", 0.14)),
            num_classes=int(params.get("num_classes", num_classes)),
        )
    elif attack == "deepfool":
        x_adv = deepfool(
            model, x,
            num_classes=int(params.get("num_classes", num_classes)),
            max_iter=int(params.get("max_iter", 50)),
            overshoot=float(params.get("overshoot", 0.02)),
        )
    elif attack == "ead":
        x_adv = ead(
            model, x, orig_pred,
            target=params.get("target"),
            beta=float(params.get("beta", 0.01)),
            c=float(params.get("c", 1.0)),
            kappa=float(params.get("kappa", 0.0)),
            steps=int(params.get("steps", 100)),
            lr=float(params.get("lr", 0.01)),
            search_steps=int(params.get("search_steps", 6)),
        )
    else:
        raise ValueError(f"Unknown attack {attack!r}")

    with torch.no_grad():
        probs1 = F.softmax(model(_as_batch(x_adv))[0], dim=-1)
    adv_pred = int(probs1.argmax())
    adv_conf = float(probs1.max())

    delta = (x_adv - x).detach()
    l2 = float(delta.flatten().norm(p=2))
    linf = float(delta.abs().max())
    l0 = float((delta.abs() > 1e-6).sum())

    return AttackOutcome(
        x_adv=x_adv,
        orig_pred=orig_pred, orig_conf=orig_conf,
        adv_pred=adv_pred, adv_conf=adv_conf,
        l2=l2, linf=linf, l0=l0,
        success=adv_pred != orig_pred,
    )
