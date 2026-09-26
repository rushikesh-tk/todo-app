# Taskflow — Full Stack Todo App

A production-ready todo app built as a full-stack learning project. Every architectural decision is documented in ADRs before any code was written.

**Live:** https://todo-app-six-blond-92.vercel.app

---

## Stack

**Frontend**

- React + Redux Toolkit (async thunk pattern)
- Tailwind CSS
- Axios with httpOnly cookie auth
- Vite

**Backend**

- FastAPI (modular monolith structure)
- PostgreSQL + psycopg2 (raw SQL with ORM equivalents in comments)
- Alembic migrations
- JWT in httpOnly cookies
- bcrypt password hashing

**Infrastructure**

- Frontend → Vercel
- Backend + Database → Render
- CI/CD → GitHub Actions

---

## Features

- User registration and login
- JWT authentication via httpOnly cookies (XSS-safe)
- Each user sees only their own todos
- Create, complete, and delete todos
- Priority levels — low, medium, high
- Live stats — total, completed, high priority, remaining
- Filter by status and priority
- Completion progress bar
- Responsive — works on mobile and desktop

---

## Architecture

Every decision in this project is documented as an ADR in `docs/adr/` — what was decided, what was rejected, and why.

| ADR | Decision                                            |
| --- | --------------------------------------------------- |
| 001 | Modular folder structure over single-file approach  |
| 002 | PostgreSQL + raw SQL + Alembic migrations           |
| 003 | JWT in httpOnly cookie over localStorage            |
| 004 | Redux for shared/async state, useState for local UI |
| 005 | Deferred scope — what is NOT built and why          |
| 006 | Versioned API prefix /api/v1/                       |
| 007 | Environment configuration — secrets in .env only    |
| 008 | Living Mermaid architecture diagrams                |
| 009 | Render + Vercel deployment + GitHub Actions CI/CD   |

---

## Running locally

**Prerequisites:** Docker, Python 3.13, Node 20

**Backend**

```bash
# Start PostgreSQL
docker run --name todo-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=todoapp \
  -p 5432:5432 -d postgres

# Setup
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env — add your SECRET_KEY

# Run migrations
alembic upgrade head

# Start server
uvicorn main:app --reload
```

**Frontend**

```bash
cd frontend
npm install

# Configure environment
cp .env.example .env
# Edit .env — set VITE_API_URL=http://localhost:8000

# Start dev server
npm run dev
```

Open http://localhost:5173

---

## Project structure

```
todo-app/
  backend/
    core/          # config, database, security
    models/        # Pydantic schemas
    routers/       # auth and todos routes
    db/
      queries/     # raw SQL functions
      migrations/  # Alembic migration files
  frontend/
    src/
      app/         # Redux store
      features/    # auth and todos slices + pages
      components/  # Navbar, ProtectedRoute
      services/    # Axios instance
  docs/
    adr/           # Architecture Decision Records
    goal.html      # UI design reference
  .github/
    workflows/     # GitHub Actions CI pipeline
```

---

## CI/CD

Every push to main triggers the GitHub Actions pipeline:

- Installs Python dependencies and checks backend imports
- Installs Node dependencies and runs Vite build
- If both pass, Render and Vercel deploy automatically
