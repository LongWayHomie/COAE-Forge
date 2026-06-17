"""Tests for the unsafe-deserialization (pickle RCE) demo.

Self-contained: no pretrained weights needed. Verifies the unsafe load executes the
hidden payload and that weights_only=True blocks the very same file.
"""

from __future__ import annotations

import os

from app.attacks.supply_chain import deserialization_demo


def test_unsafe_load_executes_payload():
    r = deserialization_demo()
    assert r.executed is True
    assert r.evidence is not None
    # the payload proved code execution by recording process/identity info
    assert {"user", "pid", "host", "token"} <= set(r.evidence)
    assert r.evidence["token"] == r.token


def test_safe_load_blocks_the_same_file():
    r = deserialization_demo()
    assert r.safe_blocked is True
    assert r.safe_error and ("weights_only" in r.safe_error.lower()
                             or "unsupported global" in r.safe_error.lower())


def test_checkpoint_looks_normal_and_marker_cleaned_up():
    r = deserialization_demo()
    # the malicious object hides among ordinary-looking checkpoint keys
    assert "state_dict" in r.checkpoint_keys and "_metadata" in r.checkpoint_keys
    assert r.file_size > 0
    # the demo cleans up its marker file afterwards
    assert not os.path.exists(r.marker_path)
    assert r.takeaways
