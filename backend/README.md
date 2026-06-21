# Backend

This backend is the runtime and training side of Oracle.ai.

## Purpose

- expose API data for the frontend
- host the HUD environment scaffolding
- keep rubric generation, grading, and training logic server-side

## Run

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Initial endpoints

- `GET /health`
- `GET /api/overview`
- `GET /api/agents`
- `GET /api/metrics`
- `GET /api/checkpoints`
- `GET /api/environment`

## Recommended next steps

- implement EDGAR/XBRL ingestion
- add rubric generation and hidden grading
- add task execution and training jobs
