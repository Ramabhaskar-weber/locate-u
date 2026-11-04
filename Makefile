.PHONY: install dev backend frontend test test-backend test-frontend e2e build data db-setup

install:            ## install backend + frontend dependencies
	pip install -r backend/requirements-dev.txt
	cd frontend && npm ci

backend:            ## run FastAPI on :8000 (auto-migrates + imports India data)
	cd backend && uvicorn app.main:app --reload --port 8000

frontend:           ## run Vite on :5173 (proxies /api to :8000)
	cd frontend && npm run dev

test: test-backend test-frontend e2e

test-backend:
	cd backend && python -m pytest

test-frontend:
	cd frontend && npm run typecheck && npm test

build:
	cd frontend && npm run build

e2e: build
	cd frontend && npx playwright test

data:               ## re-download sources and rebuild data/processed/india
	python data/scripts/fetch_sources.py
	python data/scripts/build_india.py

db-setup:           ## migrate + import India dataset into DATABASE_URL
	cd backend && python -m app.cli import-india
