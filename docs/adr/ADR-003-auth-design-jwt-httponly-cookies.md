# ADR-003: Authentication Design — JWT + httpOnly Cookies

## Status
Accepted

## Date
2026-06-24

## Context

The todo app has users. Each user should only see their own todos.
This means the app needs to know who is making each request.

Authentication answers the question: "who are you?"
Authorization answers the question: "are you allowed to do this?"

This ADR covers both — how users prove their identity (auth)
and how the backend enforces that users only touch their own data (authorization).

---

## The Core Problem: Where to Store the Token

When a user logs in, the backend creates a JWT token — a signed string
that proves "this person is logged in." This token needs to live somewhere
in the browser so it can be sent with every future request.

Two options were evaluated.

### Option A: localStorage

```javascript
localStorage.setItem('token', 'eyJ...')
// Then manually attach it to every request:
headers: { Authorization: `Bearer ${token}` }
```

Pros:
- Simple to implement
- Easy to read and send manually

Cons:
- Any JavaScript running on the page can read localStorage
- If a hacker injects malicious JS into the page (XSS attack),
  they can steal the token and use it to act as that user
- The hacker now has the token and can make requests as the real user
  until the token expires

### Option B: httpOnly Cookie (our choice)

The backend sends the JWT inside a cookie with the `httpOnly` flag set.

```python
response.set_cookie(
    key="access_token",
    value=token,
    httponly=True,        # JavaScript cannot read this cookie
    secure=True,          # only sent over HTTPS
    samesite="lax"        # protects against CSRF
)
```

Pros:
- JavaScript cannot read httpOnly cookies — not even your own code
- If a hacker injects malicious JS, they cannot steal the token
- The browser sends the cookie automatically with every request
  — no manual header attachment needed

Cons:
- Slightly more backend setup (CORS must allow credentials)
- Axios must be configured with `withCredentials: true`
- Logout requires the backend to clear the cookie, not just the frontend

### Why we chose httpOnly cookie

We chose httpOnly cookies because localStorage is vulnerable to XSS attacks.
A stolen JWT token lets a hacker act as the real user until the token expires.
The httpOnly flag makes the token invisible to JavaScript entirely —
there is nothing to steal even if malicious code runs on the page.

In the developer's own words:
  "We are using httpOnly because it is not vulnerable to any JS injection.
   With localStorage, a hacker can take the JWT token and use it as if
   they are the real user."

---

## Auth Flow (step by step)

### Step 1: Register
```
Frontend sends:  POST /auth/register  { email, password }
Backend does:
  1. Check email does not already exist in DB
  2. Hash the password with bcrypt (never store plain text)
  3. Insert new user into users table
  4. Return 201 Created
Frontend does:   Redirect to login page
```

### Step 2: Login
```
Frontend sends:  POST /auth/login  { email, password }
Backend does:
  1. Look up user by email in DB
  2. Verify password against stored hash using bcrypt
  3. If valid: create JWT token containing { user_id, exp (expiry) }
  4. Set token as httpOnly cookie in the response
  5. Return 200 OK with user info (id, email) — NOT the token
Frontend does:
  - Store user info in Redux auth slice
  - Redirect to /todos
```

### Step 3: Authenticated request
```
Frontend sends:  GET /todos
  (browser automatically sends the httpOnly cookie)
Backend does:
  1. Read the cookie from the request
  2. Decode and validate the JWT
  3. Extract user_id from the token
  4. Fetch only todos WHERE user_id = that id
  5. Return todos
Frontend does:   Render the todos list
```

### Step 4: Logout
```
Frontend sends:  POST /auth/logout
Backend does:    Clear the httpOnly cookie (set it with max_age=0)
Frontend does:
  - Clear Redux auth slice (user = null, isAuthenticated = false)
  - Clear Redux todos slice
  - Redirect to /auth
```

---

## Password Hashing

Passwords are never stored in plain text. Ever.

bcrypt is used to hash passwords before storing them:

```python
# core/security.py

from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)
```

bcrypt is slow by design. This makes brute-force attacks expensive.
Even if the database is stolen, attackers cannot easily reverse the hashes.

---

## JWT Token Design

