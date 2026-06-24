# ADR-008: Architecture Diagrams

## Status
Living document — updated with each version

## Date
2026-06-24

## Purpose

This ADR is a living visual map of the system.
Unlike other ADRs which document a single decision, this one
tracks how the architecture looks at each product version.

When the architecture changes (new feature, new service, new table),
a new version section is added below the current one.
Old versions are never deleted — they are the history of how the
system grew.

How to update this ADR:
1. Copy the latest version section
2. Increment the version number
3. Update only what changed
4. Add a one-line note explaining what changed

---

## How to render these diagrams

These diagrams use Mermaid syntax.

- GitHub renders Mermaid automatically in markdown files
- VSCode: install the "Markdown Preview Mermaid Support" extension
- Cline and most AI editors understand Mermaid natively

---

## v1.0 — Initial architecture (2026-06-24)

Scope: user auth + todo CRUD.
Stack: React + Redux → FastAPI → PostgreSQL (Docker).

---

### System architecture

```mermaid
graph TD
    subgraph Frontend["Frontend — localhost:5173"]
        R[React + Redux]
        A[Axios — services/api.js]
        P[Pages: AuthPage, TodosPage]
        R --> A
        R --> P
    end

    subgraph Backend["Backend — localhost:8000 (Docker)"]
        FA[FastAPI — main.py]
        RT[Routers: auth, todos]
        CR[core: config, security]
        DB[db/queries: raw SQL]
        MD[models: Pydantic schemas]
        FA --> RT
        RT --> CR
        RT --> DB
        RT --> MD
    end

    subgraph Database["PostgreSQL — port 5432 (Docker)"]
        UT[(users table)]
        TT[(todos table)]
        AL[Alembic migrations]
        AL --> UT
        AL --> TT
    end

    A -->|"HTTP /api/v1/ + httpOnly cookie"| FA
    DB -->|psycopg2| UT
    DB -->|psycopg2| TT
```

---

### Auth flow

```mermaid
sequenceDiagram
    participant U as User (browser)
    participant F as React frontend
    participant B as FastAPI backend
    participant D as PostgreSQL

    Note over U,D: Registration
    U->>F: fills register form
    F->>B: POST /api/v1/auth/register
    B->>D: INSERT INTO users (email, hash)
    D-->>B: user created
    B-->>F: 201 Created
    F-->>U: redirect to login

    Note over U,D: Login
    U->>F: fills login form
    F->>B: POST /api/v1/auth/login
    B->>D: SELECT user WHERE email=?
    D-->>B: user row
    B->>B: bcrypt verify password
    B-->>F: 200 OK + set httpOnly cookie + {id, email}
    F->>F: Redux: isAuthenticated=true, user={id,email}
    F-->>U: redirect to /todos

    Note over U,D: Protected request
    U->>F: visits /todos
    F->>B: GET /api/v1/todos (cookie sent automatically)
    B->>B: validate JWT from cookie
    B->>D: SELECT * FROM todos WHERE user_id=?
    D-->>B: todos array
    B-->>F: 200 OK + todos[]
    F->>F: Redux: todos=[ ... ]
    F-->>U: renders todo list

    Note over U,D: Logout
    U->>F: clicks logout
    F->>B: POST /api/v1/auth/logout
    B-->>F: 200 OK + clears cookie
    F->>F: Redux: user=null, isAuthenticated=false, todos=[]
    F-->>U: redirect to /auth
```

---

### Database schema

```mermaid
erDiagram
    USERS {
        serial id PK
        varchar email UK
        varchar password_hash
        timestamp created_at
    }

    TODOS {
        serial id PK
        integer user_id FK
        varchar title
        boolean is_completed
        varchar priority
        timestamp created_at
        timestamp updated_at
    }

    USERS ||--o{ TODOS : "owns"
```

---

### Dependency direction (backend modules)

```mermaid
graph BT
    core["core/\nconfig, security, database"]
    models["models/\nPydantic schemas"]
    db["db/queries/\nraw SQL functions"]
    routers["routers/\nauth, todos"]
    main["main.py\nFastAPI entry point"]

    models --> core
    db --> core
    db --> models
    routers --> db
    routers --> models
    routers --> core
    main --> routers
```

Rule: arrows point inward only.
If you ever draw an arrow going the other way, stop and refactor.

---

### Frontend state flow

```mermaid
graph LR
    subgraph Component["React component"]
        US[useSelector]
        UD[useDispatch]
    end

    subgraph Redux["Redux store"]
        AS[authSlice\nuser, isAuthenticated]
        TS[todosSlice\ntodos, loading, error]
    end

    subgraph Thunk["Async thunk"]
        TH[createAsyncThunk]
    end

    API[services/api.js\nAxios + withCredentials]
    BE[FastAPI backend]

    US -->|reads state| AS
    US -->|reads state| TS
    UD -->|dispatch thunk| TH
    TH -->|axios call| API
    API -->|HTTP + cookie| BE
    BE -->|response| TH
    TH -->|fulfilled/rejected| TS
    TH -->|fulfilled/rejected| AS
```

---

## Changelog

| Version | Date | What changed |
|---------|------|-------------|
| v1.0 | 2026-06-24 | Initial architecture — auth + todo CRUD |

---

## How future versions will look

When a feature from ADR-005 (deferred scope) is picked up,
a new section is added here. Example:

```
## v1.1 — Added todo categories (future)

Changes from v1.0:
- New categories table added to PostgreSQL
- New todo_categories join table
- New router: routers/categories.py
- Frontend: new categoriesSlice in Redux

[updated diagrams follow]
```

The v1.0 diagrams above remain unchanged.
