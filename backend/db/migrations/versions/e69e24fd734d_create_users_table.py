"""create_users_table

Revision ID: e69e24fd734d
Revises: 
Create Date: 2026-06-24

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'e69e24fd734d'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        )
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS users")
