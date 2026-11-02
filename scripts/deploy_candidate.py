"""Deploy one clean revision to the existing demo project, preserving local secrets/data.

Default is a plan. --apply builds before maintenance, backs up all owned databases,
migrates without seed, and verifies API/worker/image/schema readiness. On failure after
maintenance starts the gateway remains stopped; never auto-roll back database state.
"""
import argparse
import hashlib
from datetime import datetime, timezone
import json
from pathlib import Path
import subprocess
import sys
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
NODE = ('m1', 'm2', 'm3', 'worker-m1', 'worker-m2', 'worker-m3', 'worker-refund', 'tools')
AI = ('m4', 'worker-m4')
APPS = tuple(s for s in NODE if s != 'tools') + AI + ('web',)
RESET_CONFIRMATION = 'pbl6:m1,m2,m3,m4'
ACTIVE_QUEUES = {'pbl6.m1.bootstrap.v1', 'pbl6.m2.bootstrap.v1',
                 'pbl6.m3.bootstrap.v1', 'pbl6.m4.tracking.v1'}
LEGACY_QUEUES = {'pbl6.m1.bootstrap', 'pbl6.m2.bootstrap'}


def check_reset_queues(output):
    """Current readers must be empty. Keep known retired queues and dead letters intact."""
    seen, retained = set(), []
    for line in output.splitlines():
        fields = line.split()
        if len(fields) != 3 or not fields[0].startswith('pbl6.'):
            continue
        name, ready, unacknowledged = fields[0], int(fields[1]), int(fields[2])
        seen.add(name)
        if ready or unacknowledged:
            if name in LEGACY_QUEUES or name.endswith('.dead'):
                retained.append({'queue': name, 'ready': ready, 'unacknowledged': unacknowledged})
            else:
                raise RuntimeError('Reset refused: pending broker work must be reconciled before reset')
    if not ACTIVE_QUEUES.issubset(seen):
        raise RuntimeError('Reset refused: current consumer queue inventory is incomplete')
    return retained


def validate_reset_request(apply, reset, confirmation):
    if confirmation and not reset:
        raise ValueError('--confirm-reset requires --reset-demo')
    if apply and reset and confirmation != RESET_CONFIRMATION:
        raise ValueError('Reset requires --confirm-reset ' + RESET_CONFIRMATION)


