# dependacry

This file exists to keep the project dependencies and structure from drifting.

## Current scope

- This repo is frontend-only.
- Do not add backend code, Python services, or server-side packages here unless that is explicitly requested.

## Approved frontend stack

- `react`
- `react-dom`
- `vite`
- `typescript`
- `@vitejs/plugin-react`
- `@types/react`
- `@types/react-dom`

## Guardrails

- Prefer keeping dependencies minimal.
- Before adding a new package, check whether the feature can be done with the existing stack.
- If a new dependency is necessary, document why it is needed in this file.
- Keep UI code inside `frontend/`.
- Avoid mixing backend scaffolding into this repository structure.

## If dependencies change

Add a short note with:

- package name
- why it was added
- whether it is runtime or dev-only
- which file or feature needed it
