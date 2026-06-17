"""Dataset specs and loaders for MNIST and CIFAR-10.

Images are kept in **[0, 1] pixel space** throughout (ToTensor only). Per-dataset
normalization is folded into the model (see core/models.py), so adversarial attacks
can operate directly on pixel values and epsilons are intuitive.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import torch
from torchvision import datasets, transforms

from app.config import settings


@dataclass(frozen=True)
class DatasetSpec:
    name: str
    channels: int
    image_size: int
    num_classes: int
    mean: tuple[float, ...]
    std: tuple[float, ...]
    class_names: list[str] = field(default_factory=list)


MNIST_SPEC = DatasetSpec(
    name="mnist",
    channels=1,
    image_size=28,
    num_classes=10,
    mean=(0.1307,),
    std=(0.3081,),
    class_names=[str(i) for i in range(10)],
)

CIFAR10_SPEC = DatasetSpec(
    name="cifar10",
    channels=3,
    image_size=32,
    num_classes=10,
    mean=(0.4914, 0.4822, 0.4465),
    std=(0.2470, 0.2435, 0.2616),
    class_names=[
        "airplane", "automobile", "bird", "cat", "deer",
        "dog", "frog", "horse", "ship", "truck",
    ],
)

DATASETS: dict[str, DatasetSpec] = {
    MNIST_SPEC.name: MNIST_SPEC,
    CIFAR10_SPEC.name: CIFAR10_SPEC,
}


def get_spec(dataset: str) -> DatasetSpec:
    try:
        return DATASETS[dataset]
    except KeyError:
        raise ValueError(f"Unknown dataset {dataset!r}; choose from {list(DATASETS)}")


def _build(dataset: str, train: bool):
    spec = get_spec(dataset)
    tf = transforms.ToTensor()  # -> [0, 1], shape (C, H, W)
    root = str(settings.data_dir)
    if spec.name == "mnist":
        return datasets.MNIST(root, train=train, download=True, transform=tf)
    return datasets.CIFAR10(root, train=train, download=True, transform=tf)


def get_dataset(dataset: str, train: bool = False):
    """Return a torchvision dataset yielding (image[0,1], label)."""
    return _build(dataset, train)


def get_sample(dataset: str, index: int) -> tuple[torch.Tensor, int]:
    """Return a single (image, label) from the test split.

    Image is a float tensor of shape (C, H, W) in [0, 1].
    """
    ds = get_dataset(dataset, train=False)
    index = index % len(ds)
    image, label = ds[index]
    return image, int(label)
