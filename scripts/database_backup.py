"""Backup owned databases or restore into a NEW isolated database for a drill.

Never overwrites a running service database. Docker credentials stay in the container.
"""
from pathlib import Path
from datetime import datetime, timezone
import argparse, subprocess, re
root=Path(__file__).resolve().parents[1]
compose=['docker','compose','--env-file',str(root/'infrastructure/.env'),'-f',str(root/'infrastructure/compose.yaml')]
parser=argparse.ArgumentParser()
parser.add_argument('action',choices=['backup','restore-drill'])
parser.add_argument('--service',choices=['m1','m2','m3','m4'])
parser.add_argument('--file',type=Path)
parser.add_argument('--target',help='New database name: restore_drill_[a-z0-9_]+')
args=parser.parse_args()
if args.action=='backup':
    folder=root/'artifacts/backups'/datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ');folder.mkdir(parents=True)
    for service in ([args.service] if args.service else ['m1','m2','m3','m4']):
        with (folder/f'{service}.dump').open('wb') as out:
            subprocess.run(compose+['exec','-T','postgres','pg_dump','-U','postgres','-d',service,'-Fc','--no-owner','--no-acl'],stdout=out,check=True)
    print('Backups saved:',folder)
else:
    if not args.file or not args.file.is_file() or not args.target or not re.fullmatch(r'restore_drill_[a-z0-9_]{1,40}',args.target):
        parser.error('Existing --file and a NEW --target restore_drill_... are required')
    # createdb fails if target exists: no --clean, drop, or overwrite.
    subprocess.run(compose+['exec','-T','postgres','createdb','-U','postgres',args.target],check=True)
    with args.file.open('rb') as data:
        subprocess.run(compose+['exec','-T','postgres','pg_restore','-U','postgres','-d',args.target,'--no-owner','--no-acl','--exit-on-error'],stdin=data,check=True)
    print('Restored into isolated database:',args.target)
