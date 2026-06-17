"""Data-poisoning attacks.

To stay interactive on CPU we use the pretrained CNN as a **frozen feature
extractor** and train only a small linear head on top. Poisoning the labels (or
injecting crafted clean-label poisons) corrupts that head, which is fast to
retrain — so the attack's effect on accuracy / a target prediction is visible in
seconds. This mirrors transfer-learning poisoning, a realistic threat model.

Implemented:
  - label_flip_experiment : random or targeted label flipping vs a clean baseline
  - clean_label_attack    : Poison Frogs feature-collision (Shafahi et al. 2018)
"""

from __future__ import annotations

from dataclasses import dataclass, field
from functools import lru_cache

import torch
import torch.nn.functional as F

from app.core.data import get_dataset, get_spec
from app.core.registry import get_model

_FEAT_BATCH = 512


# --------------------------------------------------------------------------- #
# Feature extraction + linear head
# --------------------------------------------------------------------------- #
@torch.no_grad()
def _embed_batched(model, images: torch.Tensor) -> torch.Tensor:
    feats = [model.embed(images[i : i + _FEAT_BATCH]) for i in range(0, len(images), _FEAT_BATCH)]
    return torch.cat(feats, dim=0)


def _subset_indices(n_available: int, n: int, seed: int) -> torch.Tensor:
    g = torch.Generator().manual_seed(seed)
    return torch.randperm(n_available, generator=g)[: min(n, n_available)]


@lru_cache(maxsize=8)
def _features(dataset: str, split: str, n: int, seed: int):
    """Cached (features, labels, indices) for a random subset of a split."""
    model = get_model(dataset)
    ds = get_dataset(dataset, train=(split == "train"))
    idx = _subset_indices(len(ds), n, seed)
    images = torch.stack([ds[int(i)][0] for i in idx])
    labels = torch.tensor([int(ds[int(i)][1]) for i in idx])
    return _embed_batched(model, images), labels, idx


def _images_for(dataset: str, split: str, indices: list[int]) -> torch.Tensor:
    ds = get_dataset(dataset, train=(split == "train"))
    return torch.stack([ds[int(i)][0] for i in indices])


def train_head(feats: torch.Tensor, labels: torch.Tensor, num_classes: int,
               epochs: int = 150, lr: float = 0.05, weight_decay: float = 1e-4) -> torch.nn.Linear:
    """Train a linear classifier on frozen features (full-batch Adam)."""
    head = torch.nn.Linear(feats.shape[1], num_classes)
    opt = torch.optim.Adam(head.parameters(), lr=lr, weight_decay=weight_decay)
    for _ in range(epochs):
        opt.zero_grad()
        F.cross_entropy(head(feats), labels).backward()
        opt.step()
    head.eval()
    return head


@torch.no_grad()
def _accuracy(head, feats, labels) -> float:
    return (head(feats).argmax(1) == labels).float().mean().item()


@torch.no_grad()
def _per_class_acc(head, feats, labels, num_classes: int) -> list[float]:
    pred = head(feats).argmax(1)
    out = []
    for c in range(num_classes):
        mask = labels == c
        out.append(float((pred[mask] == c).float().mean()) if mask.any() else 0.0)
    return out


# --------------------------------------------------------------------------- #
# Label flipping
# --------------------------------------------------------------------------- #
def _flip_labels(labels: torch.Tensor, rate: float, mode: str, source: int,
                 target: int, num_classes: int, seed: int):
    y = labels.clone()
    g = torch.Generator().manual_seed(seed + 1)

    if mode == "targeted":
        pool = (y == source).nonzero(as_tuple=True)[0]
        k = int(len(pool) * rate)
        chosen = pool[torch.randperm(len(pool), generator=g)[:k]]
        y[chosen] = target
    else:  # random: flip to a uniformly-random *different* class
        k = int(len(y) * rate)
        chosen = torch.randperm(len(y), generator=g)[:k]
        rand = torch.randint(0, num_classes - 1, (k,), generator=g)
        # map into the set of labels != original, avoiding the true label
        rand = rand + (rand >= y[chosen]).long()
        y[chosen] = rand
    return y, chosen.tolist()


@dataclass
class LabelFlipResult:
    clean_acc: float
    poisoned_acc: float
    acc_drop: float
    num_flipped: int
    num_train: int
    per_class_clean: list[float]
    per_class_poisoned: list[float]
    samples: list[dict] = field(default_factory=list)  # flipped examples
    # targeted-only extras (None for random mode)
    source_recall_clean: float | None = None
    source_recall_poisoned: float | None = None