def reset_commands(command, backup):
    """Only four named demo DBs; require verified backup files before producing commands."""
    folder = Path(backup['folder'])
    for database in ('m1', 'm2', 'm3', 'm4'):
        file = folder / (database + '.dump')
        expected = backup.get('services', {}).get(database, {}).get('sha256')
        if not file.is_file() or hashlib.sha256(file.read_bytes()).hexdigest() != expected:
            raise RuntimeError('Reset refused: backup missing or checksum mismatch for ' + database)
    result = []
    for database in ('m1', 'm2', 'm3', 'm4'):
        result.append(('reset-drop-' + database, command + ['exec', '-T', 'postgres',
                       'dropdb', '-U', 'postgres', '--force', database]))
        result.append(('reset-create-' + database, command + ['exec', '-T', 'postgres',
                       'createdb', '-U', 'postgres', '--owner=' + database, database]))
        sql = (f'REVOKE CONNECT ON DATABASE {database} FROM PUBLIC; '
               f'GRANT CONNECT ON DATABASE {database} TO {database}; '
               'CREATE EXTENSION IF NOT EXISTS pgcrypto; CREATE EXTENSION IF NOT EXISTS vector;')
        result.append(('reset-extensions-' + database, command + ['exec', '-T', 'postgres',
                       'psql', '-Xq', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', database, '-c', sql]))
    return result


def override(source, revision, demo_login=False):
    services = {}
    for names, family, dockerfile in ((NODE, 'node', 'backend/Dockerfile'),
                                      (AI, 'ai', 'backend/ai-service/Dockerfile'),
                                      (('web',), 'web', 'frontend/Dockerfile')):
        for name in names:
            services[name] = {
                'image': f'pbl6-{family}:{revision}',
                'build': {'context': str(source), 'dockerfile': dockerfile,
                          'labels': {'org.opencontainers.image.revision': revision}},
                'labels': {'org.opencontainers.image.revision': revision},
            }
    services['m3']['environment'] = {'DEMO_LOGIN_ENABLED': '1' if demo_login else '0'}
    services['web']['build']['args'] = {'VITE_DEMO_LOGIN_ENABLED': '1' if demo_login else '0'}
    services['gateway'] = {'volumes': [
        {'type': 'bind', 'source': str(source / 'infrastructure/Caddyfile'),
         'target': '/etc/caddy/Caddyfile', 'read_only': True}]}
    return {'services': services}


def compose(runtime, overlay):
    return ['docker', 'compose', '--project-name', 'pbl6', '--project-directory',
            str(runtime / 'infrastructure'), '--env-file', str(runtime / 'infrastructure/.env'),
            '-f', str(ROOT / 'infrastructure/compose.yaml'), '-f', str(overlay)]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--runtime-root', type=Path, required=True,
                        help='Existing checkout holding infrastructure/.env and secrets')
    parser.add_argument('--gateway-url', default='http://127.0.0.1:8080')
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--demo-login', action='store_true', help='Enable quick login for the seven synthetic demo accounts only')
    parser.add_argument('--reset-demo', action='store_true',
                        help='After backup AND restore drill, recreate only m1-m4 and seed synthetic test data')
    parser.add_argument('--confirm-reset', help='Explicit target acknowledgement; see --reset-demo plan')
    args = parser.parse_args()
    try:
        validate_reset_request(args.apply, args.reset_demo, args.confirm_reset)
    except ValueError as error:
        parser.error(str(error))
    runtime = args.runtime_root.resolve()
    for file in ('infrastructure/.env', 'infrastructure/secrets/jwt-public.pem',
                 'infrastructure/secrets/jwt-private.pem'):
        if not (runtime / file).is_file():
            parser.error('Existing local configuration is required; do not generate new demo secrets')
    revision = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    dirty = subprocess.check_output(['git', 'status', '--porcelain', '--untracked-files=normal'],
                                    cwd=ROOT, text=True).strip()
    if dirty:
        parser.error('Candidate must be committed and clean (including non-ignored untracked files)')
    run = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    folder = ROOT / 'artifacts/deployments' / run
    folder.mkdir(parents=True)
    overlay = folder / 'candidate.compose.json'
    overlay.write_text(json.dumps(override(ROOT, revision, args.demo_login), indent=2), encoding='utf-8')
    command = compose(runtime, overlay)
    report = {'revision': revision, 'status': 'PLANNED', 'steps': [],
              'reset_demo': args.reset_demo, 'demo_login': args.demo_login,
              'limits': [('Explicit synthetic demo reset after backup/restore verification' if args.reset_demo else 'No seed/reset') + '; no automatic database rollback',
                         'Health/version checks do not accept provider, UI, load or AI quality',
                         'Tunnel and persistent dependencies are preserved']}
    report_file = folder / 'report.json'

    def record():
        report_file.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')

    def execute(stage, argv):
        with (folder / (stage + '.log')).open('wb') as log:
            result = subprocess.run(argv, cwd=ROOT, stdout=log, stderr=subprocess.STDOUT)
        if result.returncode:
            raise RuntimeError(stage + ' failed; inspect the private deployment log')
        report['steps'].append(stage)
        record()
        print(stage + ': PASS', flush=True)

    def capture(argv):
        # Inspect output may contain environment values; only selected fields enter the report.
        return subprocess.check_output(argv, cwd=ROOT, stderr=subprocess.DEVNULL, text=True)

    record()
    if not args.apply:
        print('Plan: validate existing project; build revision', revision,
              '; stop ingress/writers; backup; migrate; start/verify; reopen ingress.')
        print('Plan and non-secret overlay:', folder)
        if args.reset_demo:
            print('RESET PLAN: only pbl6 databases m1,m2,m3,m4; all previous records removed after verified backup/restore drill.')
            print('Seed: 7 synthetic accounts, 2 Stores, 12 products/34 variants, 17 example orders; no bank callbacks or SMTP messages.')
            print('Required acknowledgement: --confirm-reset ' + RESET_CONFIRMATION)
        return
    maintenance = False
    try:
        execute('config', command + ['config', '--quiet'])
        dependencies = {}
        for name in ('postgres', 'redis', 'rabbitmq'):
            ids = capture(command + ['ps', '-q', name]).strip().splitlines()
            if len(ids) != 1:
                raise RuntimeError('Existing demo dependency missing: ' + name)
            data = json.loads(capture(['docker', 'inspect', ids[0]]))[0]
            if not data['State']['Running'] or data['State'].get('Health', {}).get('Status') != 'healthy':
                raise RuntimeError('Demo dependency is not healthy: ' + name)
            dependencies[name] = ids[0]
        execute('build', command + ['build', 'm1', 'm4', 'web'])
        for family in ('node', 'ai', 'web'):
            data = json.loads(capture(['docker', 'image', 'inspect', f'pbl6-{family}:{revision}']))[0]
            if data['Config'].get('Labels', {}).get('org.opencontainers.image.revision') != revision:
                raise RuntimeError('Image revision mismatch before maintenance')
        maintenance = True
        execute('stop-ingress', command + ['stop', 'gateway'])
        execute('stop-writers', command + ['stop', *APPS])
        if args.reset_demo:
            # Do not silently replay pre-reset events into the new dataset, or purge shared caches.
            queues = capture(command + ['exec', '-T', 'rabbitmq', 'rabbitmqctl',
                                       'list_queues', 'name', 'messages_ready', 'messages_unacknowledged'])
            report['retained_retired_queues'] = check_reset_queues(queues)
        execute('backup', [sys.executable, str(ROOT / 'scripts/database_backup.py'), 'backup',
                          '--runtime-root', str(runtime), '--manifest-file', str(folder / 'backup.json')])
        report['backup'] = json.loads((folder / 'backup.json').read_text(encoding='utf-8'))
        execute('restore-drill', [sys.executable, str(ROOT / 'scripts/restore_drill.py'),
            '--runtime-root', str(runtime), '--backup-dir', report['backup']['folder']])
        if args.reset_demo:
            for stage, argv in reset_commands(command, report['backup']):
                execute(stage, argv)
        execute('migrate', command + ['run', '--rm', '--no-deps', 'tools',
                                     'node', 'dist/shared/src/migrate.js'])
        execute('start-apps', command + ['up', '-d', '--no-deps', *APPS])
        deadline = time.monotonic() + 120
        while True:
            try:
                for name, port in (('m1', 3101), ('m2', 3102), ('m3', 3103)):
                    capture(command + ['exec', '-T', name, 'node', '-e',
                        f"fetch('http://127.0.0.1:{port}/health/ready',{{signal:AbortSignal.timeout(2000)}}).then(r=>{{if(!r.ok)process.exit(1)}}).catch(()=>process.exit(1))"])
                capture(command + ['exec', '-T', 'm4', 'python', '-c',
                    "import urllib.request; urllib.request.urlopen('http://127.0.0.1:3104/health/ready', timeout=2)"])
                break
            except subprocess.CalledProcessError:
                if time.monotonic() >= deadline:
                    raise RuntimeError('API readiness deadline exceeded') from None
                time.sleep(2)
        versions = {}
        for name in APPS:
            ids = capture(command + ['ps', '-q', name]).strip().splitlines()
            if len(ids) != 1:
                raise RuntimeError('App container missing: ' + name)
            data = json.loads(capture(['docker', 'inspect', ids[0]]))[0]
            image = json.loads(capture(['docker', 'image', 'inspect', data['Image']]))[0]
            if (not data['State']['Running'] or data['RestartCount'] != 0 or
                    image['Config'].get('Labels', {}).get('org.opencontainers.image.revision') != revision):
                raise RuntimeError('App version/startup verification failed: ' + name)
            versions[name] = {'image_id': data['Image'], 'revision': revision, 'restart_count': 0}
        report['containers'] = versions
        for name, container_id in dependencies.items():
            if capture(command + ['ps', '-q', name]).strip() != container_id:
                raise RuntimeError('Persistent dependency was unexpectedly recreated')
        migrations = {}
        for service, directory in (('m1', 'catalog-service'), ('m2', 'commerce-service'),
                                   ('m3', 'identity-store-service'), ('m4', 'ai-service')):
            actual = capture(command + ['exec', '-T', 'postgres', 'psql', '-XAtq', '-v',
                'ON_ERROR_STOP=1', '-U', 'postgres', '-d', service, '-c',
                'SELECT version FROM schema_migration ORDER BY version']).strip().splitlines()
            expected = sorted(p.name for p in (ROOT / 'backend' / directory / 'migrations').glob('*.sql'))
            if actual != expected:
                raise RuntimeError('Migration inventory mismatch: ' + service)
            migrations[service] = actual
        report['migrations'] = migrations
        # Confirm publishers and the real tracking consumer have started, without recording events/PII.
        for name in ('worker-m1', 'worker-m2', 'worker-m3'):
            cid = capture(command + ['ps', '-q', name]).strip()
            if 'worker-ready' not in capture(['docker', 'logs', cid]):
                raise RuntimeError('Outbox worker not ready: ' + name)
        queues = capture(command + ['exec', '-T', 'rabbitmq', 'rabbitmqctl',
                                    'list_queues', 'name', 'consumers'])
        if not any(line.split() == ['pbl6.m4.tracking.v1', '1'] for line in queues.splitlines()):
            raise RuntimeError('M4 tracking consumer missing or duplicated')
        if args.reset_demo:
            execute('seed-demo', command + ['run', '--rm', '-T', '--no-deps',
                '-e', 'DEMO_SEED_ALLOWED=1',
                '-v', str(ROOT / 'scripts') + ':/seed:ro',
                '-v', str(folder) + ':/seed-output',
                'tools', 'node', '/seed/seed_marketplace_demo.cjs', '--apply',
                '--output', '/seed-output/dataset.json'])
            seed = json.loads((folder / 'dataset.json').read_text(encoding='utf-8'))
            if seed.get('status') != 'PASS' or len(seed.get('orders', [])) != 17:
                raise RuntimeError('Demo seed did not finish; ingress remains closed')
            report['seed'] = {'dataset': seed['dataset'], 'accounts': 7, 'stores': 2,
                              'products': 12, 'variants': 34, 'orders': 17,
                              'evidence': str(folder / 'dataset.json')}
        execute('open-ingress', command + ['up', '-d', '--no-deps', '--force-recreate', 'gateway'])
        deadline = time.monotonic() + 60
        while True:
            try:
                for path in ('/', '/api/v1/products?size=1'):
                    request = urllib.request.Request(args.gateway_url.rstrip('/') + path,
                                                     headers={'User-Agent': 'Mozilla/5.0 PBL6-readiness'})
                    with urllib.request.urlopen(request, timeout=5) as response:
                        if response.status != 200:
                            raise RuntimeError('Gateway readiness failed')
                break
            except (OSError, RuntimeError):
                if time.monotonic() >= deadline:
                    raise RuntimeError('Gateway readiness deadline exceeded') from None
                time.sleep(2)
        report['status'] = 'PASS'
        record()
        print('Deployment PASS. Evidence:', report_file)
    except Exception as error:
        report['status'] = 'FAIL'
        # Keep provider ingress closed after a partial migration or failed runtime check.
        if maintenance:
            subprocess.run(command + ['stop', 'gateway'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        report['failure'] = str(error) if isinstance(error, RuntimeError) else type(error).__name__
        record()
        raise SystemExit('Deployment failed; ingress remains closed if maintenance started. Evidence: ' + str(report_file)) from None


if __name__ == '__main__':
    main()
