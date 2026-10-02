from pathlib import Path
from alembic import op
revision='002_correlation_text'
down_revision='001_baseline'
def upgrade():
    db=op.get_bind()
    if not db.exec_driver_sql("SELECT 1 FROM schema_migration WHERE version='002_correlation_text.sql'").first():
        db.exec_driver_sql((Path(__file__).resolve().parents[2]/'migrations/002_correlation_text.sql').read_text())
        db.exec_driver_sql("INSERT INTO schema_migration(version) VALUES('002_correlation_text.sql')")
def downgrade(): raise RuntimeError('Restore into an isolated database; automatic downgrade disabled.')
