# DORA DevOps Copilot — Production App

Agentic Flask application for DORA metrics analysis with tool orchestration, session management, and voice UX.

## Stack

| Layer | Technology |
|-------|------------|
| Backend | **Flask 3** + **Gunicorn** |
| Data | **pandas** (CSV parsing) |
| Agent | Python tool orchestrator (intent-specific responses) |
| Frontend | HTML/CSS/JS (served by Flask) |
| Voice | Browser Web Speech API |

Not Streamlit. Phase 1 RAG (separate repo) uses Flask + LangChain + Ollama.

## Run locally

```bash
cd apps/dora-copilot
chmod +x run.sh
./run.sh
```

Open http://127.0.0.1:5000

## Deploy to production (Render + GitHub)

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → **New Blueprint**
3. Connect your `portfolio` repository — Render reads `render.yaml` at repo root
4. Deploy — your app URL will be like `https://dora-devops-copilot.onrender.com`
5. Update `assets/apps-config.js` with your Render URL if the service name differs
6. Push again — portfolio pages link to the live app

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SECRET_KEY` | Yes (prod) | Flask session secret — auto-generated on Render |
| `FLASK_ENV` | Yes | `production` on Render, `development` locally |
| `CORS_ORIGIN` | Optional | Portfolio origin for CORS (default `*`) |
| `PORT` | Render sets | HTTP port |

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Copilot UI |
| `/api/health` | GET | Health check |
| `/api/upload` | POST | Upload CSV (multipart) |
| `/api/sample` | POST | Load sample metrics |
| `/api/agent` | POST | Run agent (`{"message": "..."}`) |
| `/api/reset` | POST | Clear session |

## Tests

```bash
cd apps/dora-copilot
pip install -r requirements.txt pytest
pytest tests/ -v
```

CI runs automatically via `.github/workflows/dora-copilot.yml`.
