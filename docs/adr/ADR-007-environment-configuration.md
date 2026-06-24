# ADR-007: Environment Configuration

## Status
Accepted

## Date
2026-06-24

## Context

The app has secrets and settings that change between environments
(local development vs production). These must never be hardcoded
in the source code and must never be committed to git.

This ADR documents exactly what environment variables are required,
where they live, and what happens if they are missing.

---

## The Rule

**Never hardcode secrets in code.**

Wrong:
```python
SECRET_KEY = "mysecretkey123"          # hardcoded — never do this
DATABASE_URL = "postgresql://..."      # hardcoded — never do this
```

Right:
```python
SECRET_KEY = os.getenv("SECRET_KEY")   # read from environment
DATABASE_URL = os.getenv("DATABASE_URL")
```

Reason: if you hardcode a secret and push to GitHub, the secret
is now public forever. Environment variables keep secrets out of
the codebase entirely.

---

## Backend Environment Variables

File: `backend/.env`
This file is never committed to git (add to .gitignore).

```bash
# backend/.env

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/todoapp

# JWT
SECRET_KEY=your-secret-key-change-this-to-something-long-and-random
ACCESS_TOKEN_EXPIRE_MINUTES=1440        # 24 hours

# App
ENVIRONMENT=development
```

### Variable reference

| Variable | Required | Description |
|----------|----------|-------------|
| DATABASE_URL | yes | Full PostgreSQL connection string |
| SECRET_KEY | yes | Used to sign JWT tokens. Must be long and random. |
| ACCESS_TOKEN_EXPIRE_MINUTES | no | Defaults to 1440 (24 hours) if not set |
| ENVIRONMENT | no | "development" or "production". Defaults to "development" |

### How to generate a secure SECRET_KEY

```bash
# Run this in terminal — copy the output into your .env
python -c "import secrets; print(secrets.token_hex(32))"
```

Never use a short or guessable string as your SECRET_KEY.
If this key is leaked, anyone can forge JWT tokens and log in
as any user.

---

## How the Backend Reads These Variables

Using pydantic-settings in `backend/core/config.py`:

```python
# core/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    secret_key: str
    access_token_expire_minutes: int = 1440
    environment: str = "development"

    class Config:
        env_file = ".env"

# Single instance used everywhere
settings = Settings()
```

Every module that needs a setting imports from here:

```python
# Never do this in any other file:
import os
os.getenv("SECRET_KEY")   # wrong — bypasses validation

# Always do this:
from core.config import settings
settings.secret_key       # right — validated and typed
```

If a required variable (database_url, secret_key) is missing,
pydantic-settings raises an error immediately when the app starts.
The app will not start with missing required config.
This is intentional — better to crash at startup than to fail
mysteriously at runtime.

---

## Frontend Environment Variables

File: `frontend/.env`
This file is never committed to git (add to .gitignore).

```bash
# frontend/.env

VITE_API_URL=http://localhost:8000
```

### Variable reference

| Variable | Required | Description |
|----------|----------|-------------|
| VITE_API_URL | yes | Base URL of the FastAPI backend |

### Important: VITE_ prefix is required

Vite (the React build tool) only exposes environment variables
that start with `VITE_` to the browser. Variables without this
prefix are invisible to your React code.

```javascript
// This works — has VITE_ prefix
import.meta.env.VITE_API_URL

// This does not work — no VITE_ prefix
import.meta.env.API_URL   // undefined
```

### How the frontend reads this variable

```javascript
// services/api.js
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true,
})
```

---

## .gitignore Rules

Both .env files must be in .gitignore before the first commit.

```bash
# backend/.gitignore
.env
__pycache__/
*.pyc
.venv/

# frontend/.gitignore
.env
node_modules/
dist/
```

---

## .env.example Files

For every .env file, create a matching .env.example file that
IS committed to git. It contains the variable names but no real values.

```bash
# backend/.env.example
DATABASE_URL=postgresql://postgres:password@localhost:5432/todoapp
SECRET_KEY=generate-with-python-secrets-token-hex-32
ACCESS_TOKEN_EXPIRE_MINUTES=1440
ENVIRONMENT=development
```

```bash
# frontend/.env.example
VITE_API_URL=http://localhost:8000
```

Why: when you clone the project on a new machine (or a teammate
sets it up), they can copy .env.example to .env and fill in their
own values. Without .env.example, they have to guess what variables
are needed.

```bash
# Setup command for a new developer
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Then edit backend/.env with real values
```

---

## Docker PostgreSQL Config

The DATABASE_URL must match the Docker container settings:

```bash
# Docker command (from ADR-002)
docker run --name todo-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=todoapp \
  -p 5432:5432 \
  -d postgres

# Matching DATABASE_URL in backend/.env
DATABASE_URL=postgresql://postgres:password@localhost:5432/todoapp
```

If these don't match, the backend cannot connect to the database
and will throw a connection error on startup.

---

## Startup Checklist

Before running the app for the first time:

```
Backend:
  [ ] Docker PostgreSQL container is running
  [ ] backend/.env exists with all required variables
  [ ] SECRET_KEY is set to a long random string
  [ ] DATABASE_URL matches the Docker container settings
  [ ] Alembic migrations have been run (alembic upgrade head)

Frontend:
  [ ] frontend/.env exists
  [ ] VITE_API_URL=http://localhost:8000
```

---

## When to Revisit

Revisit this ADR if:
- A new service is added that needs an API key (email, storage, etc.)
- The app is deployed to production (DATABASE_URL and SECRET_KEY change)
- A new environment variable is added anywhere in the codebase

---

## Consequences

Positive:
- Secrets never appear in the codebase or git history
- App fails fast at startup if config is missing (not mysteriously later)
- .env.example makes onboarding to a new machine straightforward
- Single source of truth for config (core/config.py)

Negative:
- Developer must manually create .env files on every new machine
- Forgetting to set a variable causes a startup error
  (this is intentional and is actually a positive)
