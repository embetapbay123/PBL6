"""Backup owned databases or restore into a NEW isolated database for a drill.

Never overwrites a running service database. Docker credentials stay in the container.
Stop writers for deployment backups; manifests check stable before/after row hashes.
"""
from pathlib import Path
from datetime import datetime, timezone
import argparse, subprocess, re, json, hashlib
import restore_drill
ROOT=Path(__file__).resolve().parents[1]

def compose_for(runtime):
    return ['docker','compose','--project-name','pbl6','--env-file',str(runtime/'infrastructure/.env'),'-f',str(runtime/'infrastructure/compose.yaml')]

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('action',choices=['backup','restore-drill'])
    parser.add_argument('--runtime-root',type=Path,default=ROOT)
    parser.add_argument('--service',choices=['m1','m2','m3','m4'])
    parser.add_argument('--file',type=Path)
    parser.add_argument('--target',help='New database name: restore_drill_[a-z0-9_]+')
    parser.add_argument('--manifest-file',type=Path,help='Optional pointer to the completed backup manifest')
    args=parser.parse_args()
    compose=compose_for(args.runtime_root.resolve());restore_drill.COMPOSE=compose
    if args.action=='backup':
        folder=ROOT/'artifacts/backups'/datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ');folder.mkdir(parents=True)
        manifest={'folder':str(folder),'services':{},'limit':'Per-database dump checked against stable before/after metadata and row hashes; not a coordinated cross-service snapshot'}
        for service in ([args.service] if args.service else ['m1','m2','m3','m4']):
            before=restore_drill.snapshot(service);file=folder/f'{service}.dump'
            with file.open('wb') as out:
                subprocess.run(compose+['exec','-T','postgres','pg_dump','-U','postgres','-d',service,'-Fc','--no-owner','--no-acl'],stdout=out,check=True)
            if before!=restore_drill.snapshot(service):
                raise SystemExit('Source changed during backup; stop writers and retry. Incomplete dump retained locally.')
            manifest['services'][service]={'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'snapshot':before}
        text=json.dumps(manifest,indent=2)+'\n';(folder/'manifest.json').write_text(text,encoding='utf-8')
        if args.manifest_file:args.manifest_file.write_text(text,encoding='utf-8')
        print('Backups and manifest saved:',folder)
    else:
        if not args.file or not args.file.is_file() or not args.target or not re.fullmatch(r'restore_drill_[a-z0-9_]{1,40}',args.target):
            parser.error('Existing --file and a NEW --target restore_drill_... are required')
        # createdb fails if target exists: no --clean, drop, or overwrite.
        subprocess.run(compose+['exec','-T','postgres','createdb','-U','postgres',args.target],check=True)
        with args.file.open('rb') as data:
            subprocess.run(compose+['exec','-T','postgres','pg_restore','-U','postgres','-d',args.target,'--no-owner','--no-acl','--exit-on-error'],stdin=data,check=True)
        print('Restored into isolated database:',args.target)

if __name__=='__main__':main()
