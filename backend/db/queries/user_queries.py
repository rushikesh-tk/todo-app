from typing import Dict, Any, Optional


def _row_to_dict(row: tuple, cur) -> Dict[str, Any]:
    """Converts a psycopg2 row (tuple) to a dictionary."""
    if row is None:
        return None
    columns = [col.name for col in cur.description]
    return dict(zip(columns, row))


def get_user_by_email(cur, email: str) -> Optional[Dict[str, Any]]:
    """
    ORM equivalent:
    session.query(User).filter(User.email == email).first()
    """
    cur.execute(
        "SELECT id, email, password_hash, created_at FROM users WHERE email = %s", (email,))
    return _row_to_dict(cur.fetchone(), cur)


def get_user_by_id(cur, user_id: int) -> Optional[Dict[str, Any]]:
    """
    ORM equivalent:
    session.query(User).filter(User.id == user_id).first()
    """
    cur.execute(
        "SELECT id, email, password_hash, created_at FROM users WHERE id = %s", (user_id,))
    return _row_to_dict(cur.fetchone(), cur)


def create_user(cur, email: str, password_hash: str) -> Dict[str, Any]:
    """
    ORM equivalent:
    new_user = User(email=email, password_hash=password_hash)
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    """
    cur.execute(
        "INSERT INTO users (email, password_hash) VALUES (%s, %s) RETURNING id, email, password_hash, created_at",
        (email, password_hash)
    )
    return _row_to_dict(cur.fetchone(), cur)
