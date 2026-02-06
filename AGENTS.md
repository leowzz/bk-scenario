# Repository Guidelines

## Project Structure & Module Organization
This repository is split into a FastAPI backend and a React/Vite frontend.

- `backend/app/`: FastAPI service (routers in `main.py`, data models in `models.py`, SQLAlchemy schema in `schema.py`, execution logic in `engine.py`).
- `backend/db/`: SQLite schema and data files (`data.sqlite`, `*.sql`).
- `frontend/`: Vite + React UI (`src/` for components, `index.html` entry point).
- Root `Makefile`: convenience commands for running both sides.

## Build, Test, and Development Commands
Use the Makefiles for consistent workflows:

- `make install`: installs backend + frontend dependencies.
- `make dev`: runs backend and frontend dev servers in parallel.
- `make dev-backend`: runs FastAPI with reload (port 8001).
- `make dev-frontend`: runs Vite dev server.
- `make build-frontend`: builds production assets.

Direct equivalents:
- Backend: `uv sync`, `uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8001`
- Frontend: `npm install`, `npm run dev`, `npm run build`

## Coding Style & Naming Conventions
- Python: follow PEP 8, 4-space indentation. Keep FastAPI handlers small and delegate logic to `storage.py`/`engine.py`.
- JavaScript/React: 2-space indentation is the existing style. Prefer named helpers (e.g., `toFlowNodes`) over inline logic.
- No formatter or linter is configured yet; keep edits consistent with surrounding code.

## Testing Guidelines
There is no automated test suite in this repo. If you add tests, keep them close to the area of change and document how to run them (e.g., `pytest` for backend, `vitest` for frontend).

## Commit & Pull Request Guidelines
The Git history does not show a strict commit convention. Use short, imperative messages (e.g., “Add rule execution view”). For PRs, include:
- A brief summary of changes
- How to test (commands or steps)
- Screenshots for UI changes

## Configuration Notes
- Backend uses SQLite at `backend/db/data.sqlite`.
- API base path is `/api` in the frontend (`frontend/src/App.jsx`).
