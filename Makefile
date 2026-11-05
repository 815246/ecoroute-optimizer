# EcoRoute Optimizer — Makefile
SHELL := /bin/bash

# Use local venv if available, otherwise fallback to python3
VENV_BIN := $(shell if [ -f .venv/bin/python3 ]; then echo ".venv/bin"; elif [ -f backend/.venv/bin/python3 ]; then echo "backend/.venv/bin"; else echo ""; fi)
PYTHON   := $(if $(VENV_BIN),$(VENV_BIN)/python3,python3)
PYTEST   := $(if $(VENV_BIN),$(VENV_BIN)/pytest,pytest)
RUFF     := $(if $(VENV_BIN),$(VENV_BIN)/ruff,ruff)
UVICORN  := $(if $(VENV_BIN),$(VENV_BIN)/uvicorn,uvicorn)

.PHONY: test lint fmt run bench bench-quick docker-up docker-down clean help

## Run all tests with coverage
test:
	PYTHONPATH=backend $(PYTEST) tests/ -v \
	    --cov=agents --cov=algorithms \
	    --cov-report=term-missing \
	    -m "not network and not slow"

## Run linter (ruff)
lint:
	$(RUFF) check backend tests
	$(RUFF) format --check backend tests

## Format code automatically
fmt:
	$(RUFF) format backend tests
	$(RUFF) check --fix backend tests

## Run FastAPI backend with Uvicorn (SQLite dev mode)
run:
	cd backend && $(UVICORN) main:app --reload --host 0.0.0.0 --port 8000

## Run full reproducible benchmark suite (Phase 8)
bench:
	PYTHONPATH=.:backend $(PYTHON) -m experiments.run_benchmarks --seed 42

## Quick benchmark for CI
bench-quick:
	PYTHONPATH=.:backend $(PYTHON) -m experiments.run_benchmarks --seed 42 --quick

## Docker Compose startup
docker-up:
	docker compose up --build -d

## Docker Compose shutdown
docker-down:
	docker compose down

## Clean cache and temporary files
clean:
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".ruff_cache" -exec rm -rf {} + 2>/dev/null || true
	rm -f backend/ecoroute.db ecoroute.db .coverage

## Help
help:
	@echo "EcoRoute Optimizer — available make targets:"
	@grep -E '^##' Makefile | sed -e 's/## /  /'
