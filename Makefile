# COAE-Forge — dev tasks
# Assumes the `ai` conda env is active (Python 3.11, torch/opacus/transformers).

PY ?= python
BACKEND_DIR := backend
FRONTEND_DIR := frontend

.PHONY: help install pretrain backend frontend frontend-install test clean

help:
	@echo "make install           - install backend python deps into current env"
	@echo "make pretrain          - train + cache MNIST/CIFAR-10 CNNs (run once)"
	@echo "make backend           - run FastAPI (uvicorn) on :8000"
	@echo "make frontend-install  - npm install in frontend/"
	@echo "make frontend          - run Vite dev server on :5173"
	@echo "make test              - run backend pytest"

install:
	pip install -r $(BACKEND_DIR)/requirements.txt

pretrain:
	cd $(BACKEND_DIR) && $(PY) -m scripts.pretrain

backend:
	cd $(BACKEND_DIR) && uvicorn app.main:app --reload --port 8000

frontend-install:
	cd $(FRONTEND_DIR) && npm install

frontend:
	cd $(FRONTEND_DIR) && npm run dev

test:
	cd $(BACKEND_DIR) && pytest -q

clean:
	find . -type d -name __pycache__ -prune -exec rm -rf {} +
	rm -rf $(BACKEND_DIR)/.pytest_cache
