# ConnectX Scripts

Internal platform to share, propose, and run Python scripts with per-user credentials and audit logging.

## Stack

- **Frontend:** React + TypeScript + Vite
- **Backend:** FastAPI + PostgreSQL + Alembic
- **Deploy target:** EC2 + S3 (AWS Dev account)

## Quick start (Docker)

```bash
cp .env.example .env
docker compose up --build
```

Open:

- **Frontend:** http://localhost:5173
- **API docs:** http://localhost:8000/docs
- **Default admin:** `admin` / `admin123` (change in `.env`)

## Features by phase

### Phase 1 — Foundation
- Username/password auth, roles, propose → admin approve
- Shared catalog, per-user encrypted credentials

### Phase 2 — Execution
- Script runner (subprocess + ENV injection)
- Local/S3 storage for scripts and run logs
- Dynamic run forms per script

### Phase 3 — Team ops
- In-app notifications, audit CSV export
- Script-level run permissions, async runs
- AWS STS short-lived credentials

### Phase 4 — Production hardening (current)
- **Alembic migrations** — auto-run on startup (`RUN_DB_MIGRATIONS=true`)
- **Per-script timeout** — override global `SCRIPT_RUN_TIMEOUT_SECONDS`
- **Deprecation workflow** — admin deprecate/reactivate; removed from catalog
- **Slack webhooks** — optional external alerts (`SLACK_WEBHOOK_URL`)

## Environment variables

| Variable | Description |
|----------|-------------|
| `SLACK_WEBHOOK_URL` | Slack incoming webhook for alerts |
| `WEBHOOK_NOTIFICATIONS_ENABLED` | `true` to send Slack messages |
| `ASYNC_RUNS_ENABLED` | Background script execution (default `true`) |
| `SCRIPT_RUN_TIMEOUT_SECONDS` | Global default timeout |
| `RUN_DB_MIGRATIONS` | Run Alembic on startup (default `true`) |

## Database migrations

Migrations run automatically when the API starts. Manual:

```bash
cd backend
alembic upgrade head
```

Existing DB from before Phase 4: migrations add new columns idempotently.

## AWS deployment

See **[docs/DEPLOY.md](docs/DEPLOY.md)** for Terraform-based EC2 + S3 deployment (`terraform apply`).

## Auto-deploy (Phase 6)

See **[docs/CI.md](docs/CI.md)** for GitHub Actions SSH deploy on push to `main`.

## Security notes

- Credentials encrypted per user; never in audit logs
- `.env` is not committed — use `.env.example`
- Change `SECRET_KEY`, `APP_ENCRYPTION_KEY`, and admin password before production

## Project structure

```
backend/app/       FastAPI application
backend/alembic/   Database migrations
frontend/src/      React SPA
docker-compose.yml
```
