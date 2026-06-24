# ADR-006: API Design and Endpoint Contract

## Status
Accepted

## Date
2026-06-24

## Context

The frontend and backend must agree on:
- Exact URL for every endpoint
- What the request body looks like
- What the response body looks like
- What HTTP status codes mean
- How errors are returned consistently

Without this ADR, Cline will invent its own API shape when generating
code. The frontend and backend will not match, and debugging the mismatch
is confusing and time-consuming.

This ADR is the contract between frontend and backend.
Both sides are built against this contract.

---

## Decision: Versioned API prefix

All routes are prefixed with /api/v1/

Reason: real APIs use versioning so that if the API changes
breaking in the future, old clients still work on /api/v1/
while new clients use /api/v2/. We learn the right habit now.

```
Base URL (development): http://localhost:8000/api/v1
```

---

## Auth Endpoints

### POST /api/v1/auth/register

Register a new user.

Request body:
```json
{
    "email": "user@example.com",
    "password": "secretpassword"
}
```

Success response — 201 Created:
```json
{
    "message": "User registered successfully"
}
```

Error responses:
```json
400 Bad Request
{
    "detail": "Email already registered"
}

422 Unprocessable Entity   (FastAPI automatic — invalid request body)
{
    "detail": [...]
}
```

---

### POST /api/v1/auth/login

Log in with email and password.
Sets the httpOnly cookie on success.

Request body:
```json
{
    "email": "user@example.com",
    "password": "secretpassword"
}
```

Success response — 200 OK:
```json
{
    "id": 1,
    "email": "user@example.com"
}
```

Note: the JWT token is NOT in the response body.
It is set as an httpOnly cookie by the backend automatically.
The frontend only receives the user info.

Error responses:
```json
401 Unauthorized
{
    "detail": "Invalid email or password"
}
```

---

### POST /api/v1/auth/logout

Log out the current user.
Clears the httpOnly cookie.

Request body: none

Success response — 200 OK:
```json
{
    "message": "Logged out successfully"
}
```

No error cases — logout always succeeds even if user was not logged in.

---

### GET /api/v1/auth/me

Get the currently logged in user's info.
Used by the frontend on page load to check if the user is still
logged in (cookie still valid).

Request body: none
Requires: valid httpOnly cookie

Success response — 200 OK:
```json
{
    "id": 1,
    "email": "user@example.com"
}
```

Error responses:
```json
401 Unauthorized
{
    "detail": "Not authenticated"
}
```

Why this endpoint exists:
When the user refreshes the page, Redux state is lost.
The frontend calls GET /auth/me on startup to restore the
auth state from the cookie if it is still valid.
Without this, users get logged out on every page refresh.

---

## Todo Endpoints

All todo endpoints require a valid httpOnly cookie.
If the cookie is missing or expired, all return 401.

### GET /api/v1/todos

Get all todos for the current user.

Request body: none
Requires: valid httpOnly cookie

Success response — 200 OK:
```json
[
    {
        "id": 1,
        "title": "Buy milk",
        "is_completed": false,
        "priority": "high",
        "created_at": "2026-06-24T10:00:00",
        "updated_at": "2026-06-24T10:00:00"
    },
    {
        "id": 2,
        "title": "Read a book",
        "is_completed": true,
        "priority": "low",
        "created_at": "2026-06-24T09:00:00",
        "updated_at": "2026-06-24T11:00:00"
    }
]
```

Returns empty array if user has no todos:
```json
[]
```

---

### POST /api/v1/todos

Create a new todo for the current user.

Request body:
```json
{
    "title": "Buy milk",
    "priority": "high"
}
```

Field rules:
- title: required, non-empty string, max 500 characters
- priority: optional, one of "low" / "medium" / "high", defaults to "medium"

Success response — 201 Created:
```json
{
    "id": 3,
    "title": "Buy milk",
    "is_completed": false,
    "priority": "high",
    "created_at": "2026-06-24T12:00:00",
    "updated_at": "2026-06-24T12:00:00"
}
```

Error responses:
```json
422 Unprocessable Entity   (missing title or invalid priority)
{
    "detail": [...]
}
```

