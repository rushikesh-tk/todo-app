# ADR-001: Architecture and Folder Structure

## Status
Accepted

## Date
2026-06-24

## Context

Before writing any code, we need to decide how the project is structured
as a whole. This is a practice project built to learn real-world full-stack
development patterns using React, FastAPI, and PostgreSQL.

The goal is not just to build a working todo app — it is to build it the
way a professional would, so the structure, conventions, and decisions made
here reflect real production habits.

Two structural decisions are made in this ADR:
1. How the backend is organized
2. How the frontend is organized

---

## Backend Structure Decision

### Option A: Single file (main.py does everything)
Put all routes, logic, and DB calls in one file.

Pros:
- Fast to start
- No overhead thinking about where things go

Cons:
- Breaks immediately as the app grows
- Teaches nothing about real project organization
- Auth, todos, and DB logic become one tangled mess

### Option B: Modular folder structure (our choice)
Organize the backend into folders by responsibility. Each folder owns
one concern and nothing else.

Pros:
- Mirrors how real FastAPI projects are structured
- Each folder can be understood and edited independently
- When Cline writes code, it has a clear place to put things
- Prepares you for larger projects where this structure is mandatory

---

## Decision: Modular structure for both frontend and backend

---

## Backend Folder Structure

```
backend/
  main.py                        # FastAPI app entry point, mounts routers
  core/
    config.py                    # env vars and settings (pydantic-settings)
    database.py                  # psycopg2 connection pool, get_db()
    security.py                  # password hashing (bcrypt), JWT encode/decode
  models/
    user.py                      # Pydantic schemas: UserCreate, UserOut, UserInDB
    todo.py                      # Pydantic schemas: TodoCreate, TodoUpdate, TodoOut
  routers/
    auth.py                      # POST /auth/register, /auth/login, /auth/logout
    todos.py                     # GET/POST/PUT/DELETE /todos
  db/
    queries/
      user_queries.py            # all raw SQL for users table
      todo_queries.py            # all raw SQL for todos table
    migrations/                  # Alembic migration files
      env.py
      versions/
  requirements.txt
  .env
```

### Dependency Direction Rule (backend)

Dependencies flow inward only. Outer layers depend on inner layers.
Inner layers never import from outer layers.

```
core/           (depends on nothing except stdlib + env)
  ^
models/         (depends on core only)
  ^
db/queries/     (depends on core, models)
  ^
routers/        (depends on db/queries, models, core)
  ^
main.py         (depends on routers only)
```

If you are writing code in `routers/` and find yourself importing
from another router — STOP. Extract the shared logic to `core/` instead.

---

## Frontend Folder Structure

```
frontend/
  src/
    app/
      store.js                   # Redux store: combines all slices
    features/
      auth/
        authSlice.js             # Redux slice: token, user, loading, error
        AuthPage.jsx             # Login + Register UI (tabs)
      todos/
        todosSlice.js            # Redux slice: todos[], loading, error
        TodosPage.jsx            # Main todo list UI
    services/
      api.js                     # Axios instance: baseURL, withCredentials: true
    components/
      Navbar.jsx                 # Shared nav: shows user, logout button
      ProtectedRoute.jsx         # Redirects to /auth if not logged in
    App.jsx                      # Route definitions
    main.jsx                     # React + Redux Provider entry point
  .env                           # VITE_API_URL=http://localhost:8000
```

### What lives in Redux vs local state

Redux (global, shared across components):
- `auth`: current user object, isAuthenticated flag, loading, error
- `todos`: todos array, loading, error

Local component state (dies when component unmounts):
- Form input values (the text being typed)
- UI toggles (is this todo row in edit mode?)

Rule: if two components need to read the same piece of state,
it goes in Redux. If only one component needs it, keep it local.

---

## AI Tooling Note

This project uses:
- Cline (VSCode) with gemma-4-31b-it:free for code generation
- Aider (terminal) with qwen2.5-coder:7b for quick edits
- Claude for decisions and ADRs

When giving Cline a task, always paste the relevant ADR as context
so the model follows the agreed structure rather than inventing its own.

Example prompt pattern for Cline:
  "Here is our folder structure decision: [paste ADR-001 backend section].
   Now create the backend folder structure with empty placeholder files."

The model follows instructions well. It makes poor architectural decisions
when given no context. The ADR is the context.

---

## When to Revisit

Revisit this ADR if:
- A new module is needed that does not fit the current structure
- The dependency direction rule needs an exception (document why)
- The project grows beyond a single developer

---

## Consequences

Positive:
- Clear place for every file before writing any code
- Cline has a spec to follow, not a blank canvas to fill randomly
- Backend and frontend boundaries are explicit from day one
- Prepares you for real-world project onboarding (structure first)

Negative:
- More initial setup than a single-file approach
- Overkill for a 2-route app — but the learning is the point
