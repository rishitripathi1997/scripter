# ConnectX Scripts

Internal platform to share, propose, and run Python scripts with per-user credentials and audit logging.

## Stack

- **Frontend:** React + TypeScript + Vite
- **Backend:** FastAPI + PostgreSQL
- **Deploy target:** EC2 + S3 (AWS Dev account)

## Phase 1 (current)

- Username/password auth with sessions
- Admin seed user
- Propose scripts with custom input definitions
- Admin review queue (approve / reject / request changes)
- Shared script catalog (approved scripts)
- Per-user encrypted credentials vault
- My runs + admin audit views

## Phase 2 (current)

- **Script runner** — subprocess execution with your credentials injected via ENV
- **Storage** — local filesystem (dev) or S3 (production when `S3_BUCKET` is set)
- **Run UI** — dynamic form per script, stdout/stderr log viewer
- Scripts published to storage on admin approval
- Audit logs redact credential values

## Quick start (Docker)

```bash
cp .env.example .env
docker compose up --build
```

Open:

- **Frontend:** http://localhost:5173
- **API docs:** http://localhost:8000/docs
- **Default admin:** `admin` / `admin123` (change in `.env`)

## Local development (without Docker)

### Backend (Python 3.12+)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL=postgresql+psycopg://connectx:connectx@localhost:5432/connectx_scripts
export SECRET_KEY=dev-secret
export APP_ENCRYPTION_KEY=dev-encryption-key-change-in-prod!!
uvicorn app.main:app --reload --port 8000
```

Start PostgreSQL locally or run only the db service:

```bash
docker compose up db -d
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api` to `http://localhost:8000`.

## Project structure

```
backend/app/     FastAPI application
frontend/src/    React SPA
docker-compose.yml
```

## Security notes

- Credentials are encrypted per user in PostgreSQL
- API scopes all credential and run access to the logged-in session user
- Admin audit shows run metadata, not credential values
- Change `SECRET_KEY`, `APP_ENCRYPTION_KEY`, and admin password before production

## Phase 3 (current)

- **In-app notifications** — proposal submitted, approved/rejected, run completed
- **Audit CSV export** — admin downloads run history
- **Script-level permissions** — restrict who can run each script
- **Async runs** — scripts run in background threads; poll run status
- **AWS STS** — configure IAM role for short-lived AWS credentials at run time

Set `ASYNC_RUNS_ENABLED=false` in `.env` to run scripts synchronously (blocking API).

For AWS STS on EC2, attach an instance role that allows `sts:AssumeRole` on target roles.

## Next (Phase 4)

- In-app notifications for proposal status
- Export audit CSV
- Script-level permissions
- AWS STS for short-lived credentials
- Async job queue for long-running scripts
