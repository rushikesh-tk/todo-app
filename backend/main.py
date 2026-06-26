from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import auth, todos

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_PREFIX = "/api/v1"

app.include_router(
    auth.router, prefix=f"{API_PREFIX}/auth", tags=["Authentication"])
app.include_router(todos.router, prefix=f"{API_PREFIX}/todos", tags=["Todos"])


@app.get("/")
def health():
    return {"status": "healthy"}
