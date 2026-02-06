.PHONY: help install run run-prod clean

PYTHON ?= python
HOST ?= 0.0.0.0
PORT ?= 8001

help:
	@echo "Targets:"
	@echo "  install   Install backend dependencies with uv"
	@echo "  run       Start FastAPI in reload mode"
	@echo "  run-prod  Start FastAPI without reload"
	@echo "  clean     Remove Python cache files"

install:
	uv sync

run:
	uv run uvicorn app.main:app --reload --host $(HOST) --port $(PORT)

run-prod:
	uv run uvicorn app.main:app --host $(HOST) --port $(PORT)

clean:
	find . -type d -name "__pycache__" -prune -exec rm -rf {} +