def label_flip_experiment(dataset: str, rate: float = 0.2, mode: str = "random",
                          source: int = 0, target: int = 1, n_train: int = 4000,
                          n_test: int = 2000, seed: int = 0) -> LabelFlipResult:
    spec = get_spec(dataset)
    nc = spec.num_classes
    if mode == "targeted" and source == target:
        raise ValueError("targeted flip requires source != target class")

    f_tr, y_tr, idx_tr = _features(dataset, "train", n_train, seed)
    f_te, y_te, _ = _features(dataset, "test", n_test, seed)

    clean_head = train_head(f_tr, y_tr, nc)
    clean_acc = _accuracy(clean_head, f_te, y_te)

    y_pois, flipped = _flip_labels(y_tr, rate, mode, source, target, nc, seed)
    pois_head = train_head(f_tr, y_pois, nc)
    pois_acc = _accuracy(pois_head, f_te, y_te)

    pc_clean = _per_class_acc(clean_head, f_te, y_te, nc)
    pc_pois = _per_class_acc(pois_head, f_te, y_te, nc)

    # A few flipped examples to display (image, true label, poisoned label).
    sample_local = flipped[:6]
    sample_imgs = _images_for(dataset, "train", [int(idx_tr[i]) for i in sample_local]) if sample_local else None
    samples = []
    from app.core.imaging import tensor_to_b64png  # local import avoids cycle at import time
    for j, loc in enumerate(sample_local):
        samples.append({
            "image_png": tensor_to_b64png(sample_imgs[j]),
            "true_label": int(y_tr[loc]),
            "true_name": spec.class_names[int(y_tr[loc])],
            "flipped_label": int(y_pois[loc]),
            "flipped_name": spec.class_names[int(y_pois[loc])],
        })

    res = LabelFlipResult(
        clean_acc=clean_acc, poisoned_acc=pois_acc, acc_drop=clean_acc - pois_acc,
        num_flipped=len(flipped), num_train=len(y_tr),
        per_class_clean=pc_clean, per_class_poisoned=pc_pois, samples=samples,
    )
    if mode == "targeted":
        res.source_recall_clean = pc_clean[source]
        res.source_recall_poisoned = pc_pois[source]
    return res


# --------------------------------------------------------------------------- #
# Clean-label feature-collision (Poison Frogs)
# --------------------------------------------------------------------------- #
@dataclass
class CleanLabelResult:
    target_index: int
    target_class: int
    target_name: str
    base_class: int
    base_name: str
    pred_before: int
    pred_before_name: str
    pred_after: int
    pred_after_name: str
    success: bool
    num_poisons: int
    feat_dist_before: float  # ||f(base)   - f(target)||
    feat_dist_after: float   # ||f(poison) - f(target)|| (mean)
    target_png: str
    base_png: str
    poison_pngs: list[str] = field(default_factory=list)


def clean_label_attack(dataset: str, target_index: int = 0, base_class: int = 0,
                       num_poisons: int = 1, beta: float = 0.1, steps: int = 200,
                       lr: float = 0.02, n_train: int = 4000, seed: int = 0) -> CleanLabelResult:
    from app.core.imaging import tensor_to_b64png

    model = get_model(dataset)
    spec = get_spec(dataset)

    test = get_dataset(dataset, train=False)
    x_t, target_class = test[target_index % len(test)]
    if base_class == target_class:
        raise ValueError("base class must differ from the target's class")
    target_feat = model.embed(x_t.unsqueeze(0)).detach()  # (1, d)

    # Clean head + the target's clean prediction.
    f_tr, y_tr, _ = _features(dataset, "train", n_train, seed)
    clean_head = train_head(f_tr, y_tr, spec.num_classes)
    pred_before = int(clean_head(target_feat).argmax(1))

    # Pick base images (correctly-labeled base_class) to morph into poisons.
    train = get_dataset(dataset, train=True)
    base_idx = [i for i in range(len(train)) if int(train[i][1]) == base_class][: max(1, num_poisons)]
    base_imgs = torch.stack([train[i][0] for i in base_idx])
    feat_dist_before = float((model.embed(base_imgs[:1]) - target_feat).norm())

    # Craft each poison: collide features with target, stay visually near base.
    poisons = []
    for base in base_imgs:
        p = base.clone().detach().requires_grad_(True)
        opt = torch.optim.Adam([p], lr=lr)
        for _ in range(steps):
            opt.zero_grad()
            fp = model.embed(p.unsqueeze(0))
            loss = (fp - target_feat).pow(2).sum() + beta * (p - base).pow(2).sum()
            loss.backward()
            opt.step()
            with torch.no_grad():
                p.clamp_(0, 1)
        poisons.append(p.detach())
    poison_batch = torch.stack(poisons)

    poison_feats = model.embed(poison_batch).detach()
    feat_dist_after = float((poison_feats - target_feat).norm(dim=1).mean())

    # Inject poisons with their (correct-looking) base label, retrain head.
    f_pois = torch.cat([f_tr, poison_feats], dim=0)
    y_pois = torch.cat([y_tr, torch.full((len(poisons),), base_class)], dim=0)
    pois_head = train_head(f_pois, y_pois, spec.num_classes)
    pred_after = int(pois_head(target_feat).argmax(1))

    return CleanLabelResult(
        target_index=target_index, target_class=int(target_class),
        target_name=spec.class_names[int(target_class)],
        base_class=base_class, base_name=spec.class_names[base_class],
        pred_before=pred_before, pred_before_name=spec.class_names[pred_before],
        pred_after=pred_after, pred_after_name=spec.class_names[pred_after],
        success=(pred_after == base_class and pred_before != base_class),
        num_poisons=len(poisons),
        feat_dist_before=feat_dist_before, feat_dist_after=feat_dist_after,
        target_png=tensor_to_b64png(x_t), base_png=tensor_to_b64png(base_imgs[0]),
        poison_pngs=[tensor_to_b64png(p) for p in poisons],
    )
