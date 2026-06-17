"""Application configuration (pydantic-settings).

All paths default relative to the backend/ directory so the app works regardless
of where uvicorn is launched from, as long as cwd is backend/ (see Makefile).
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/app/config.py -> backend/
BACKEND_ROOT = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="COAE_", env_file=".env", extra="ignore")

    # Compute. torch is CPU-only in this env; kept configurable for portability.
    device: str = "cpu"

    # Where datasets and trained weights live.
    artifacts_dir: Path = BACKEND_ROOT / "artifacts"

    # CORS: the Vite dev server origin.
    frontend_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    # LLM Attacks tab: small instruct model, downloaded lazily on first use.
    # Qwen2.5 is ungated (unlike Gemma/Llama) and follows system prompts well.
    # 0.5B + float32 is the sweet spot on this CPU box: ~5 tok/s and ~3.3GB RSS.
    # (1.5B in bfloat16 fits in RAM but runs at ~0.2 tok/s — unusable; 1.5B fp32 OOMs.)
    llm_model_id: str = "Qwen/Qwen2.5-0.5B-Instruct"
    llm_dtype: str = "float32"
    llm_max_new_tokens: int = 128

    @property
    def data_dir(self) -> Path:
        return self.artifacts_dir / "data"

    def weights_path(self, dataset: str) -> Path:
        """Path to cached weights for a dataset, e.g. artifacts/mnist_cnn.pt."""
        return self.artifacts_dir / f"{dataset}_cnn.pt"


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.artifacts_dir.mkdir(parents=True, exist_ok=True)
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    return settings


settings = get_settings()
