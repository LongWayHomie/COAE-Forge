"""Supply-Chain tab — unsafe model deserialization (pickle RCE) demo, module 6.

Educational, fully local and self-contained: the malicious payload only records
proof-of-execution; nothing harmful runs.
"""

from __future__ import annotations

from dataclasses import asdict

from fastapi import APIRouter, HTTPException

from app.attacks.supply_chain import deserialization_demo
from app.schemas.supply_chain import DeserializationResponse

router = APIRouter(prefix="/supply-chain", tags=["supply_chain"])


@router.get("/info")
def info() -> dict:
    return {
        "tab": "supply_chain",
        "status": "ready",
        "technique": "unsafe_deserialization_rce",
        "note": "Crafts a pickle-based checkpoint whose __reduce__ runs code on "
                "torch.load(weights_only=False), then shows weights_only=True blocking it. "
                "The payload is benign (records proof of execution only).",
    }


@router.post("/run", response_model=DeserializationResponse)
def run() -> DeserializationResponse:
    try:
        r = deserialization_demo()
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Demo failed: {e}")
    return DeserializationResponse(**asdict(r))
