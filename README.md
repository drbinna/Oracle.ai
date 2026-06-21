# Autonomous Quant Analyst-Trader

This repository is currently frontend-only.

- `frontend/` contains the operator-facing web app and demo dashboard.
- `dependacry.md` tracks the intended dependency boundaries so the setup stays predictable.

The product concept is still the same: an autonomous quant firm interface for presenting agent activity, rubric status, and evaluation progress. For now, this repo only contains the UI layer.

## Architecture

```text
Oracle.ai/
|- frontend/       # React + Vite dashboard
|- dependacry.md   # dependency guardrails
`- README.md
```

## Frontend

The frontend is a lightweight React dashboard that can be used for:

- showing the active agent org
- viewing task and rubric status
- displaying held-out evaluation results
- presenting the demo cleanly

Run it with:

```bash
cd frontend
npm install
npm run dev
```

## Notes

- No backend code is kept in this repository right now.
- If backend work is needed later, it should be added intentionally in a separate pass.
- Use `dependacry.md` before adding packages or changing tooling.
