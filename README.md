# COAE-Forge — AI Attack Playground

A hands-on, fully local playground for learning **offensive & defensive machine
learning**. Nine interactive tabs let you run real attacks (and their defenses)
against small models you train yourself, each with a beginner-friendly explainer.

A **FastAPI** backend (PyTorch + Opacus) exposes the attack endpoints; a **React**
frontend presents them. Everything runs on **CPU** and on your own machine.

> ##### ⚠️ Disclaimer — unofficial & independent
> This is an **independent, educational project**. It is **not affiliated with,
> endorsed by or sponsored by HackTheBox** or any certification body.
> "COAE" and "Certified Offensive AI Expert" are referenced only **nominatively** to
> describe the public topics this tool helps you study. It contains **no HTB course
> material, lab content, exam questions, or other proprietary content** —
> every attack is implemented from scratch from **publicly published research**
> (see [References](#attack-techniques--references)). All trademarks belong to their
> respective owners.

> ##### 🔐 Ethical use
> For **education and authorized security testing only.** Every attack runs locally
> against models you train yourself, on public datasets. Do not use these techniques
> against systems you do not own or are not explicitly authorized to test.

---

## Features

| # | Tab | Techniques | Topic area |
|---|-----|-----------|-----------|
| 1 | **Adversarial Examples** | FGSM, PGD, DeepFool, EAD, JSMA | evasion (white-box, first-order, sparse) |
| 2 | **Data Poisoning** | label flipping, clean-label (Poison Frogs) | training-time attacks |
| 3 | **Membership Inference** | Shokri shadow models | privacy |
| 4 | **Differential Privacy** | Opacus DP-SGD, ε/δ trade-off | privacy defense |
| 5 | **Adversarial Training** | FGSM/PGD hardening + robustness curve | evasion defense |
| 6 | **Model Extraction** | model stealing + black-box transfer evasion | black-box attacks |
| 7 | **Model Inversion** | class-prototype reconstruction | privacy / data leakage |
| 8 | **Supply Chain** | unsafe deserialization (pickle RCE) + the fix | ML supply chain |
| 9 | **LLM Attacks** | prompt injection, jailbreak, leakage, **indirect/RAG** | LLM / OWASP LLM01 |

**Learning aids.** Every dataset, attack, and variant has an **ⓘ info modal**
explaining — for an ML beginner — *what it is, how it works, and what it results in*.
The UI ships in **English** with a one-click **EN / PL** toggle; ML-specific terms are
deliberately kept in English. Locale strings live in `frontend/src/locale/`
(`ui.pl.js` for UI text, `explainers.js` for the modal content).

---

## Quick start

### Option A — Docker (recommended; no local Python/Node needed)

```bash
docker compose up --build      # build + start (add -d to detach)
```

Open **http://localhost:5173** · backend API docs at **http://localhost:8000/docs**.

```bash
docker compose down            # stop & remove (volumes are kept)
docker compose down -v         # also delete the dataset / model volumes
```

Two containers: `backend` (FastAPI + **CPU-only** PyTorch) and `frontend` (the built
SPA on nginx, proxying `/api` → backend). The small CNN weights are **baked into the
image**, so no training step is needed. Datasets (MNIST/CIFAR-10) download once into
the `data` volume and the LLM downloads into the `hf` volume — both persist, so only
the **first** use of a data- or LLM-driven tab needs internet.

### Option B — local dev servers

Requires a Python 3.11 env with the backend deps, and Node 20.

```bash
pip install -r backend/requirements.txt   # into your env (CPU torch)
make pretrain                              # train + cache the base CNNs (once)
make frontend-install                      # npm install

./coae.sh start     # backend :8000 + Vite frontend :5173 (background)
./coae.sh status    # what's running          ./coae.sh logs   # tail logs
./coae.sh stop      # stop both
```

(`make backend` / `make frontend` run them in the foreground instead.)

The LLM tab lazily downloads a small instruct model
(`Qwen/Qwen2.5-0.5B-Instruct`, Apache-2.0) on first use.

---

## Tech stack & design

- **Backend:** FastAPI, PyTorch **2.4 (CPU-only)**, Opacus (DP-SGD), 🤗 Transformers,
  scikit-learn. Attacks are implemented **from scratch** for readability — no attack
  libraries — in `backend/app/attacks/`.
- **Frontend:** Vite + React 18, plain CSS, no UI framework.
- **Models** are MNIST/CIFAR-10-scale by design so every attack stays interactive on a
  CPU. Images are kept in `[0,1]` pixel space with dataset normalization folded into
  the model's first layer, so attacks perturb raw pixels.
- **Tests:** `cd backend && pytest` (model-free where possible; the LLM is monkeypatched).

```
backend/   FastAPI app (app/attacks, app/core, app/routers, app/schemas), tests, Dockerfile
frontend/  Vite + React app (src/tabs/* — one per attack family), Dockerfile + nginx.conf
docker-compose.yml   two-service stack (backend + nginx frontend)
coae.sh              start/stop/status helper for the local dev servers
Makefile             pretrain / backend / frontend / test targets
```

---

## Attack techniques & references

Every technique here comes from **published, peer-reviewed research** and is
re-implemented independently. Key references:

- **FGSM** — Goodfellow et al., *Explaining and Harnessing Adversarial Examples*, 2015.
- **PGD** — Madry et al., *Towards Deep Learning Models Resistant to Adversarial
  Attacks*, 2018.
- **DeepFool** — Moosavi-Dezfooli et al., 2016.
- **EAD** — Chen et al., *Elastic-Net Attacks to DNNs*, 2018.
- **JSMA** — Papernot et al., *The Limitations of Deep Learning in Adversarial
  Settings*, 2016.
- **Clean-label poisoning** — Shafahi et al., *Poison Frogs!*, 2018.
- **Membership inference** — Shokri et al., 2017; Yeom et al., 2018.
- **Differential privacy (DP-SGD)** — Abadi et al., 2016 (via Opacus).
- **Model extraction / transfer** — Tramèr et al., 2016; Papernot et al., 2017.
- **Model inversion** — Fredrikson et al., 2015; feature-visualization priors after
  Olah et al., 2017.
- **Fast adversarial training** — Wong et al., *Fast is better than free*, 2020.
- **Prompt injection / insecure deserialization** — OWASP LLM Top 10 (LLM01) and the
  Python `pickle` documentation's security warning.

---

## Acknowledgements

- Datasets: **MNIST** (LeCun et al.) and **CIFAR-10** (Krizhevsky) via `torchvision`.
- LLM: **Qwen2.5-0.5B-Instruct** (Alibaba, Apache-2.0).
- Made with ❤️ by **Razz** for **rpwn**.

## License

Released under the **MIT License** (see `LICENSE`). The code is MIT; bundled datasets
and model weights remain under their own licenses (noted above).
