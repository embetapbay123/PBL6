"""Apply M4 migrations with the same lock/version ledger as the shared Node runner."""
import os
from pathlib import Path

from sqlalchemy import create_engine, text


def main():
    engine = create_engine(os.environ['M4_DATABASE_URL'].replace('postgresql://', 'postgresql+psycopg://', 1), hide_parameters=True)
    with engine.connect() as db:
        db.execute(text('SELECT pg_advisory_lock(721602)'))
        db.commit()
        try:
            db.execute(text('CREATE TABLE IF NOT EXISTS schema_migration(version text PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now())'))
            db.commit()
            for file in sorted((Path(__file__).resolve().parents[1] / 'migrations').glob('*.sql')):
                with db.begin():
                    if db.execute(text('SELECT 1 FROM schema_migration WHERE version=:v'), {'v': file.name}).first():
                        continue
                    db.exec_driver_sql(file.read_text(encoding='utf-8'))
                    db.execute(text('INSERT INTO schema_migration(version) VALUES(:v)'), {'v': file.name})
                    print('M4: applied ' + file.name, flush=True)
        finally:
            db.execute(text('SELECT pg_advisory_unlock(721602)'))
            db.commit()
    engine.dispose()


if __name__ == '__main__':
    main()
