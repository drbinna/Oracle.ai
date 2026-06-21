# Autonomous Quant Analyst-Trader

This repository is now split into two clear parts:

- `frontend/` contains the operator-facing web app and demo dashboard.
- `backend/` contains the API, HUD environment scaffolding, and rubric/training service layout.

The original concept from the README is still the same: build an autonomous quant firm that analyzes SEC filings, scores itself with a filing-grounded rubric, and improves through RL. The difference is that the project is now organized so the product UI and the training/runtime system can evolve independently.

## Architecture

```text
Oracle.ai/
|- frontend/   # React + Vite dashboard for the agent firm
|- backend/    # FastAPI service + HUD environment scaffolding
`- README.md
```

## Frontend

The frontend is a lightweight React dashboard that can be used for:

- showing the active agent org
- viewing task/rubric status
- displaying held-out evaluation results
- presenting the hackathon demo cleanly

Run it with:

```bash
cd frontend
npm install
npm run dev
```

## Backend

The backend is a FastAPI service that exposes:

- health and metadata endpoints
- task and rubric summaries for the UI
- a starting place for HUD environment integration

Run it with:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Suggested Responsibility Split

### Frontend

- dashboard UX
- model comparison views
- filing analysis display
- reward curve visualization

### Backend

- SEC filing ingestion
- rubric generation and grading
- agent orchestration
- training and held-out evaluation

## Original System Intent

The system design remains aligned with the original concept:

1. Pull and parse SEC filings.
2. Compute verifiable metrics from the filing.
3. Attribute business drivers using MD&A-grounded evidence.
4. Score responses with a weighted rubric.
5. Train on high-quality trajectories and verify transfer on held-out tasks.

## Next Build Steps

- connect backend endpoints to real EDGAR/XBRL data
- wire the frontend to live API responses
- implement the hidden rubric grader on the backend
- add training/eval pipelines under the backend package
