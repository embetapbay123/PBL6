"""Restore existing backups into NEW databases; verify schema, counts and invariants.

Retains drill databases for inspection. Dumps/results stay in ignored artifacts.
"""
import argparse,subprocess,json,hashlib,re
from pathlib import Path
from datetime import datetime,timezone
ROOT=Path(__file__).resolve().parents[1]
COMPOSE=['docker','compose','--env-file',str(ROOT/'infrastructure/.env'),'-f',str(ROOT/'infrastructure/compose.yaml')]

def query(database,sql):
    return subprocess.check_output(COMPOSE+['exec','-T','postgres','psql','-XAtq','-v','ON_ERROR_STOP=1','-U','postgres','-d',database,'-c',sql],text=True).strip()

def snapshot(database):
    tables=query(database,"SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename").splitlines()
    if not tables or any(not re.fullmatch('[a-z0-9_]+',t) for t in tables):raise RuntimeError('Unexpected table inventory')
    counts=json.loads(query(database,'SELECT json_build_object('+','.join("'"+t+"',(SELECT count(*) FROM \""+t+'\")' for t in tables)+')'))
    schema=query(database,"SELECT md5(string_agg(table_name||':'||column_name||':'||udt_name||':'||is_nullable||':'||coalesce(column_default,''),',' ORDER BY table_name,ordinal_position)) FROM information_schema.columns WHERE table_schema='public'")
    constraints=query(database,"SELECT coalesce(c.conrelid::regclass::text,'')||':'||c.conname||':'||pg_get_constraintdef(c.oid) FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='public' ORDER BY 1")
    constraints=hashlib.sha256('\n'.join(sorted(normalize_constraint(c) for c in constraints.splitlines())).encode()).hexdigest()
    versions=query(database,'SELECT version FROM schema_migration ORDER BY version').splitlines()
    return {'counts':counts,'columns_hash':schema,'constraints_hash':constraints,'migrations':versions}

def normalize_constraint(definition):
    # pg_dump/reparse distributes an ARRAY varchar->text cast over its literal elements.
    # Normalize only that exact form; preserve names, columns, values and every other rule.
    literal=r"'(?:[^']|'')*'::character varying"
    pattern=r'\(ARRAY\[('+literal+r'(?:, '+literal+r')*)\]\)::text\[\]'
    return re.sub(pattern,lambda m:'ARRAY['+', '.join('('+v+')::text' for v in re.findall(literal,m[1]))+']',definition)

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--backup-dir',type=Path,required=True);args=parser.parse_args()
    folder=args.backup_dir.resolve()
    if not folder.is_relative_to((ROOT/'artifacts/backups').resolve()):parser.error('Use a workspace artifacts/backups directory')
    run=datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S');results={}
    output=ROOT/'artifacts/verification'/('restore-'+run+'.json');output.parent.mkdir(parents=True,exist_ok=True)
    def record():output.write_text(json.dumps({'run_id':run,'results':results,'limit':'per-database restore compared with current source metadata/counts; not a coordinated cross-service snapshot or row-content checksum'},indent=2)+'\n',encoding='utf-8')
    invariants={'m1':'SELECT count(*) FROM inventory WHERE quantity<0 OR reserved_quantity<0 OR reserved_quantity>quantity',
                'm2':'SELECT count(*) FROM payment WHERE refunded_vnd<0 OR refunded_vnd>collected_vnd OR collected_vnd<0',
                'm3':"SELECT count(*) FROM (SELECT customer_user_id FROM address WHERE is_default AND status='ACTIVE' GROUP BY customer_user_id HAVING count(*)>1) a",
                'm4':"SELECT count(*) FROM chat_session WHERE (user_id IS NULL)=(anonymous_key IS NULL)"}
    for service in ['m1','m2','m3','m4']:
        file=folder/(service+'.dump');target='restore_drill_'+service+'_'+run
        if not file.is_file():raise RuntimeError('Missing backup for '+service)
        before=snapshot(service)
        subprocess.run(['python',str(ROOT/'scripts/database_backup.py'),'restore-drill','--file',str(file),'--target',target],check=True)
        restored=snapshot(target)
        results[service]={'database':target,'backup_sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'snapshot':restored,'status':'FAIL'}
        if before!=restored:
            results[service]['source_snapshot']=before;record()
            raise RuntimeError(service+': source changed since backup or restore mismatch; retain database for investigation')
        violations=int(query(target,invariants[service]))
        if violations:
            results[service]['invariant_violations']=violations;record()
            raise RuntimeError(service+': restored invariant violations')
        results[service]={'database':target,'backup_sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'snapshot':restored,'invariant_violations':violations,'status':'PASS'}
        record()
        print(service+': isolated restore/schema/count/invariant PASS')
    print('Raw evidence:',output)

if __name__=='__main__':main()