---

### PUT /api/v1/todos/{todo_id}

Update an existing todo.
Only the fields provided are updated (partial update).

Request body (all fields optional, at least one required):
```json
{
    "title": "Buy oat milk",
    "is_completed": true,
    "priority": "medium"
}
```

Success response — 200 OK:
```json
{
    "id": 3,
    "title": "Buy oat milk",
    "is_completed": true,
    "priority": "medium",
    "created_at": "2026-06-24T12:00:00",
    "updated_at": "2026-06-24T13:00:00"
}
```

Error responses:
```json
404 Not Found
{
    "detail": "Todo not found"
}

403 Forbidden
{
    "detail": "Not authorized to update this todo"
}
```

Note on 403: a user cannot update another user's todo even if they
know the todo_id. The backend checks ownership before updating.

---

### DELETE /api/v1/todos/{todo_id}

Delete a todo.

Request body: none

Success response — 200 OK:
```json
{
    "message": "Todo deleted successfully"
}
```

Error responses:
```json
404 Not Found
{
    "detail": "Todo not found"
}

403 Forbidden
{
    "detail": "Not authorized to delete this todo"
}
```

---

## HTTP Status Code Reference

| Code | Meaning | When we use it |
|------|---------|----------------|
| 200 | OK | Successful GET, PUT, DELETE, logout |
| 201 | Created | Successful POST (register, create todo) |
| 400 | Bad Request | Business logic error (email already exists) |
| 401 | Unauthorized | Not logged in, token missing or expired |
| 403 | Forbidden | Logged in but not allowed (wrong user's todo) |
| 404 | Not Found | Todo does not exist |
| 422 | Unprocessable Entity | FastAPI validation error (wrong request body) |

---

## Consistent Error Response Shape

Every error in this API returns the same shape:

```json
{
    "detail": "Human readable error message here"
}
```

FastAPI uses this shape by default for HTTPException.
We follow the same shape for all custom errors so the
frontend always knows where to find the error message:

```javascript
// In every rejected thunk:
return rejectWithValue(error.response.data.detail)

// In the component:
if (error) return <p>{error}</p>
```

---

## FastAPI Router Setup

```python
# main.py

from fastapi import FastAPI
from routers import auth, todos

app = FastAPI()

# All routes are prefixed with /api/v1
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(todos.router, prefix="/api/v1/todos", tags=["todos"])
```

```python
# routers/auth.py
from fastapi import APIRouter
router = APIRouter()

@router.post("/register", status_code=201)
def register(...): ...

@router.post("/login")
def login(...): ...

@router.post("/logout")
def logout(...): ...

@router.get("/me")
def me(...): ...
```

```python
# routers/todos.py
from fastapi import APIRouter
router = APIRouter()

@router.get("/")
def list_todos(...): ...

@router.post("/", status_code=201)
def create_todo(...): ...

@router.put("/{todo_id}")
def update_todo(...): ...

@router.delete("/{todo_id}")
def delete_todo(...): ...
```

---

## Frontend Axios Calls Reference

```javascript
// services/api.js — all calls the frontend makes

// Auth
api.post('/api/v1/auth/register', { email, password })
api.post('/api/v1/auth/login', { email, password })
api.post('/api/v1/auth/logout')
api.get('/api/v1/auth/me')

// Todos
api.get('/api/v1/todos')
api.post('/api/v1/todos', { title, priority })
api.put(`/api/v1/todos/${id}`, { title, is_completed, priority })
api.delete(`/api/v1/todos/${id}`)
```

---

## When to Revisit

Revisit this ADR if:
- A new endpoint is added (document it here first, then build it)
- An existing endpoint's request or response shape changes
- A v2 of any endpoint is needed

---

## Consequences

Positive:
- Frontend and backend built against the same contract
- No guessing what a route returns — it is documented here
- Cline can generate both sides from this ADR without inventing shapes
- Consistent error shape means one error handling pattern on the frontend

Negative:
- Any change to the API requires updating this ADR first
- /api/v1/ prefix is more typing than plain /todos
  (worthwhile — this is the real-world pattern)
