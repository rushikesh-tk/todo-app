from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel


class TodoCreate(BaseModel):
    title: str
    priority: Literal["low", "medium", "high"] = "medium"


class TodoUpdate(BaseModel):
    title: Optional[str] = None
    is_completed: Optional[bool] = None
    priority: Optional[Literal["low", "medium", "high"]] = None


class TodoOut(BaseModel):
    id: int
    title: str
    is_completed: bool
    priority: Literal["low", "medium", "high"]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
