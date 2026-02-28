# DriverThru

Internal web platform for customer, document, and license workflows (NJMVC-focused).

## Stack

- Backend: FastAPI + SQLAlchemy + Alembic
- Frontend: React + Vite + Tailwind
- Infra: Docker Compose (Nginx, Backend, Frontend build container, Postgres, MinIO)

## Quick Start (Docker)

1. Copy env vars:

```bash
cp .env.example .env
```

2. Start services:

```bash
docker compose up -d --build
```

3. Access:

- App: `http://localhost:8080`
- API health: `http://localhost:8080/api/health`

## Important Runtime Notes

- Backend startup in Compose runs migrations automatically:
  - `alembic -c alembic.ini upgrade head && uvicorn ...`
- If you run backend outside Compose (e.g. plain `docker run`), run Alembic manually.
- OCR provider is configured by env (`OCR_PROVIDER`, `ANTHROPIC_API_KEY`, model vars if configured).

## Project Docs

- Backend details: `backend/README.md`
- Frontend details: `frontend/README.md`

## Feature Highlights

- Auth via JWT in `HttpOnly` cookie
- Customer CRUD with photo upload
- Document CRUD/history:
  - NJ Driver License
  - Brazil Driver License
  - Passport
- Document file upload to MinIO (record file + staged file flows)
- OCR prefill endpoints (customer/NJ/BR/passport)
- PDF generation + prefill + downloads
- Dashboard pending/summary and notification tracking
- CSV reports endpoints

## Production Deploy Checklist

1. `git pull`
2. Update `.env` (DB/MinIO/auth/OCR keys)
3. `docker compose up -d --build`
4. Verify backend logs and migration output
5. Smoke test:
   - login
   - customers list
   - one OCR prefill request
   - one document generation

## Troubleshooting

- `failed to resolve host 'db'` when running Alembic locally:
  - local `DATABASE_URL` must point to `localhost` (not `db`).
- OCR 422 on upload:
  - check file type (`image/*` or `.pdf`) and payload not empty.
- Missing DB column errors after deploy:
  - migration likely not applied; check backend startup logs for Alembic.
