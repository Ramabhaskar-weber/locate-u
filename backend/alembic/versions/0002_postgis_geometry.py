"""PostGIS geography column + GiST index for places (PostgreSQL only)

On SQLite (tests / quick local dev) this migration is a no-op and the app
falls back to a bounding-box + haversine nearest-place query.

Revision ID: 0002
Revises: 0001
"""
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    op.execute("ALTER TABLE places ADD COLUMN IF NOT EXISTS geom geography(Point, 4326)")
    op.execute("UPDATE places SET geom = ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography WHERE geom IS NULL")
    op.execute("CREATE INDEX IF NOT EXISTS ix_places_geom ON places USING GIST (geom)")
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    op.execute("CREATE INDEX IF NOT EXISTS ix_places_name_trgm ON places USING GIN (name_norm gin_trgm_ops)")


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return
    op.execute("DROP INDEX IF EXISTS ix_places_name_trgm")
    op.execute("DROP INDEX IF EXISTS ix_places_geom")
    op.execute("ALTER TABLE places DROP COLUMN IF EXISTS geom")
