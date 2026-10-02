from pathlib import Path
from alembic import op
revision='003_schema_baseline'
down_revision='002_correlation_text'

def upgrade():
    db=op.get_bind()
    if not db.exec_driver_sql("SELECT 1 FROM schema_migration WHERE version='003_schema_baseline.sql'").first():
        db.exec_driver_sql((Path(__file__).resolve().parents[2]/'migrations/003_schema_baseline.sql').read_text())
        db.exec_driver_sql("INSERT INTO schema_migration(version) VALUES('003_schema_baseline.sql')")

def downgrade(): raise RuntimeError('Restore into an isolated database; automatic downgrade disabled.')
