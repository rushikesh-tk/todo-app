# ADR-009: Deployment and CI/CD Pipeline

## Status
Accepted

## Date
2026-09-25

## Related
ADR-003 (Auth — cookie settings change in production)
ADR-007 (Environment configuration — new production variables needed)

---

## Context

The app runs locally. The next step is making it accessible on the internet
so anyone with the URL can use it.

Two things are decided in this ADR:
1. Where to host the backend and frontend (deployment)
2. How to automate testing and deployment on every code push (CI/CD)

---

## Decision 1: Hosting Platforms

### Backend (FastAPI + PostgreSQL) → Render

**Why Render:**
- Free tier supports Python web services and PostgreSQL
- No credit card required
- Deploys directly from GitHub — push code, Render rebuilds automatically
- PostgreSQL free tier lasts 90 days (enough to learn deployment)

**Tradeoff:**
- Free tier apps sleep after 15 minutes of inactivity
- First request after sleep takes 30-60 seconds to wake up
- Acceptable for a practice project, not for production

**Alternative considered: Railway**
- Also free but $5 credit/month limit
- Credits run out and app pauses
- Render's free tier is more predictable for learning

---

### Frontend (React + Vite) → Vercel

**Why Vercel:**
- Free forever for personal projects
- Zero config for Vite — connects to GitHub, detects Vite automatically
- Deploys on every push to main branch
- Gives a public URL immediately

**Alternative considered: Netlify**
- Equally good, both are free
- Vercel has slightly better Vite support out of the box

---

## Decision 2: CI/CD → GitHub Actions

### What CI/CD does

Without CI/CD:
```
You push code → manually go to Render → manually trigger deploy → hope nothing broke
```

With CI/CD:
```
You push code → GitHub Actions runs automatically:
  1. Install dependencies
  2. Run checks (does the app start? do routes respond?)
  3. If checks pass → Render and Vercel deploy automatically
```

### Why GitHub Actions
- Free for public repositories (unlimited minutes)
- Built into GitHub — no extra account or tool needed
- Works directly with Render and Vercel via deploy hooks

---

## Production Environment Changes

Several things must change when moving from local to production:

### Backend changes

| Setting | Local | Production |
|---------|-------|------------|
| DATABASE_URL | localhost:5432 | Render PostgreSQL URL |
| SECRET_KEY | any string | long random string (same generation method) |
| ENVIRONMENT | development | production |
| Cookie `secure` | False | True (requires HTTPS) |
| Cookie `samesite` | lax | none (frontend and backend on different domains) |
| CORS `allow_origins` | http://localhost:5173 | https://your-app.vercel.app |

### Frontend changes

| Setting | Local | Production |
|---------|-------|------------|
| VITE_API_URL | http://localhost:8000 | https://your-app.onrender.com |

### Cookie settings explanation

In production the frontend (Vercel) and backend (Render) are on different
domains. This is called "cross-site" — the browser has stricter rules:

- `secure=True` — cookie only sent over HTTPS (Render provides HTTPS automatically)
- `samesite="none"` — required when frontend and backend are on different domains
- These two settings must be used together — `samesite="none"` without
  `secure=True` is rejected by all modern browsers

---

## Files to Add for Deployment

### backend/Procfile
Tells Render how to start the FastAPI app:
```
web: uvicorn main:app --host 0.0.0.0 --port $PORT
```

### backend/runtime.txt
Tells Render which Python version to use:
```
python-3.13
```

### .github/workflows/ci.yml
GitHub Actions pipeline — runs on every push to main:
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.13'

      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt

      - name: Check imports
        run: |
          cd backend
          python -c "from main import app; print('Backend imports OK')"
        env:
          DATABASE_URL: postgresql://postgres:password@localhost:5432/todoapp
          SECRET_KEY: test-secret-key-for-ci
          ENVIRONMENT: test

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: |
          cd frontend
          npm install

      - name: Build
        run: |
          cd frontend
          npm run build
        env:
          VITE_API_URL: https://placeholder.onrender.com
```

---

## Deployment Steps (in order)

### Step 1 — Prepare backend for Render
- Add `Procfile` and `runtime.txt` to `backend/`
- Update cookie settings for production in `core/security.py`
- Update CORS to accept production frontend URL in `main.py`
- Use environment variable for CORS origin

### Step 2 — Deploy backend to Render
- Create account at render.com
- New Web Service → connect GitHub repo
- Set root directory to `backend`
- Set environment variables (DATABASE_URL, SECRET_KEY, ENVIRONMENT)
- Create PostgreSQL database on Render
- Run `alembic upgrade head` via Render shell

### Step 3 — Deploy frontend to Vercel
- Create account at vercel.com
- Import GitHub repo
- Set root directory to `frontend`
- Set environment variable: VITE_API_URL = https://your-render-app.onrender.com
- Deploy

### Step 4 — Update backend CORS
- Once Vercel gives you the frontend URL
- Update CORS allow_origins in main.py to that URL
- Redeploy backend

### Step 5 — Set up GitHub Actions
- Add `.github/workflows/ci.yml`
- Push to GitHub
- Check Actions tab to see pipeline run

---

## When to Revisit

Revisit this ADR if:
- Render's free PostgreSQL expires (90 days) — migrate to Supabase free tier
- App needs to stay awake (upgrade Render plan or add a ping service)
- Adding staging environment separate from production

---

## Consequences

Positive:
- App is live on the internet with a public URL
- Every push to main triggers automatic checks
- No manual deployment steps after initial setup
- Free forever (within free tier limits)

Negative:
- Render free tier sleeps — first request is slow
- PostgreSQL free tier expires in 90 days
- Cross-domain cookies require `samesite=none` + `secure=True`
  which only works over HTTPS (not local dev)
- CI pipeline checks imports but doesn't run full integration tests
  (no database available in CI environment)
