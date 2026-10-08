"""Use an ephemeral schema only, never write the serving/public schema."""
import os,uuid
from pathlib import Path
from contextlib import contextmanager
from sqlalchemy import create_engine,text

@contextmanager
def database():
    url=os.environ['M4_DATABASE_URL'].replace('postgresql://','postgresql+psycopg://',1)
    root=create_engine(url);schema='eval_'+uuid.uuid4().hex;scoped=None;created=False
    try:
        with root.begin() as db:
            db.execute(text('CREATE SCHEMA '+schema))
            db.execute(text('SET LOCAL search_path TO '+schema+',public'))
            for file in sorted((Path(__file__).resolve().parents[2]/'migrations').glob('*.sql')):db.exec_driver_sql(file.read_text())
        created=True
        scoped=create_engine(url,connect_args={'options':'-csearch_path='+schema+',public'})
        yield scoped
    finally:
        if scoped:scoped.dispose()
        if created:
            with root.begin() as db:db.execute(text('DROP SCHEMA '+schema+' CASCADE'))
        root.dispose()
