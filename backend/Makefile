.PHONY: help install run run-prod db-upgrade db-downgrade db-revision clean

PYTHON ?= python
HOST ?= 0.0.0.0
PORT ?= 8001

help:
	@echo "Targets:"
	@echo "  install   Install backend dependencies with uv"
	@echo "  run       Start FastAPI in reload mode"
	@echo "  run-prod  Start FastAPI without reload"
	@echo "  db-upgrade  Apply Alembic migrations to head"
	@echo "  db-downgrade  Roll back one Alembic revision"
	@echo "  db-revision  Create Alembic revision (set MSG='...')"
	@echo "  clean     Remove Python cache files"

install:
	uv sync

run:
	uv run uvicorn app.main:app --reload --host $(HOST) --port $(PORT)

run-prod:
	uv run uvicorn app.main:app --host $(HOST) --port $(PORT)

db-upgrade:
	uv run alembic upgrade head

db-downgrade:
	uv run alembic downgrade -1

db-revision:
	uv run alembic revision --autogenerate -m "$(MSG)"

clean:
	find . -type d -name "__pycache__" -prune -exec rm -rf {} +
