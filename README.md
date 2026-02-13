# DriverThru

Sistema web interno (monólito modular) para operação de emissão/renovação de documentos relacionados ao fluxo NJMVC.

## O que já está implementado

- Autenticação com JWT em cookie `HttpOnly`.
- CRUD de clientes.
- CRUD de documentos por cliente:
  - NJ Driver License (com renovação e histórico)
  - Brazil Driver License (com renovação e histórico)
  - Passport (com renovação e histórico)
- Geração de PDF por template:
  - `BA-208`
  - `affidavit`
- Prefill de formulário a partir de dados do cliente + licença/passaporte selecionados.
- Download de PDF gerado.
- Listagem de PDFs já gerados (para baixar sem regenerar).
- Dashboard com métricas + pendências reais por expiração.
- Tracking de notificação de pendências (notificado/pendente).

## Arquitetura

- Backend: FastAPI + SQLAlchemy + Alembic
- Frontend: React + Vite + Tailwind
- Infra: Docker Compose (Nginx, Backend, Frontend build, Postgres, MinIO)
- Estilo: monólito modular (`auth`, `customers`, `documents`, `dashboard`, etc.)

## Requisitos

- Docker + Docker Compose
- (Opcional) Python local para rodar backend sem Docker
- (Opcional) Node.js/Bun para dev frontend local

## Setup rápido (Docker)

1. Copie variáveis:

```bash
cp .env.example .env
```

2. Suba os serviços:

```bash
docker compose up -d --build
```

3. Acesse:

- App: `http://localhost`
- Health backend (via nginx): `http://localhost/api/health`
- MinIO Console: `http://localhost:9001` (se porta estiver exposta)

Observação: no container do backend já executa `alembic upgrade head` no startup.

## Setup local (sem Docker)

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

## Migrações Alembic

### Dentro do Docker (recomendado)

```bash
docker compose exec backend alembic upgrade head
```

### No host local

Se rodar no host, o `DATABASE_URL` precisa apontar para banco acessível localmente (`localhost`), não para `db` (hostname interno da rede Docker).

## Usuários padrão

Configurados via `AUTH_USERS_JSON` em `backend/app/core/config.py`:

- `admin` / `admin123`
- `operator` / `operator123`

Altere isso no `.env` para produção.

## Templates PDF

Por padrão, os templates são lidos de `documents/`:

- `documents/BA-208.pdf`
- `documents/affidavit.pdf`

No Docker, essa pasta é montada em `/app/documents` no backend.

## Principais endpoints

### Auth

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Customers

- `GET /api/customers`
- `POST /api/customers`
- `PATCH /api/customers/{id}`
- `DELETE /api/customers/{id}`
- Sub-rotas de NJ/BR/passport em `/api/customers/{id}/...`

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

## Troubleshooting rápido

- `ModuleNotFoundError: jwt` no Alembic:
  - já corrigido em import do módulo de dashboard; atualize branch e rode novamente.
- `failed to resolve host 'db'` ao rodar Alembic local:
  - rode via Docker (`docker compose exec backend ...`) ou ajuste `DATABASE_URL` para `localhost`.
- Erros de constraint (`height_feet`, etc.):
  - backend retorna `422`; confira payload enviado pelo front.

## Estado atual

Projeto em evolução contínua. OCR e melhorias de UX ainda estão no roadmap.
