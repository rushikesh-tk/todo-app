# ADR-005: Deferred Scope

## Status
Accepted

## Date
2026-06-24

## Related
ADR-001, ADR-002, ADR-003, ADR-004

## Context

This is a practice project. The goal is to learn real-world patterns
by building a complete, working todo app — not to build every possible
feature.

This ADR records everything we are consciously NOT building right now,
and why. This serves two purposes:

1. Future-you does not wonder "did I forget this?" — the answer is no,
   it was a deliberate decision.

2. When you want to add these features later, the hooks and boundaries
   are already in the right places because the architecture was designed
   with clean boundaries from the start.

The bar for v1 is: a user can register, log in, and fully manage
their own todos (create, read, update, delete, set priority).
Everything beyond that is deferred.

---

## What is Deferred and Why

### Auth — Refresh Tokens

What it is:
  When a JWT token expires (after 24 hours), the user gets logged out.
  Refresh tokens let the backend silently issue a new token without
  making the user log in again.

Why deferred:
  Requires a second token, a separate refresh endpoint, and Axios
  interceptors to automatically retry failed requests. This is a
  meaningful complexity jump for a first project.
  The 24-hour expiry is fine for a practice app.

How to add later:
  Add a refresh_tokens table in the DB (migration).
  Add POST /auth/refresh endpoint.
  Add Axios response interceptor in services/api.js that catches
  401 responses, calls /refresh, and retries the original request.

---

### Auth — Email Verification

What it is:
  After registering, the user receives an email with a verification link.
  They must click it before their account is active.

Why deferred:
  Requires an email sending service (SendGrid, Resend, etc.),
  a verification token stored in the DB, and an extra step in the
  registration flow. Adds infrastructure before the core app works.

How to add later:
  Add email_verified boolean to users table (migration).
  Add a verification_tokens table.
  Integrate an email service in a new backend/services/email.py module.

---

### Auth — Password Reset

What it is:
  "Forgot your password?" flow — user enters email, receives a reset
  link, clicks it, sets a new password.

Why deferred:
  Same reason as email verification — needs email infrastructure.
  Also needs a password_reset_tokens table and expiring token logic.

How to add later:
  Add password_reset_tokens table (migration).
  Add POST /auth/forgot-password and POST /auth/reset-password endpoints.
  Reuse the email service added for email verification.

---

### Auth — Rate Limiting on Login

What it is:
  After N failed login attempts, the backend temporarily blocks
  further attempts from that IP or for that email.
  Protects against brute-force password attacks.

Why deferred:
  Requires a Redis counter per IP/email, or a third-party library
  like slowapi. Adds infrastructure complexity before core features work.
  bcrypt's slowness already makes brute force expensive.

How to add later:
  Add slowapi to requirements.txt.
  Add @limiter.limit("5/minute") decorator to POST /auth/login.

---

### Todos — Categories and Tags

What it is:
  Todos can belong to categories (Work, Personal, Shopping) or
  have multiple tags attached to them.

Why deferred:
  Requires a categories table, a tags table, and a many-to-many
  todo_tags join table. Three new migrations and significantly more
  complex queries. The core CRUD flow should work cleanly first.

How to add later:
  Add categories and tags tables (migrations).
  Add category_id foreign key to todos table (migration).
  Add todo_tags join table (migration).
  Extend TodoCreate and TodoOut Pydantic models.

---

### Todos — Due Dates

What it is:
  Each todo can have an optional due date. Overdue todos are
  highlighted in red.

Why deferred:
  The field itself is simple (add due_date TIMESTAMP NULL to todos).
  The complexity is in the frontend — sorting by due date, highlighting
  overdue items, date picker UI. Deferred to keep the UI simple for v1.

How to add later:
  Add due_date column to todos table (migration).
  Add due_date to TodoCreate, TodoUpdate, TodoOut schemas.
  Add date picker component in the frontend.

---

### Todos — Search and Filter

What it is:
  User can search todos by title, or filter by priority / completion status.

Why deferred:
  Search requires either a SQL LIKE query or full-text search.
  Filtering requires query parameters on GET /todos.
  Both are straightforward but add scope before v1 is working.

How to add later:
  Add optional query params to GET /todos:
    ?search=keyword&priority=high&is_completed=false
  Update todo_queries.py to build the WHERE clause dynamically.
  Add filter UI components in TodosPage.jsx.
  Add filter state to todosSlice (local UI state is fine for this).

---

### Todos — Pagination

What it is:
  When a user has many todos, return them in pages (20 at a time)
  instead of all at once.

Why deferred:
  A practice todo app will not have enough todos to need pagination.
  The query pattern (LIMIT / OFFSET) and the frontend (page controls)
  add complexity with no visible benefit at this scale.

How to add later:
  Add LIMIT and OFFSET to the SELECT query in todo_queries.py.
  Add page and page_size query params to GET /todos.
  Add pagination controls to TodosPage.jsx.
  Update todosSlice to store current page and total count.

---

### Observability — Logging and Error Tracking

What it is:
  Structured logs for every request. Error tracking (Sentry) to catch
  exceptions in production.

Why deferred:
  This is a local practice project. There is no production environment
  to monitor. FastAPI's default console output is sufficient.

How to add later:
  Add Python logging configuration in core/config.py.
  Add Sentry SDK and initialize in main.py.

---

## Hooks Already in Place

Some deferred features have partial hooks already in the codebase
because they sit at boundaries that are expensive to re-instrument later.

| Feature | Hook already in place | Lives in |
|---------|----------------------|----------|
| Due dates | due_date column can be added via migration | db/migrations/ |
| Search/filter | query functions in todo_queries.py are isolated | db/queries/ |
| Rate limiting | all auth routes go through routers/auth.py | routers/auth.py |
| Email service | core/ is the right place for a new email.py | core/ |

These are not half-finished features. They are clean boundaries.
When you pick up a deferred feature, you know exactly where it goes.

---

## What is NOT Deferred (v1 scope)

To be explicit about what v1 includes:

- User registration and login with bcrypt + JWT + httpOnly cookie
- Protected routes (only logged-in users reach /todos)
- Create a todo (title + priority)
- Read all todos for the current user
- Update a todo (title, priority, is_completed)
- Delete a todo
- Each user sees only their own todos

That is the complete v1. Nothing in this list is optional.

---

## Consequences

Positive:
- v1 scope is clear and achievable
- No half-built features in the codebase
- Every deferred item has a documented path to implementation
- Clean module boundaries mean adding features later is cheap

Negative:
- The app is minimal — not impressive to show to non-technical people
- Auth has no protection against brute force until rate limiting is added
- Sessions expire after 24 hours with no silent refresh