```python
# core/security.py

import jwt
from datetime import datetime, timedelta

SECRET_KEY = settings.secret_key     # from .env, never hardcoded
ALGORITHM = "HS256"
EXPIRE_MINUTES = 60 * 24             # 24 hours

def create_token(user_id: int) -> str:
    payload = {
        "sub": str(user_id),
        "exp": datetime.utcnow() + timedelta(minutes=EXPIRE_MINUTES)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> int:
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    return int(payload["sub"])        # returns user_id
```

The token contains only `user_id` and `exp` (expiry time).
It does not contain the password, email, or any sensitive data.

---

## Protected Route Pattern (backend)

Every route that requires login uses a FastAPI dependency:

```python
# core/security.py

def get_current_user(request: Request, db=Depends(get_db)):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_id = decode_token(token)
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# routers/todos.py — how it is used
@router.get("/todos")
def list_todos(current_user=Depends(get_current_user), db=Depends(get_db)):
    return get_todos_by_user(db, current_user.id)
```

`Depends(get_current_user)` means: before this route runs,
validate the token and get the user. If the token is missing
or invalid, return 401 immediately. The route body never runs.

---

## CORS Configuration

### What is CORS and why does it exist

The browser has a built-in security rule:

  "A webpage can only talk to the same address it came from."

Your frontend runs on localhost:5173 (Vite's port).
Your backend runs on localhost:8000 (FastAPI's port).

Even though both run on your own machine, the browser sees them as
different addresses because the port numbers differ. By default,
the browser will BLOCK the frontend from talking to the backend.

Without CORS configured:
  Frontend (5173) → request → Backend (8000)
  Browser: "BLOCKED. Different port. I won't allow this."

With CORS configured:
  Frontend (5173) → request → Backend (8000)
  Backend: "I allow localhost:5173, here's the response"
  Browser: "Okay, passing it through."

### Why credentials make CORS stricter

Normal CORS just allows requests to go through.
But cookies are extra sensitive — the browser won't send cookies
cross-origin unless BOTH sides explicitly say it's okay:

  - Backend must set: allow_credentials=True
  - Frontend must set: withCredentials: true on Axios

If either one is missing, the httpOnly cookie is never sent with
requests, and every /todos call looks like the user is logged out.

### One critical rule

When allow_credentials=True, you CANNOT use allow_origins=["*"] (wildcard).
You must list the exact origin. This is a browser security requirement.

  WRONG:  allow_origins=["*"]          # browser will block credentialed requests
  RIGHT:  allow_origins=["http://localhost:5173"]   # exact origin required

### The code

```python
# main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # exact frontend origin, no wildcard
    allow_credentials=True,                   # allows cookies to be sent
    allow_methods=["*"],                      # allows GET, POST, PUT, DELETE
    allow_headers=["*"],                      # allows Content-Type, Authorization
)
```

And on the frontend, Axios must send credentials with every request:

```javascript
// services/api.js
import axios from 'axios'

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true,   // tells browser to include the httpOnly cookie
})

export default api
```

All API calls in the project go through this single Axios instance.
Never create a second axios instance without withCredentials: true —
the cookie will not be sent and the user will appear logged out.

---

## Redux Auth Slice (what lives in frontend state)

```javascript
// features/auth/authSlice.js
initialState: {
    user: null,           // { id, email } — set on login, cleared on logout
    isAuthenticated: false,
    loading: false,
    error: null
}
```

The JWT token itself is never in Redux — it lives only in the
httpOnly cookie managed by the browser. Redux only holds
the user info returned by the backend after login.

---

## Deferred

- Refresh tokens (extending sessions without re-login) — deferred
- Email verification on registration — deferred
- Password reset flow — deferred
- Rate limiting on /auth/login (brute force protection) — deferred

These are documented in ADR-005 (Deferred Scope).

---

## When to Revisit

Revisit this ADR if:
- Token expiry of 24 hours causes UX problems (add refresh tokens)
- The app moves to HTTPS in production (secure=True is already set)
- Multiple devices need independent session management

---

## Consequences

Positive:
- JWT token is invisible to JavaScript — XSS cannot steal it
- Browser sends the cookie automatically — no manual token management
- Backend dependency pattern means protected routes are one line
- Password never stored or returned in plain text

Negative:
- Logout requires a backend call (cannot just delete from localStorage)
- CORS setup is required and must be correct or cookies won't send
- `withCredentials: true` must be set on every Axios instance
- httpOnly cookies do not work on different domains without extra setup
  (not a concern for this project — both run on localhost)
