"""Train and cache the base CNN classifiers.

Usage (from backend/):
    python -m scripts.pretrain                 # both datasets, default epochs
    python -m scripts.pretrain --dataset mnist --epochs 2

Weights are written to artifacts/<dataset>_cnn.pt. CPU-friendly defaults.
"""

from __future__ import annotations

import argparse
import time

import torch
import torch.nn.functional as F
from torch.utils.data import DataLoader

from app.config import settings
from app.core.data import DATASETS, get_dataset, get_spec
from app.core.models import build_model

DEFAULT_EPOCHS = {"mnist": 2, "cifar10": 8}


def _loader(dataset: str, train: bool, batch_size: int) -> DataLoader:
    ds = get_dataset(dataset, train=train)
    return DataLoader(ds, batch_size=batch_size, shuffle=train, num_workers=2)


@torch.no_grad()
def evaluate(model: torch.nn.Module, loader: DataLoader, device: str) -> float:
    model.eval()
    correct = total = 0
    for x, y in loader:
        x, y = x.to(device), y.to(device)
        pred = model(x).argmax(dim=1)
        correct += int((pred == y).sum())
        total += y.numel()
    return correct / total


def train_one(dataset: str, epochs: int, batch_size: int, lr: float) -> None:
    device = settings.device
    spec = get_spec(dataset)
    print(f"\n=== Training {spec.name} ({epochs} epochs, device={device}) ===")

    model = build_model(dataset).to(device)
    train_loader = _loader(dataset, train=True, batch_size=batch_size)
    test_loader = _loader(dataset, train=False, batch_size=256)
    opt = torch.optim.Adam(model.parameters(), lr=lr)

    for epoch in range(1, epochs + 1):
        model.train()
        t0 = time.time()
        running = 0.0
        for i, (x, y) in enumerate(train_loader, 1):
            x, y = x.to(device), y.to(device)
            opt.zero_grad()
            loss = F.cross_entropy(model(x), y)
            loss.backward()
            opt.step()
            running += loss.item()
            if i % 100 == 0:
                print(f"  epoch {epoch} step {i}/{len(train_loader)} "
                      f"loss={running / i:.4f}")
        acc = evaluate(model, test_loader, device)
        print(f"  epoch {epoch} done in {time.time() - t0:.1f}s  test_acc={acc:.4f}")

    path = settings.weights_path(dataset)
    torch.save(model.state_dict(), path)
    print(f"  saved -> {path}")


def main() -> None:
    p = argparse.ArgumentParser(description="Pretrain COAE-Forge classifiers")
    p.add_argument("--dataset", choices=list(DATASETS) + ["all"], default="all")
    p.add_argument("--epochs", type=int, default=None, help="override per-dataset default")
    p.add_argument("--batch-size", type=int, default=128)
    p.add_argument("--lr", type=float, default=1e-3)
    args = p.parse_args()

    targets = list(DATASETS) if args.dataset == "all" else [args.dataset]
    for ds in targets:
        epochs = args.epochs if args.epochs is not None else DEFAULT_EPOCHS[ds]
        train_one(ds, epochs, args.batch_size, args.lr)


if __name__ == "__main__":
    main()
