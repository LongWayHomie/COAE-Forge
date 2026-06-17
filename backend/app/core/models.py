"""Small CNN classifiers for MNIST and CIFAR-10.

Models accept images in **[0, 1] pixel space** and apply dataset normalization as
their first layer. This lets adversarial attacks perturb raw pixels (clamp to
[0, 1]) while the network still sees normalized inputs.
"""

from __future__ import annotations

import torch
import torch.nn as nn

from app.core.data import DatasetSpec, get_spec


class Normalize(nn.Module):
    """Per-channel (x - mean) / std, applied inside the model graph."""

    def __init__(self, mean: tuple[float, ...], std: tuple[float, ...]):
        super().__init__()
        self.register_buffer("mean", torch.tensor(mean).view(1, -1, 1, 1))
        self.register_buffer("std", torch.tensor(std).view(1, -1, 1, 1))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return (x - self.mean) / self.std


class MnistCNN(nn.Module):
    """2 conv + 2 fc, ~28x28 grayscale."""

    def __init__(self, spec: DatasetSpec):
        super().__init__()
        self.norm = Normalize(spec.mean, spec.std)
        self.features = nn.Sequential(
            nn.Conv2d(spec.channels, 32, 3, padding=1), nn.ReLU(),
            nn.Conv2d(32, 64, 3, padding=1), nn.ReLU(),
            nn.MaxPool2d(2),  # 28 -> 14
        )
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Dropout(0.25),
            nn.Linear(64 * 14 * 14, 128), nn.ReLU(),
            nn.Dropout(0.5),
            nn.Linear(128, spec.num_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.classifier(self.features(self.norm(x)))

    def embed(self, x: torch.Tensor) -> torch.Tensor:
        return _embed(self, x)

    @property
    def feature_dim(self) -> int:
        return self.classifier[-1].in_features


class CifarCNN(nn.Module):
    """3 conv blocks + 2 fc, ~32x32 RGB."""

    def __init__(self, spec: DatasetSpec):
        super().__init__()
        self.norm = Normalize(spec.mean, spec.std)
        self.features = nn.Sequential(
            nn.Conv2d(spec.channels, 32, 3, padding=1), nn.ReLU(),
            nn.Conv2d(32, 32, 3, padding=1), nn.ReLU(),
            nn.MaxPool2d(2),  # 32 -> 16
            nn.Conv2d(32, 64, 3, padding=1), nn.ReLU(),
            nn.MaxPool2d(2),  # 16 -> 8
            nn.Conv2d(64, 128, 3, padding=1), nn.ReLU(),
            nn.MaxPool2d(2),  # 8 -> 4
        )
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Dropout(0.25),
            nn.Linear(128 * 4 * 4, 256), nn.ReLU(),
            nn.Dropout(0.5),
            nn.Linear(256, spec.num_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.classifier(self.features(self.norm(x)))

    def embed(self, x: torch.Tensor) -> torch.Tensor:
        return _embed(self, x)

    @property
    def feature_dim(self) -> int:
        return self.classifier[-1].in_features


def _embed(model: nn.Module, x: torch.Tensor) -> torch.Tensor:
    """Penultimate features: everything except the final Linear classifier layer.

    Returns the post-ReLU representation (128-d for MNIST, 256-d for CIFAR-10)
    used by the data-poisoning attacks as a frozen feature space.
    """
    x = model.features(model.norm(x))
    for layer in list(model.classifier)[:-1]:
        x = layer(x)
    return x


def build_model(dataset: str) -> nn.Module:
    """Construct the (untrained) classifier appropriate for a dataset."""
    spec = get_spec(dataset)
    if spec.name == "mnist":
        return MnistCNN(spec)
    return CifarCNN(spec)
