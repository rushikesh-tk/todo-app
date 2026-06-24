# Architecture Decision Records

This folder contains all architectural decisions made for the todo app.
Each ADR documents a decision: what was decided, why, what was rejected, and when to revisit.

Read these before writing any code. When asking Cline to build something,
paste the relevant ADR as context so it follows the agreed design.

---

## Index

| ADR | Title | Status |
|-----|-------|--------|
| [ADR-001](ADR-001-architecture-and-folder-structure.md) | Architecture and folder structure | Accepted |
| [ADR-002](ADR-002-database-and-migration-strategy.md) | Database and migration strategy | Accepted |
| [ADR-003](ADR-003-auth-design-jwt-httponly-cookies.md) | Auth design — JWT + httpOnly cookies | Accepted |
| [ADR-004](ADR-004-frontend-state-strategy.md) | Frontend state strategy — Redux boundaries | Accepted |
| [ADR-005](ADR-005-deferred-scope.md) | Deferred scope | Accepted |
| [ADR-006](ADR-006-api-design.md) | API design and endpoint contract | Accepted |
| [ADR-007](ADR-007-environment-configuration.md) | Environment configuration | Accepted |
| [ADR-008](ADR-008-architecture-diagrams.md) | Architecture diagrams (living document) | Living |

---

## Quick reference

**Stack**
- Frontend: React + Redux Toolkit, Axios, Vite
- Backend: FastAPI, psycopg2 (raw SQL), bcrypt, JWT
- Database: PostgreSQL in Docker, Alembic migrations
- Auth: JWT stored in httpOnly cookie

**Ports**
- Frontend: localhost:5173
- Backend: localhost:8000
- PostgreSQL: localhost:5432

**API base URL**
- All routes prefixed with `/api/v1/`

**Key rules**
- Dependencies flow inward only (see ADR-001)
- Raw SQL in db/queries/ with ORM equivalent in comments (see ADR-002)
- JWT never in localStorage — httpOnly cookie only (see ADR-003)
- Shared/async state → Redux. Local UI state → useState (see ADR-004)
- All Axios calls go through services/api.js with withCredentials: true (see ADR-004)
- Secrets in .env only, never hardcoded (see ADR-007)

**v1 scope (what is built)**
- User register, login, logout
- Each user sees only their own todos
- Create, read, update, delete todos
- Todo has: title, priority (low/medium/high), is_completed

**Deferred (not in v1)**
- Refresh tokens, email verification, password reset
- Todo categories, due dates, search, pagination
- See ADR-005 for full list and how to add each later

---

## How to update

When a new decision is made:
1. Create ADR-00N-short-title.md following the same structure
2. Add it to the index table above
3. Commit before writing any implementation code

When the architecture changes (new feature, new table):
1. Update ADR-008 with a new version section
2. Never delete old version sections — they are the history
