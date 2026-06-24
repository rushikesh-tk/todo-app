# ADR-002: Database and Migration Strategy

## Status
Accepted

## Date
2026-06-24

## Context

The todo app needs to persist two things: users and todos.
We need to decide:
1. Which database to use
2. How to talk to it from Python (raw SQL vs ORM)
3. How to manage changes to the database structure over time (migrations)

---

## Decision 1: PostgreSQL as the database

### Options considered

**SQLite**
- File-based, zero setup
- Good for throwaway scripts
- Con: not what real applications use, teaches nothing about running a DB server

**PostgreSQL (our choice)**
- Industry standard for relational data
- What you will use in every real job
- Runs in Docker with one command — no installation needed

```bash
# Start PostgreSQL locally
docker run --name todo-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=todoapp \
  -p 5432:5432 \
  -d postgres
```

**MongoDB**
- Document database, no tables or rows
- Rejected: FastAPI's ecosystem is naturally relational,
  and todos/users are clearly relational data (a todo belongs to a user)

---

## Decision 2: Raw SQL with ORM equivalents in comments

### What this means

Every database query in this project is written in two ways,
side by side in the same file:

```python
# ORM equivalent: db.query(Todo).filter(Todo.user_id == user_id).all()
cursor.execute("SELECT * FROM todos WHERE user_id = %s", (user_id,))
todos = cursor.fetchall()
```

The raw SQL runs. The ORM version sits in the comment above it.

### Why raw SQL

The developer has limited experience with database queries.
Writing raw SQL makes the query visible and readable — you see
exactly what is being sent to the database.

SQLAlchemy (ORM) hides the SQL from you:
  `db.query(Todo).all()` → generates → `SELECT * FROM todos`

This is convenient once you understand what's happening.
It is confusing when you don't, because errors are harder to read
and you can't tell what query is actually running.

### Why ORM equivalents in comments

Once the raw SQL makes sense, the ORM version will too.
The comment shows you: "this is what a library would write for you."
Over time you build a mental map between Python ORM syntax and SQL.

### Where queries live

All SQL lives in `backend/db/queries/`:
  - `user_queries.py` — all SQL touching the users table
  - `todo_queries.py` — all SQL touching the todos table

Routers never write SQL directly. They call functions from db/queries/.

```python
# routers/todos.py — correct
from db.queries.todo_queries import get_todos_by_user

# routers/todos.py — WRONG, never do this
cursor.execute("SELECT * FROM todos ...")
```

---

## Decision 3: Alembic for migrations

### What a migration is

A migration is a small file that describes one change to your
database structure. Examples:
  - "Add the todos table"
  - "Add a priority column to todos"
  - "Add an index on todos.user_id"

Alembic keeps a history of every migration ever run, like git
keeps a history of every code change. When you want to change
the database structure, you write a new migration instead of
manually editing the table.

### Why not just run CREATE TABLE manually

If you run CREATE TABLE manually:
  - You have to drop and recreate tables when structure changes
  - You lose all existing data when you do that
  - There is no record of what changed or when
  - Other developers (or future you) can't reproduce your database

With Alembic:
  - Schema changes are versioned files in db/migrations/versions/
  - `alembic upgrade head` brings any database up to date
  - Data is never lost on a schema change
  - The migration history is committed to git alongside the code

### Migration folder structure

```
backend/db/migrations/
  env.py                         # Alembic configuration
  versions/
    0001_create_users_table.py   # first migration
    0002_create_todos_table.py   # second migration
```

---

## Database Schema

### users table

```sql
CREATE TABLE users (
    id          SERIAL PRIMARY KEY,
    email       VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW()
);
```

### todos table

```sql
CREATE TABLE todos (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title        VARCHAR(500) NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    priority     VARCHAR(10) DEFAULT 'medium'
                 CHECK (priority IN ('low', 'medium', 'high')),
    created_at   TIMESTAMP DEFAULT NOW(),
    updated_at   TIMESTAMP DEFAULT NOW()
);
```

### Why these fields

- `user_id` with `ON DELETE CASCADE`: if a user is deleted,
  all their todos are automatically deleted too. No orphaned rows.
- `priority` with `CHECK`: the database itself rejects any value
  other than low/medium/high. Validation at the source.
- `updated_at`: lets the frontend sort by "recently modified"
  without extra logic.

---

## Pydantic Models (backend/models/)

These are Python schemas that validate data coming in and going out
of the API. They are separate from the database tables.

```python
# models/todo.py

class TodoCreate(BaseModel):       # what the frontend sends to create a todo
    title: str
    priority: str = "medium"

class TodoUpdate(BaseModel):       # what the frontend sends to update a todo
    title: str | None = None
    is_completed: bool | None = None
    priority: str | None = None

class TodoOut(BaseModel):          # what the API sends back to the frontend
    id: int
    title: str
    is_completed: bool
    priority: str
    created_at: datetime
    updated_at: datetime
```

Note: `password_hash` never appears in any `Out` schema.
Passwords go in, they never come back out.

---

## When to Revisit

Revisit this ADR if:
- A third table is needed (e.g. tags, categories)
- The priority field needs more values than low/medium/high
- Performance issues appear that require query optimization
  (at that point, understanding the raw SQL becomes even more valuable)

---

## Consequences

Positive:
- Every query is visible and readable — no ORM magic hiding what runs
- Side-by-side comments build understanding of both approaches
- Alembic means schema changes never destroy data
- CHECK constraint on priority means invalid values are caught at DB level
- All SQL centralized in db/queries/ — routers stay clean

Negative:
- More verbose than pure ORM
- psycopg2 connection management is manual (handled in core/database.py)
- Alembic has a small learning curve on first setup
