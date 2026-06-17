# COAE-Forge backend — FastAPI + PyTorch (CPU). Build from the repo root:
#   docker build -f backend/Dockerfile -t coae-forge-backend .
FROM python:3.11-slim

# libgomp1 is needed by the PyTorch CPU runtime.
RUN apt-get update \
 && apt-get install -y --no-install-recommends libgomp1 curl \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install CPU-only torch/torchvision FIRST (from the PyTorch CPU index) so the
# pinned versions in requirements.txt resolve to the slim CPU wheels, not CUDA.
COPY backend/requirements.txt .
RUN pip install --no-cache-dir torch==2.4.0 torchvision==0.19.0 \
        --index-url https://download.pytorch.org/whl/cpu \
 && pip install --no-cache-dir -r requirements.txt

# App code + the small cached CNN weights (artifacts/*.pt). The big datasets
# (artifacts/data) are excluded by .dockerignore and downloaded into a volume.
COPY backend/ .

# Hugging Face cache (the LLM tab downloads Qwen here on first use) → volume.
ENV HF_HOME=/cache/huggingface \
    PYTHONUNBUFFERED=1

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1:8000/api/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
