# Backend (FastAPI)

## Scope

Backend is a modular monolith organized by feature modules under `app/modules`.

## Main Structure

- `app/main.py`: FastAPI app bootstrap
- `app/api/router.py`: top-level router composition
- `app/modules/*`: feature modules (auth, customers, documents, dashboard, reports, ocr)
- `app/core/*`: config/security/shared core concerns
- `alembic/*`: DB migrations

## Router Composition

All routes are exposed under `/api/*` via Nginx.

Included modules:

- `auth`
- `customers`
- `documents`
- `dashboard`
- `reports`
- `ocr`

`documents`, `dashboard`, `customers`, `reports`, and `ocr` are protected by auth dependency.

## Key Endpoints

### Auth

- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

### Customers

- `GET /customers`
- `GET /customers/{customer_id}`
- `POST /customers`
- `PATCH /customers/{customer_id}`
- `DELETE /customers/{customer_id}`
- `POST /customers/{customer_id}/photo`
- `GET /customers/{customer_id}/photo`
- `DELETE /customers/{customer_id}/photo`

Sub-resources (NJ/BR/Passport):

- CRUD + renew routes
- record file routes: `.../{id}/file`
- staged file routes: `.../staged-file`

### OCR

- `GET /ocr/provider`
- `POST /ocr/prefill/customer-form`
- `POST /ocr/prefill/nj-license-form`
- `POST /ocr/prefill/brazil-license-form`
- `POST /ocr/prefill/passport-form`

### Documents

- `GET /documents/templates`
- `GET /documents/templates/{template_key}/fields`
- `POST /documents/prefill`
- `POST /documents/generate`
- `GET /documents/download?object_key=...`
- `GET /documents/generated`
- `DELETE /documents/generated?object_key=...`

### Dashboard

- `GET /dashboard/summary`
- `GET /dashboard/pending`
- `POST /dashboard/pending/notify`

### Reports

- multiple CSV exports under `/reports/*.csv`

## Architectural Notes

### OCR module

- Stateless by design (no OCR DB persistence)
- Provider selected by env (`OCR_PROVIDER`)
- Current production provider path is Anthropic
- Prompts centralized in OCR services (`prompts.py`)
- Passport flow prioritizes MRZ extraction and parser-based normalization

### Document file handling

- Two patterns:
  - record file (`/{id}/file`) for persisted entities
  - staged file (`/staged-file`) for pre-save upload UX
- Route order matters: keep static `staged-file` routes before dynamic `/{id}` routes to avoid path capture bugs.

### Migrations

- Compose backend command runs `alembic upgrade head` before starting app
- Always create additive migrations; avoid editing already-applied revisions in shared environments

## Coding Guidelines for Future Changes

- Keep business rules in services/use-cases, not routers
- Keep response schemas explicit and stable
- For OCR payload changes, update:
  - backend schemas
  - frontend mapping layer
  - contract tests (`backend/tests`)
- Prefer small module-local helpers over global abstractions unless reused across modules
- Do not persist OCR intermediate data unless a clear product requirement appears

## Local Dev (without Docker)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

If running locally, ensure `DATABASE_URL` points to a reachable host (usually `localhost`, not `db`).
