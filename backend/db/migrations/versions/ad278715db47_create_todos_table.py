"""create_todos_table

Revision ID: ad278715db47
Revises: e69e24fd734d
Create Date: 2026-06-24

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'ad278715db47'
down_revision: Union[str, None] = 'e69e24fd734d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE todos (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            title VARCHAR(500) NOT NULL,
            is_completed BOOLEAN DEFAULT FALSE,
            priority VARCHAR(10) DEFAULT 'medium'
                CHECK (priority IN ('low', 'medium', 'high')),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS todos")
