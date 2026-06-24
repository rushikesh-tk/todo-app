import psycopg2
from psycopg2 import pool
from contextlib import contextmanager
from .config import settings

# Initialize connection pool
# ORM equivalent: sessionmaker(bind=engine)
try:
    db_pool = psycopg2.pool.SimpleConnectionPool(
        1, 20, dsn=settings.DATABASE_URL
    )
except Exception as e:
    print(f"Error creating connection pool: {e}")
    db_pool = None


@contextmanager
def get_db():
    """
    Dependency that yields a database cursor and ensures the connection 
    is returned to the pool after use.

    ORM equivalent: 
    def get_db():
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()
    """
    conn = db_pool.getconn()
    try:
        # ORM equivalent: session.begin()
        with conn.cursor() as cursor:
            yield cursor
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        db_pool.putconn(conn)
