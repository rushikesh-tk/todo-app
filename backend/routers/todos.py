from fastapi import APIRouter, Depends, HTTPException, status
from models.todo import TodoCreate, TodoUpdate, TodoOut
from typing import Annotated
from core.security import get_current_user
from core.database import get_db
from db.queries.todo_queries import get_todos_by_user, create_todo, update_todo, delete_todo

router = APIRouter()


@router.get("/", response_model=list[TodoOut])
async def get_all_users_todos(user_id: Annotated[int, Depends(get_current_user)]):
    with get_db() as cursor:
        todos = get_todos_by_user(cursor, user_id)
        return todos


@router.post("/", response_model=TodoOut, status_code=status.HTTP_201_CREATED)
async def create_new_todo(todo_data: TodoCreate, user_id: Annotated[int, Depends(get_current_user)]):
    with get_db() as cursor:
        new_todo = create_todo(
            cursor, user_id, todo_data.title, todo_data.priority)
        if not new_todo:
            raise HTTPException(
                status_code=500, detail="Failed to create todo")
        return TodoOut(**new_todo)


@router.put("/{todo_id}", response_model=TodoOut)
async def update_current_todo(todo_id: int, todo_data: TodoUpdate, user_id: Annotated[int, Depends(get_current_user)]):
    with get_db() as cursor:
        if not todo_data.model_dump(exclude_none=True):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="No fields provided to update")
        updated_todo = update_todo(
            cursor, todo_id, user_id, **todo_data.model_dump(exclude_none=True))
        if not updated_todo:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Todo not found")

        return TodoOut(**updated_todo)


@router.delete("/{todo_id}")
async def delete_current_todo(todo_id: int, user_id: Annotated[int, Depends(get_current_user)]):
    with get_db() as cursor:
        is_deleted = delete_todo(cursor, todo_id, user_id)
        if not is_deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Todo not found")

        return {"message": "Todo deleted successfully"}
