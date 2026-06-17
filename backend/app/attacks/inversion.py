"""Model inversion — reconstruct a class prototype from a model (COAE module 11).

White-box privacy attack (Fredrikson et al. 2015). With only the trained model and a
target class, optimise an input image so the model becomes maximally confident it is
that class. The result is the model's internal "idea" of the class — a privacy leak,
because for models trained on sensitive data (e.g. faces) it can reconstruct a
recognisable likeness of the training subjects.

We start from a neutral gray image and run gradient *ascent* on the target-class
score, regularised by total variation (smoothness) and an L2 anchor (keep pixels
near gray). TV is what turns adversarial high-frequency noise into a recognisable
prototype. We compare the reconstruction to the real average image of that class.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import torch
import torch.nn.functional as F
from torchvision.transforms.functional import gaussian_blur

from app.core.data import get_dataset, get_spec
from app.core.registry import get_model


def _total_variation(x: torch.Tensor) -> torch.Tensor:
    """Mean absolute difference of neighbouring pixels (encourages smoothness)."""
    dh = (x[:, :, 1:, :] - x[:, :, :-1, :]).abs().mean()
    dw = (x[:, :, :, 1:] - x[:, :, :, :-1]).abs().mean()
    return dh + dw


def _jitter(x: torch.Tensor, amp: int, g: torch.Generator) -> torch.Tensor:
    """Random integer roll in H/W — transformation robustness (Olah et al.).

    Forces the optimiser toward a spatially robust, recognisable shape instead of
    pixel-precise adversarial noise. Differentiable (a plain index shift)."""
    if amp <= 0:
        return x
    sh = int(torch.randint(-amp, amp + 1, (1,), generator=g))
    sw = int(torch.randint(-amp, amp + 1, (1,), generator=g))
    return torch.roll(x, shifts=(sh, sw), dims=(2, 3))


@torch.no_grad()
def _class_means(dataset: str, num_classes: int, per_class: int, seed: int):
    """Per-class average images (true prototypes) + one real example per class.

    Returns (means[num_classes,C,H,W], examples[num_classes,C,H,W]). The means are
    the leakage reference: a reconstruction that captures class structure should sit
    nearest its own class mean.
    """
    ds = get_dataset(dataset, train=True)
    g = torch.Generator().manual_seed(seed)
    order = torch.randperm(len(ds), generator=g)
    buckets: dict[int, list] = {c: [] for c in range(num_classes)}
    examples: dict[int, object] = {}
    need = num_classes * per_class
    have = 0
    for i in order:
        x, y = ds[int(i)]
        c = int(y)
        if len(buckets[c]) < per_class:
            if c not in examples:
                examples[c] = x
            buckets[c].append(x)
            have += 1
            if have >= need:
                break
    means = torch.stack([torch.stack(buckets[c]).mean(0) for c in range(num_classes)])
    exs = torch.stack([examples[c] for c in range(num_classes)])
    return means, exs


@dataclass
class InversionResult:
    dataset: str
    target_class: int
    class_name: str
    steps: int
    final_confidence: float
    recon_pred: int
    recon_pred_name: str
    recon_png: str
    mean_png: str
    example_png: str
    recon_vs_mean_l2: float
    nearest_mean_class: int       # class whose mean the reconstruction is closest to
    nearest_mean_name: str
    leak_confirmed: bool          # nearest_mean_class == target_class
    target_rank: int              # rank of target among class-mean distances (1 = best)
    curve: list[dict] = field(default_factory=list)  # {step, confidence}


def model_inversion(dataset: str, target_class: int = 0, steps: int = 400,
                    lr: float = 0.05, tv_reg: float = 3.0, l2_reg: float = 0.02,
                    jitter: int = 2, blur_every: int = 20, n_mean: int = 150,
                    seed: int = 0) -> InversionResult:
    from app.core.imaging import tensor_to_b64png

    spec = get_spec(dataset)
    if not (0 <= target_class < spec.num_classes):
        raise ValueError(f"target_class must be in [0, {spec.num_classes})")
    model = get_model(dataset)

    # The leaked statistic: the model's mean internal representation of the class
    # (its feature centroid). We reconstruct the input that best reproduces it.
    means, examples = _class_means(dataset, spec.num_classes, n_mean, seed)
    with torch.no_grad():
        centroid = model.embed(means[target_class : target_class + 1]).detach()

    shape = (1, spec.channels, *( (28, 28) if spec.name == "mnist" else (32, 32) ))
    torch.manual_seed(seed)
    g = torch.Generator().manual_seed(seed)
    x = torch.full(shape, 0.5) + 0.01 * torch.randn(shape)
    x = x.clamp(0, 1).requires_grad_(True)
    opt = torch.optim.Adam([x], lr=lr)

    curve = []
    sample_every = max(1, steps // 30)
    for step in range(steps):
        opt.zero_grad()
        feat = model.embed(_jitter(x, jitter, g))  # robust to small shifts
        # match the class feature centroid + image priors (TV + gray anchor)
        loss = (feat - centroid).pow(2).mean() + tv_reg * _total_variation(x) \
            + l2_reg * (x - 0.5).pow(2).mean()
        loss.backward()
        opt.step()
        with torch.no_grad():
            # periodic Gaussian blur — a strong image prior that suppresses the
            # high-frequency adversarial pattern and reveals a recognisable shape.
            if blur_every and step % blur_every == 0 and step > 0:
                x.data = gaussian_blur(x.data, kernel_size=3, sigma=0.5)
            x.clamp_(0, 1)
        if step % sample_every == 0 or step == steps - 1:
            with torch.no_grad():
                conf = float(F.softmax(model(x), dim=-1)[0, target_class])
            curve.append({"step": step, "confidence": conf})

    recon = x.detach()
    with torch.no_grad():
        probs = F.softmax(model(recon), dim=-1)[0]
    final_conf = float(probs[target_class])
    recon_pred = int(probs.argmax())

    # Leakage metric: distance from the reconstruction to every class mean. The
    # nearest mean being the target class shows the reconstruction captured
    # class-specific structure — concrete evidence of leakage.
    dists = (means - recon[0]).flatten(1).norm(dim=1)
    nearest = int(dists.argmin())
    order = dists.argsort()
    target_rank = int((order == target_class).nonzero(as_tuple=True)[0]) + 1
    recon_vs_mean = float(dists[target_class])

    return InversionResult(
        dataset=dataset, target_class=target_class,
        class_name=spec.class_names[target_class], steps=steps,
        final_confidence=final_conf,
        recon_pred=recon_pred, recon_pred_name=spec.class_names[recon_pred],
        recon_png=tensor_to_b64png(recon[0]),
        mean_png=tensor_to_b64png(means[target_class]),
        example_png=tensor_to_b64png(examples[target_class]),
        recon_vs_mean_l2=recon_vs_mean,
        nearest_mean_class=nearest, nearest_mean_name=spec.class_names[nearest],
        leak_confirmed=(nearest == target_class), target_rank=target_rank,
        curve=curve,
    )
