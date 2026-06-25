from typing import Dict, Any, List, Optional
from datetime import datetime


def _row_to_dict(row: tuple, cur) -> Dict[str, Any]:
    """Converts a psycopg2 row (tuple) to a dictionary."""
    if row is None:
        return None
    columns = [col.name for col in cur.description]
    return dict(zip(columns, row))


def get_todos_by_user(cur, user_id: int) -> List[Dict[str, Any]]:
    """
    ORM equivalent:
    session.query(Todo).filter(Todo.user_id == user_id).all()
    """
    cur.execute(
        "SELECT id, user_id, title, is_completed, priority, created_at, updated_at FROM todos WHERE user_id = %s ORDER BY created_at DESC",
        (user_id,)
    )
    return [_row_to_dict(row, cur) for row in cur.fetchall()]


def get_todo_by_id(cur, todo_id: int, user_id: int) -> Optional[Dict[str, Any]]:
    """
    ORM equivalent:
    session.query(Todo).filter(Todo.id == todo_id, Todo.user_id == user_id).first()
    """
    cur.execute(
        "SELECT id, user_id, title, is_completed, priority, created_at, updated_at FROM todos WHERE id = %s AND user_id = %s",
        (todo_id, user_id)
    )
    return _row_to_dict(cur.fetchone(), cur)


def create_todo(cur, user_id: int, title: str, priority: str) -> Dict[str, Any]:
    """
    ORM equivalent:
    new_todo = Todo(user_id=user_id, title=title, priority=priority)
    session.add(new_todo)
    session.commit()
    session.refresh(new_todo)
    """
    cur.execute(
        "INSERT INTO todos (user_id, title, priority) VALUES (%s, %s, %s) RETURNING id, user_id, title, is_completed, priority, created_at, updated_at",
        (user_id, title, priority)
    )
    return _row_to_dict(cur.fetchone(), cur)


def update_todo(cur, todo_id: int, user_id: int, **kwargs) -> Optional[Dict[str, Any]]:
    """
    ORM equivalent:
    todo = session.query(Todo).filter(Todo.id == todo_id, Todo.user_id == user_id).first()
    if todo:
        for key, value in kwargs.items():
            setattr(todo, key, value)
        todo.updated_at = datetime.utcnow()
        session.commit()
        session.refresh(todo)
    """
    if not kwargs:
        return get_todo_by_id(cur, todo_id, user_id)

    set_clauses = []
    values = []
    for key, value in kwargs.items():
        if key in ["title", "is_completed", "priority"]:
            set_clauses.append(f"{key} = %s")
            values.append(value)

    if not set_clauses:
        return get_todo_by_id(cur, todo_id, user_id)

    values.append(datetime.utcnow())
    set_clauses.append("updated_at = %s")

    values.append(todo_id)
    values.append(user_id)

    query = f"UPDATE todos SET {', '.join(set_clauses)} WHERE id = %s AND user_id = %s RETURNING id, user_id, title, is_completed, priority, created_at, updated_at"
    cur.execute(query, tuple(values))
    return _row_to_dict(cur.fetchone(), cur)


def delete_todo(cur, todo_id: int, user_id: int) -> bool:
    """
    ORM equivalent:
    todo = session.query(Todo).filter(Todo.id == todo_id, Todo.user_id == user_id).first()
    if todo:
        session.delete(todo)
        session.commit()
        return True
    return False
    """
    cur.execute(
        "DELETE FROM todos WHERE id = %s AND user_id = %s RETURNING id", (todo_id, user_id))
    return cur.fetchone() is not None
