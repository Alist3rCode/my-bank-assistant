"""add bridge_user_uuid and bridge_access_token to users

Revision ID: 0003
Revises: 0002
Create Date: 2026-06-03

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("bridge_user_uuid", sa.String(255), nullable=True))
    op.add_column("users", sa.Column("bridge_access_token", sa.String(2048), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "bridge_access_token")
    op.drop_column("users", "bridge_user_uuid")
