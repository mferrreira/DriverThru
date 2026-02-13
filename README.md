# DriverThru

Internal web platform (modular monolith) for NJMVC-related licensing and document workflows.

## Implemented Features

- JWT authentication using an `HttpOnly` cookie.
- Customer CRUD.
- Customer document CRUD:
  - NJ Driver License (renewal + history)
  - Brazil Driver License (renewal + history)
  - Passport (renewal + history)
- PDF generation from templates:
  - `BA-208`
  - `affidavit`
- Form prefill from customer data + selected license/passport.
- Generated PDF download.
- Generated PDF listing (download without regenerating).
- Dashboard metrics + real expiration-based pending items.
- Notification tracking for pending items (notified/pending).

## Architecture

- Backend: FastAPI + SQLAlchemy + Alembic
- Frontend: React + Vite + Tailwind
- Infra: Docker Compose (Nginx, Backend, Frontend build, Postgres, MinIO)
- Pattern: modular monolith (`auth`, `customers`, `documents`, `dashboard`, etc.)

## Requirements

- Docker + Docker Compose
- (Optional) Local Python for backend development without Docker
- (Optional) Node.js/Bun for local frontend development

## Quick Setup (Docker)

1. Copy environment variables:

```bash
cp .env.example .env
```

2. Start services:

```bash
docker compose up -d --build
```

3. Access:

- App: `http://localhost`
- Backend health (via nginx): `http://localhost/api/health`
- MinIO Console: `http://localhost:9001` (if exposed)

Note: the backend container runs `alembic upgrade head` on startup.

## Local Setup (without Docker)

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Alembic Migrations

### Inside Docker (recommended)

```bash
docker compose exec backend alembic upgrade head
```

### Local host

When running on host, `DATABASE_URL` must point to a locally reachable DB (`localhost`), not `db` (Docker internal hostname).

## Default Users

Configured via `AUTH_USERS_JSON` in `backend/app/core/config.py`:

- `admin` / `admin123`
- `operator` / `operator123`

Change this in `.env` for production.

## PDF Templates

By default, templates are loaded from `documents/`:

- `documents/BA-208.pdf`
- `documents/affidavit.pdf`

In Docker, this folder is mounted to `/app/documents` in backend.

## Main Endpoints

### Auth

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Customers

- `GET /api/customers`
- `POST /api/customers`
- `PATCH /api/customers/{id}`
- `DELETE /api/customers/{id}`
- NJ/BR/passport subroutes under `/api/customers/{id}/...`

### Documents

- `GET /api/documents/templates`
- `GET /api/documents/templates/{template_key}/fields`
- `POST /api/documents/prefill`
- `POST /api/documents/generate`
- `GET /api/documents/download?object_key=...`
- `GET /api/documents/generated`

### Dashboard

- `GET /api/dashboard/summary`
- `GET /api/dashboard/pending`
- `POST /api/dashboard/pending/notify`

## Quick Troubleshooting

- `ModuleNotFoundError: jwt` in Alembic:
  - fixed by dashboard module import changes; update your branch and rerun.
- `failed to resolve host 'db'` when running Alembic locally:
  - run via Docker (`docker compose exec backend ...`) or update `DATABASE_URL` to `localhost`.
- Constraint errors (`height_feet`, etc.):
  - backend returns `422`; check the payload sent by frontend.

## Current Status

Project is under active development. OCR and UX improvements are still on the roadmap.
