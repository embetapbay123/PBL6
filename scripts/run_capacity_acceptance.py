"""Isolated authenticated 100-client capacity run with real services and synthetic volume.

No demo config/data, public ports, bank/model calls, rate-limit bypass or forwarded-IP
spoofing. k6 gets NET_ADMIN only in its own disposable network namespace to bind 100
real source addresses. Only report.json is publishable; session/config/raw files stay local.
"""
import argparse
import hashlib
import ipaddress
import json
import os
from pathlib import Path
import secrets
import subprocess
import threading
import time
from run_cross_service_acceptance import ROOT, make_config, validate_config, source_digest


def validate_capacity(config, project):
    validate_config(config, project)
    for name, service in config['services'].items():
        if service.get('cap_add') and (name != 'load' or service['cap_add'] != ['NET_ADMIN']):
            raise ValueError('Only load may add network administration in its private namespace')
        if service.get('pid') or service.get('ipc') == 'host' or service.get('devices'):
            raise ValueError('Host namespaces and devices are forbidden')
    if config['services']['m4']['environment']['CHAT_PROVIDER'] != 'none':
        raise ValueError('Model calls are forbidden in capacity tests')


def digest():
    result = hashlib.sha256(source_digest().encode())
    for file in sorted((ROOT / 'infrastructure/load').glob('*')):
        if file.is_file(): result.update(file.name.encode() + file.read_bytes())
    result.update(Path(__file__).read_bytes())
    return result.hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--profile', choices=['quick', 'target'], default='quick')
    args = parser.parse_args()
    project = 'pbl6-acceptance-' + secrets.token_hex(6)
    folder = ROOT / 'artifacts/capacity' / project
    evidence = folder / 'evidence'
    evidence.mkdir(parents=True); evidence.chmod(0o777)
    subprocess.run(['node', '-e', "const f=require('fs'),c=require('crypto');const k=c.generateKeyPairSync('rsa',{modulusLength:2048,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}});f.writeFileSync('jwt-private.pem',k.privateKey,{mode:0o600});f.writeFileSync('jwt-public.pem',k.publicKey);"], cwd=folder, check=True)
    config = make_config(project, folder)
    services = config['services']
    source = (ROOT / 'infrastructure/load').as_posix()
    services['tools']['volumes'] += [f'{source}:/capacity:ro', f'{(folder / "jwt-private.pem").as_posix()}:/run/secrets/jwt-private.pem:ro']
    services['tools']['user'] = f"{os.getuid() if hasattr(os, 'getuid') else 1000}:{os.getgid() if hasattr(os, 'getgid') else 1000}"
    services['tools']['environment'].update({'PBL6_CAPACITY_ISOLATED': '1', 'NODE_PATH': '/app/backend/node_modules'})
    services['gateway'] = {'image': 'caddy:2.10.0-alpine', 'environment': {'SITE_ADDRESS': ':80'},
        'volumes': [f'{(ROOT / "infrastructure/Caddyfile").as_posix()}:/etc/caddy/Caddyfile:ro'], 'restart': 'no'}
    services['load'] = {'image': 'grafana/k6:0.57.0', 'user': '0:0', 'cap_add': ['NET_ADMIN'],
        'volumes': [f'{source}:/capacity:ro', f'{evidence.as_posix()}:/evidence'],
        'entrypoint': ['sh', '/capacity/capacity-entry.sh'], 'environment': {'CAPACITY_PROFILE': args.profile}, 'restart': 'no'}
    validate_capacity(config, project)
    file = folder / 'compose.private.json'
    file.write_text(json.dumps(config), encoding='utf-8'); file.chmod(0o600)
    compose = ['docker', 'compose', '--project-name', project, '-f', str(file)]
    report = {'project': project, 'profile': args.profile, 'status': 'FAIL', 'source_sha256': digest(),
        'revision': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
        'dirty': bool(subprocess.check_output(['git', 'status', '--porcelain'], cwd=ROOT, text=True).strip()),
        'workload': '50% Catalog / 20% Cart / 15% Order reads / 10% Quote / 5% COD creation workflows; each workflow may make multiple API requests; 1s think time',
        'not_run': ['Provider or RAG load', 'Actual sales/Refund', 'Web/Android rendering', 'Login hash/email throughput', 'Production Cloudflare client-IP topology', '60-minute soak'],
        'started_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}
    samples = []; observed_ips = set(); stop = threading.Event(); thread = None
    with (folder / 'runtime.private.log').open('w', encoding='utf-8') as log:
        def run(label, *argv, timeout=300):
            print(label, flush=True)
            result = subprocess.run(compose + list(argv), cwd=ROOT, stdout=log, stderr=subprocess.STDOUT, timeout=timeout)
            if result.returncode: raise RuntimeError(label + ': failed; inspect private log')

        def capture(*argv):
            return subprocess.check_output(compose + list(argv), cwd=ROOT, text=True, stderr=subprocess.DEVNULL, timeout=30).strip()

        def query(database, sql):
            return capture('exec', '-T', 'postgres', 'psql', '-XAtq', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', database, '-c', sql)

        def pending_work():
            return int(query('m2', "SELECT (SELECT count(*) FROM checkout_attempt WHERE phase NOT IN ('COMMITTED','FAILED'))+(SELECT count(*) FROM order_inventory_state WHERE command_kind IS NOT NULL)+(SELECT count(*) FROM outbox WHERE published_at IS NULL)")) + sum(int(query(db, 'SELECT count(*) FROM outbox WHERE published_at IS NULL')) for db in ('m1', 'm3'))

        def observe():
            while not stop.is_set():
                sample = {'at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}
                try:
                    ids = subprocess.check_output(['docker', 'ps', '--filter', 'label=com.docker.compose.project=' + project, '--format', '{{.ID}}'], text=True, timeout=20).splitlines()
                    data = subprocess.check_output(['docker', 'stats', '--no-stream', '--format', '{{json .}}', *ids], text=True, stderr=subprocess.DEVNULL, timeout=20)
                    sample['containers'] = [{k:row[k] for k in ('Name','CPUPerc','MemUsage')} for line in data.splitlines() for row in [json.loads(line)]]
                    sample['database'] = json.loads(query('postgres', "SELECT coalesce(json_agg(t),'[]') FROM (SELECT datname,count(*) FILTER (WHERE state='active') AS active,count(*) FILTER (WHERE wait_event_type='Lock') AS lock_waits FROM pg_stat_activity WHERE datname IN ('m1','m2','m3','m4') GROUP BY datname) t"))
                    sample['outbox'] = {db: json.loads(query(db, "SELECT json_build_object('pending',count(*),'oldest_seconds',coalesce(extract(epoch FROM now()-min(created_at)),0)) FROM outbox WHERE published_at IS NULL")) for db in ('m1','m2','m3')}
                    sample['queue'] = capture('exec', '-T', 'rabbitmq', 'rabbitmqctl', 'list_queues', 'name', 'messages_ready', 'messages_unacknowledged')
                    raw_keys = capture('exec','-T','redis','redis-cli','--scan','--pattern','rate:*:api:*')
                    observed_ips.update(ip for ip in aliases if any(':'+ip+':' in key for key in raw_keys.splitlines()))
                except (subprocess.SubprocessError, ValueError): sample['observation_error'] = True
                samples.append(sample); stop.wait(10)

        try:
            run('Build matching real service images', 'build', 'tools', 'm4', timeout=900)
            run('Start private databases and broker', 'up', '-d', '--wait', 'postgres', 'redis', 'rabbitmq')
            run('Apply actual migrations', 'run', '--rm', 'tools', 'node', 'dist/shared/src/migrate.js')
            run('Seed synthetic volume only into empty private databases', 'run', '--rm', 'tools', 'node', '/capacity/seed-capacity.cjs', timeout=300)
            run('Start real APIs, gateway and durable workers', 'up', '-d', 'm1', 'm2', 'm3', 'm4', 'inventory-fault', 'gateway', 'worker-m1', 'worker-m2', 'worker-m3', 'worker-m4')
            deadline = time.monotonic() + 90
            while True:
                try:
                    capture('exec', '-T', 'm1', 'node', '-e', "fetch('http://gateway/api/v1/products?size=1',{signal:AbortSignal.timeout(2000)}).then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))")
                    break
                except subprocess.SubprocessError:
                    if time.monotonic() > deadline: raise RuntimeError('Gateway readiness deadline exceeded')
                    time.sleep(2)
            network = json.loads(subprocess.check_output(['docker', 'network', 'inspect', project + '_default'], text=True))[0]
            subnet = ipaddress.ip_network(network['IPAM']['Config'][0]['Subnet'])
            aliases = [str(subnet.network_address + n) for n in range(100, 200)]
            allocated = {c['IPv4Address'].split('/')[0] for c in network['Containers'].values()}
            if subnet.version != 4 or subnet.num_addresses < 256 or any(a in allocated for a in aliases):
                raise RuntimeError('Private source address range is not available')
            services['load']['environment']['LOAD_IPS'] = ','.join(aliases)
            file.write_text(json.dumps(config), encoding='utf-8')
            validate_capacity(config, project)
            report['dataset'] = json.loads((evidence / 'dataset.json').read_text(encoding='utf-8'))
            report['hardware'] = subprocess.check_output(['docker','info','--format','{{.NCPU}} CPUs; {{.MemTotal}} bytes memory; {{.ServerVersion}}'],text=True).strip()
            thread = threading.Thread(target=observe); thread.start()
            print('Run authenticated 100-client workload (' + args.profile + ')', flush=True)
            load_started = time.monotonic()
            result = subprocess.run(compose + ['run', '--rm', '--no-deps', 'load'], cwd=ROOT, stdout=log, stderr=subprocess.STDOUT, timeout=1500)
            report['load_elapsed_seconds'] = round(time.monotonic() - load_started, 3)
            report['requested_duration_seconds'] = 60 if args.profile == 'quick' else 1320
            report['load_exit_code'] = result.returncode
            summary_file = evidence / 'k6-summary.json'
            if not summary_file.is_file(): raise RuntimeError('Load did not produce a summary; inspect private log')
            summary = json.loads(summary_file.read_text(encoding='utf-8'))
            report['load'] = {k:summary['metrics'][k] for k in ('http_reqs','http_req_duration','http_req_failed','checks','iterations')}
            report['failure_counts'] = {k:v.get('count',0) for k,v in summary['metrics'].items() if k.startswith('failed_')}
            report['route_duration_ms'] = {k.removeprefix('duration_'):v for k,v in summary['metrics'].items() if k.startswith('duration_')}
            report['workflow_counts'] = {k:v for k,v in summary['metrics'].items() if k in ('workflow_count','recovery_pending','business_conflicts')}
            metrics_script = "Promise.all(['m1:3101','m2:3102','m3:3103'].map(async host=>{const r=await fetch('http://'+host+'/metrics',{signal:AbortSignal.timeout(2000)});return [host,await r.text()]})).then(rows=>process.stdout.write(JSON.stringify(Object.fromEntries(rows))))"
            internal_metrics = json.loads(capture('exec','-T','m1','node','-e',metrics_script))
            report['service_http_errors'] = {service:[line for line in metrics.splitlines() if line.startswith('pbl6_http_requests_total{') and any('status="'+status+'"' in line for status in ('429','500','503'))] for service,metrics in internal_metrics.items()}
            report['raw_summary_sha256'] = hashlib.sha256(summary_file.read_bytes()).hexdigest()
            report['workflow_note'] = 'Workflow proportions are declared choices, not exact HTTP request proportions; all HTTP failures remain failures, including 409/503.'
            print('Drain durable recovery and outboxes', flush=True)
            deadline = time.monotonic() + 120
            while pending_work() and time.monotonic() < deadline: time.sleep(2)
            report['remaining_work'] = pending_work()
            report['invariants'] = {
                'inventory_bounds': int(query('m1','SELECT count(*) FROM inventory WHERE quantity<0 OR reserved_quantity<0 OR reserved_quantity>quantity')),
                'inventory_movement_conservation': int(query('m1', 'SELECT count(*) FROM inventory i JOIN capacity.inventory_start s USING(id) LEFT JOIN (SELECT inventory_id,sum(delta_quantity) dq,sum(delta_reserved) dr FROM stock_movement GROUP BY inventory_id) m ON m.inventory_id=i.id WHERE i.quantity<>s.quantity+coalesce(m.dq,0) OR i.reserved_quantity<>s.reserved_quantity+coalesce(m.dr,0)')),
                'payment_money_bounds': int(query('m2','SELECT count(*) FROM payment WHERE refunded_vnd<0 OR refunded_vnd>collected_vnd OR collectible_vnd<0 OR collectible_vnd>payable_vnd')),
                'new_order_payment_state': int(query('m2', "SELECT count(*) FROM \"order\" o LEFT JOIN capacity.history_orders h ON h.id=o.id LEFT JOIN payment p ON p.order_id=o.id WHERE h.id IS NULL AND (o.status<>'PENDING' OR p.id IS NULL OR p.method<>'COD' OR p.payable_vnd<>o.payable_vnd OR p.collected_vnd<>0 OR p.refunded_vnd<>0)")),
                'orphan_payments': int(query('m2','SELECT count(*) FROM payment p LEFT JOIN "order" o ON o.id=p.order_id WHERE o.id IS NULL')),
            }
            report['created_orders'] = int(query('m2','SELECT count(*) FROM "order" o LEFT JOIN capacity.history_orders h ON h.id=o.id WHERE h.id IS NULL'))
            # Count actual aliased IPs reaching the unchanged server limiter through Caddy.
            raw = capture('exec','-T','redis','redis-cli','--scan','--pattern','rate:*:api:*')
            observed_ips.update(ip for ip in aliases if any(':'+ip+':' in key for key in raw.splitlines()))
            report['observed_client_ips'] = len(observed_ips)
            report['source_addresses_spoofed'] = False
            if report['observed_client_ips'] != 100: raise RuntimeError('Did not observe 100 actual source addresses')
            if result.returncode or report['remaining_work'] or any(report['invariants'].values()) or not report['created_orders']:
                raise RuntimeError('Capacity thresholds or business invariants failed')
            if report['load_elapsed_seconds'] < report['requested_duration_seconds'] - 1:
                raise RuntimeError('Workload ended before the requested duration')
            if digest() != report['source_sha256']: raise RuntimeError('Source changed during capacity run')
            report['status'] = 'PASS'
        except (subprocess.SubprocessError, RuntimeError, ValueError, OSError) as error:
            report['failure'] = str(error) if isinstance(error, RuntimeError) else type(error).__name__
        finally:
            stop.set()
            if thread: thread.join(timeout=90)
            raw = evidence / 'observations.private.json'
            raw.write_text(json.dumps(samples,indent=2),encoding='utf-8')
            report['observation_samples'] = len(samples)
            report['observation_sha256'] = hashlib.sha256(raw.read_bytes()).hexdigest()
            validate_capacity(config, project)
            try:
                run('Remove only this private capacity project', 'down', '--volumes', '--remove-orphans', timeout=120)
                subprocess.run(['docker','image','rm',project+'-node:local',project+'-ai:local'],stdout=log,stderr=subprocess.STDOUT,check=False,timeout=60)
                report['cleanup'] = 'PASS'
            except (subprocess.SubprocessError, RuntimeError):
                report['cleanup'] = 'FAIL'; report['status'] = 'FAIL'
            (evidence/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(report['status'] + ': ' + str(evidence/'report.json'),flush=True)
    return 0 if report['status']=='PASS' else 1


if __name__ == '__main__': raise SystemExit(main())
