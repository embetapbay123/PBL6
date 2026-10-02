"""Same SQL migration ledger as the common bootstrap migrator; avoid applying twice."""
from pathlib import Path
from alembic import op
revision='001_baseline'
down_revision=None
def upgrade():
    db=op.get_bind()
    db.exec_driver_sql('CREATE TABLE IF NOT EXISTS schema_migration(version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())')
    if not db.exec_driver_sql("SELECT 1 FROM schema_migration WHERE version='001_initial.sql'").first():
        db.exec_driver_sql((Path(__file__).resolve().parents[2]/'migrations/001_initial.sql').read_text())
        db.exec_driver_sql("INSERT INTO schema_migration(version) VALUES('001_initial.sql')")
def downgrade(): raise RuntimeError('Restore into an isolated database; no destructive automatic downgrade.')
