"""Convert tensors to base64-encoded PNG data URIs for the frontend."""

from __future__ import annotations

import base64
import io

import torch
from PIL import Image


def _to_pil(img: torch.Tensor) -> Image.Image:
    """(C, H, W) float in [0, 1] -> PIL Image (L for 1 channel, RGB for 3)."""
    img = img.detach().cpu().clamp(0, 1)
    arr = (img * 255).round().to(torch.uint8)
    if arr.shape[0] == 1:
        return Image.fromarray(arr.squeeze(0).numpy(), mode="L")
    return Image.fromarray(arr.permute(1, 2, 0).numpy(), mode="RGB")


def _encode(pil: Image.Image, upscale: int) -> str:
    if upscale > 1:
        pil = pil.resize((pil.width * upscale, pil.height * upscale), Image.NEAREST)
    buf = io.BytesIO()
    pil.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    return f"data:image/png;base64,{b64}"


def tensor_to_b64png(img: torch.Tensor, upscale: int = 6) -> str:
    """Encode a [0, 1] image tensor as a PNG data URI (nearest-neighbor upscaled)."""
    return _encode(_to_pil(img), upscale)


def perturbation_to_b64png(delta: torch.Tensor, upscale: int = 6) -> str:
    """Visualize a perturbation (adv - orig): rescale to [0, 1] around 0.5 gray.

    Each channel is independently normalized by its max abs value so faint
    perturbations remain visible.
    """
    d = delta.detach().cpu()
    max_abs = d.abs().amax(dim=(1, 2), keepdim=True).clamp(min=1e-12)
    vis = (d / max_abs) * 0.5 + 0.5
    return _encode(_to_pil(vis), upscale)
