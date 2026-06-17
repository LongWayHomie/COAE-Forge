"""Lazy, in-process cache of pretrained classifiers.

Weights are produced by `scripts/pretrain.py` and saved to
`artifacts/<dataset>_cnn.pt`. The first request for a dataset loads and caches the
model; subsequent requests reuse it.
"""

from __future__ import annotations

import torch

from app.config import settings
from app.core.data import get_spec
from app.core.models import build_model

_CACHE: dict[str, torch.nn.Module] = {}


class WeightsNotFound(RuntimeError):
    """Raised when a dataset has no cached weights yet."""


def get_model(dataset: str) -> torch.nn.Module:
    """Return a cached, eval-mode model for `dataset`, loading weights if needed."""
    get_spec(dataset)  # validates dataset name early
    if dataset in _CACHE:
        return _CACHE[dataset]

    path = settings.weights_path(dataset)
    if not path.exists():
        raise WeightsNotFound(
            f"No trained weights at {path}. Run `make pretrain` "
            f"(or `python -m scripts.pretrain --dataset {dataset}`) first."
        )

    model = build_model(dataset)
    state = torch.load(path, map_location=settings.device, weights_only=True)
    model.load_state_dict(state)
    model.to(settings.device).eval()
    _CACHE[dataset] = model
    return model


def clear_cache() -> None:
    _CACHE.clear()
