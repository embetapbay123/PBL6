"""Remote targeted rollout helpers. Secrets stay in private files and subprocess input."""
import json
import copy
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path
from urllib.parse import urlparse

stage = Path(os.environ['AI_MEDIA_DEPLOY_STAGE'])
ident = os.environ['AI_MEDIA_DEPLOY_ID']
if not re.fullmatch('[a-f0-9]{32}', ident):
    raise SystemExit('Invalid deployment identifier')
runtime = json.loads((stage / 'runtime.json').read_text())
candidate = 'pbl6-demo-try-on:deploy-' + ident
base = ['docker', 'compose', '-p', 'pbl6-demo', '--env-file', 'infrastructure/.env', '-f', 'infrastructure/compose.yaml', '-f', 'infrastructure/secrets/tunnel.compose.yaml']
backup = Path.home() / 'pbl6-demo' / 'backups' / ('ai-chat-media-' + ident)
private_env = stage / 'database.env'


def run(args, **kwargs):
    return subprocess.run(args, check=True, **kwargs)


def private_json(path, data):
    path.write_text(json.dumps(data))
    path.chmod(0o600)


def database(code, values=None):
    wrapper = """import json,os,sys
from sqlalchemy import create_engine,text
from pathlib import Path
from datetime import datetime
engine=create_engine(os.environ['M4_DATABASE_URL'].replace('postgresql://','postgresql+psycopg://',1),hide_parameters=True)
x=json.load(sys.stdin)
try:
""" + '\n'.join(' ' + line for line in code.splitlines()) + "\nfinally: engine.dispose()\n"
    args = ['docker', 'run', '--rm', '-i', '--network', runtime['m4']['network'], '--env-file', str(private_env), candidate, 'python', '-c', wrapper]
    output = subprocess.check_output(args, input=json.dumps(values or {}).encode())
    return json.loads(output)


def volumes():
    worker = runtime['worker-try-on']['mounts']
    try_on = next((m['Name'] for m in worker if m['Destination'] == '/var/lib/pbl6/try-on'), None)
    if not try_on:
        raise SystemExit('Existing try-on worker storage is missing')
    existing = next((m['Name'] for m in runtime['m4']['mounts'] if m['Destination'] == '/var/lib/pbl6/try-on'), try_on)
    if existing != try_on:
        raise SystemExit('Review differing try-on volumes before rollout')
    if not re.fullmatch('[a-zA-Z0-9_.-]+', try_on):
        raise SystemExit('Unsupported try-on volume name')
    return try_on, 'pbl6_demo_ai_chat_media'


def proposed_compose():
    """Resolve YAML anchors through the existing Node parser; verify every other service."""
    try_on, ai_chat = volumes()
    path = Path('infrastructure/compose.yaml')
    before = json.loads(subprocess.check_output(base + ['config', '--format', 'json']))
    parser = subprocess.check_output(base + ['ps', '-q', 'm1']).decode().strip()
    code = r"""const yaml=require('js-yaml'),fs=require('fs');try{
const x=JSON.parse(fs.readFileSync(0,'utf8')),doc=yaml.safeLoad(x.source);
for(const name of ['m4','worker-try-on']){
 const service=JSON.parse(JSON.stringify(doc.services[name]));
 service.image='pbl6-demo-try-on:latest';
 service.volumes=['tryondata:/var/lib/pbl6/try-on'];
 if(name==='m4'){
  if(!service.environment||Array.isArray(service.environment))throw Error('environment');
  service.environment.AI_CHAT_MEDIA_ENABLED='1';
  service.environment.AI_CHAT_MEDIA_STORAGE_DIR='/var/lib/pbl6/ai-chat-media';
  service.volumes.push('aichatmedia:/var/lib/pbl6/ai-chat-media');
 }
 doc.services[name]=service;
}
doc.volumes=doc.volumes||{};
doc.volumes.tryondata={external:true,name:x.try_on};
doc.volumes.aichatmedia={external:true,name:x.ai_chat};
process.stdout.write(JSON.stringify(yaml.safeDump(doc,{lineWidth:-1,noRefs:false})));
}catch{console.error('Review AI Compose YAML before rollout');process.exitCode=1;}"""
    text = json.loads(subprocess.check_output(['docker', 'exec', '-i', parser, 'node', '-e', code], input=json.dumps({'source': path.read_text(), 'try_on': try_on, 'ai_chat': ai_chat}).encode()))
    proposal = stage / 'compose.reviewed.yaml'
    proposal.write_text(text);proposal.chmod(0o600)
    after = json.loads(subprocess.check_output(base + ['-f', str(proposal), 'config', '--format', 'json']))
    def service(config, name):
        value = copy.deepcopy(config['services'][name])
        for mount in value.get('volumes', []):
            if mount['type'] == 'volume':mount['source'] = config['volumes'][mount['source']]['name']
        if 'volumes' in value:value['volumes'].sort(key=lambda v:v['target'])
        return value
    if set(before['services']) != set(after['services']):raise SystemExit('Unexpected service declaration change')
    for name in before['services']:
        expected = service(before, name);actual = service(after, name)
        if name in ('m4', 'worker-try-on'):
            expected['image'] = 'pbl6-demo-try-on:latest'
            mounts = expected.get('volumes', [])
            if len(mounts) != 1 or mounts[0]['source'] != try_on or mounts[0]['target'] != '/var/lib/pbl6/try-on':raise SystemExit('Review existing try-on configuration mount')
            if name == 'm4':
                expected['environment'].update(AI_CHAT_MEDIA_ENABLED='1',AI_CHAT_MEDIA_STORAGE_DIR='/var/lib/pbl6/ai-chat-media')
                extra = copy.deepcopy(mounts[0]);extra.update(source=ai_chat,target='/var/lib/pbl6/ai-chat-media');mounts.append(extra);mounts.sort(key=lambda v:v['target'])
        if expected != actual:raise SystemExit('Unexpected Compose change in '+name)
    for key in set(before) | set(after):
        if key not in ('services','volumes') and before.get(key) != after.get(key):raise SystemExit('Unexpected Compose root change in '+key)
    for key in set(before.get('volumes',{})) | set(after.get('volumes',{})):
        if key not in ('tryondata','aichatmedia') and before.get('volumes',{}).get(key) != after.get('volumes',{}).get(key):raise SystemExit('Unrelated volume declaration changed')
    return text


def write_override(path, *, rollback=False):
    try_on, ai_chat = volumes()
    services = {}
    for service, data in runtime.items():
        env = dict(data['env'])
        if service == 'm4' and not rollback:
            env.update(AI_CHAT_MEDIA_ENABLED='1', AI_CHAT_MEDIA_STORAGE_DIR='/var/lib/pbl6/ai-chat-media')
        mounts = [{'type': 'volume', 'source': 'tryondata', 'target': '/var/lib/pbl6/try-on'}]
        if service == 'm4' and (not rollback or any(m['Destination'] == '/var/lib/pbl6/ai-chat-media' for m in data['mounts'])):
            mounts.append({'type': 'volume', 'source': 'aichatmedia', 'target': '/var/lib/pbl6/ai-chat-media'})
        services[service] = {'image': data['image'] if rollback else 'pbl6-demo-try-on:latest',
            'environment': {k: v.replace('$', '$$') for k, v in env.items()}, 'volumes': mounts,
            'command': data['command'], 'user': data['user'], 'restart': 'unless-stopped'}
    private_json(path, {'services': services, 'volumes': {'tryondata': {'external': True, 'name': try_on}, 'aichatmedia': {'external': True, 'name': ai_chat}}})


def restore_guard():
    path = stage / 'guard.json'
    if not path.exists():
        return
    guard = json.loads(path.read_text())
    if guard['was_paused']:
        print('Existing paused AI guard retained.')
        return
    result = database("""with engine.begin() as db:
 changed=db.execute(text("UPDATE try_on_guard SET paused=false,updated_at=now() WHERE id=1 AND paused=true AND updated_at=CAST(:at AS timestamptz) RETURNING id"),x).first()
 if changed:db.execute(text("INSERT INTO try_on_budget_audit(id,action,actor,reference) VALUES(gen_random_uuid(),'RESUME','ai-media-rollout',:ref)"),x)
 print(json.dumps({'restored':bool(changed)}))""", {'at': guard['at'], 'ref': 'ai-chat-media-' + ident})
    print('AI guard restored to its prior setting.' if result['restored'] else 'AI guard changed during rollout; its newer setting was preserved.')


action = sys.argv[1]
if action == 'review':
    proposed_compose()
    print('AI_MEDIA_COMPOSE_PREFLIGHT_OK: unrelated services and volumes unchanged.')

elif action == 'backup':
    url = urlparse(runtime['m4']['env']['M4_DATABASE_URL'])
    if url.hostname != 'postgres' or not re.fullmatch('[a-zA-Z0-9_]+', url.path.strip('/')):
        raise SystemExit('Review active AI database location')
    private_env.write_text('M4_DATABASE_URL=' + runtime['m4']['env']['M4_DATABASE_URL'] + '\n')
    private_env.chmod(0o600)
    backup.mkdir(parents=True, exist_ok=True, mode=0o700)
    if shutil.disk_usage(backup).free < 1024 * 1024 * 1024:
        raise SystemExit('Insufficient free space for verified AI backup')
    with (backup / 'm4.dump').open('wb') as out:
        run(base + ['exec', '-T', 'postgres', 'sh', '-c', 'exec pg_dump -U "${POSTGRES_USER:-postgres}" -d "$1" -Fc', 'sh', url.path.strip('/')], stdout=out)
    (backup / 'm4.dump').chmod(0o600)
    with (backup / 'm4.dump').open('rb') as data:
        run(base + ['exec', '-T', 'postgres', 'pg_restore', '--list'], stdin=data, stdout=subprocess.DEVNULL)
    for file in ('compose.yaml', 'compose.try-on.yaml'):
        if not Path('infrastructure', file).exists():continue
        target = backup / (file + '.before')
        target.write_bytes(Path('infrastructure', file).read_bytes());target.chmod(0o600)
    private_json(backup / 'runtime.before.json', runtime)
    try_on, ai_chat = volumes()
    for service, data in runtime.items():
        run(['docker', 'tag', data['image'], 'pbl6-ai-media-base-' + service + ':' + ident])
    for name, filename in ((try_on, 'try-on.tar'),):
        with (backup / filename).open('wb') as out:
            run(['docker', 'run', '--rm', '--network', 'none', '--user', '0', '--mount', 'type=volume,source=' + name + ',target=/private,readonly', candidate, 'tar', '-C', '/private', '-cf', '-', '.'], stdout=out)
        (backup / filename).chmod(0o600)
    print('M4 dump and existing private try-on volume backed up; pg_restore list verified.')

elif action == 'clone-sequence':
    result = database("""import uuid
schema='ai_media_sequence_'+uuid.uuid4().hex
with engine.begin() as db:
 source=db.execute(text('SELECT current_schema()')).scalar_one()
 if source!='public':raise ValueError('Review active chat schema')
 db.exec_driver_sql('CREATE SCHEMA '+schema)
try:
 with engine.begin() as db:
  db.exec_driver_sql('CREATE TABLE '+schema+'.chat_message(id uuid PRIMARY KEY,session_id uuid NOT NULL,created_at timestamptz NOT NULL)')
  db.exec_driver_sql('INSERT INTO '+schema+'.chat_message SELECT id,session_id,created_at FROM public.chat_message')
  before=[str(r[0]) for r in db.exec_driver_sql('SELECT id FROM '+schema+'.chat_message ORDER BY created_at,id')]
  db.exec_driver_sql('SET LOCAL search_path TO '+schema+',public')
  db.exec_driver_sql(Path('migrations/012_chat_message_sequence.sql').read_text())
  after=[str(r[0]) for r in db.execute(text('SELECT id FROM chat_message ORDER BY message_sequence'))]
  assert before==after,'Legacy chat order changed'
  print(json.dumps({'rows':len(before),'legacy_order_preserved':True}))
finally:
 with engine.begin() as db:db.exec_driver_sql('DROP SCHEMA '+schema+' CASCADE')""")
    print('Chat sequence migration on a private ID/timestamp copy: ' + json.dumps(result))

elif action == 'prepare-volumes':
    try_on, ai_chat = volumes()
    found = subprocess.run(['docker', 'volume', 'inspect', ai_chat], capture_output=True)
    if found.returncode:
        run(['docker', 'volume', 'create', '--label', 'com.pbl6.purpose=ai-chat-media', ai_chat], stdout=subprocess.DEVNULL)
    else:
        value = json.loads(found.stdout)[0]
        if value.get('Labels', {}).get('com.pbl6.purpose') != 'ai-chat-media':
            raise SystemExit('Unexpected AI chat media volume owner')
        with (backup / 'ai-chat-media.tar').open('wb') as out:
            run(['docker', 'run', '--rm', '--network', 'none', '--user', '0', '--mount', 'type=volume,source=' + ai_chat + ',target=/private,readonly', candidate, 'tar', '-C', '/private', '-cf', '-', '.'], stdout=out)
        (backup / 'ai-chat-media.tar').chmod(0o600)
    owners = []
    for row in runtime.values():
        uid = subprocess.check_output(['docker', 'exec', row['container'], 'id', '-u']).decode().strip()
        gid = subprocess.check_output(['docker', 'exec', row['container'], 'id', '-g']).decode().strip()
        if not uid.isdigit() or not gid.isdigit():
            raise SystemExit('Unsupported AI storage owner')
        owners.append((uid, gid))
    if len(set(owners)) != 1:
        raise SystemExit('M4 and its image worker need the same private storage owner')
    uid, gid = owners[0]
    private_json(stage / 'owner.json', {'uid': int(uid), 'gid': int(gid)})
    run(['docker', 'run', '--rm', '--network', 'none', '--user', '0', '--mount', 'type=volume,source=' + try_on + ',target=/try-on', '--mount', 'type=volume,source=' + ai_chat + ',target=/ai-chat', candidate, 'python', '-c',
         "import os,sys;uid,gid=map(int,sys.argv[1:]);[(os.chown(p,uid,gid),os.chmod(p,0o700)) for p in ('/try-on','/ai-chat')]", uid, gid])
    print('Existing try-on volume and separate AI-chat volume prepared for the active application owner.')

elif action == 'quiet':
    guard = database("""with engine.begin() as db:
 row=db.execute(text('SELECT paused,updated_at FROM try_on_guard WHERE id=1 FOR UPDATE')).one()
 at=row[1]
 if not row[0]:
  at=db.execute(text('UPDATE try_on_guard SET paused=true,updated_at=now() WHERE id=1 RETURNING updated_at')).scalar_one()
  db.execute(text("INSERT INTO try_on_budget_audit(id,action,actor,reference) VALUES(gen_random_uuid(),'PAUSE','ai-media-rollout',:ref)"),x)
 print(json.dumps({'was_paused':row[0],'at':at.isoformat()}))""", {'ref': 'ai-chat-media-' + ident})
    private_json(stage / 'guard.json', guard)
    for attempt in range(50):
        active = database("""with engine.connect() as db:
 print(json.dumps(db.execute(text("SELECT count(*) FROM try_on_job WHERE status='PROCESSING' AND lease_until>now()")).scalar_one()))""")
        if not active:
            break
        if attempt % 5 == 0:
            print('Waiting for existing paid image requests to finish; no new paid request is admitted.', flush=True)
        time.sleep(3)
    else:
        raise SystemExit('Existing image requests are still active; services were not interrupted')
    print('Paid admission paused briefly; existing dispatched try-on requests have drained.')

elif action == 'stop-and-sync':
    row = runtime['m4']
    exists = subprocess.check_output(['docker', 'exec', row['container'], 'python', '-c', "from pathlib import Path;print(int(Path('/var/lib/pbl6/try-on').is_dir()))"]).decode().strip() == '1'
    run(['docker', 'stop', '-t', '20', row['container']], stdout=subprocess.DEVNULL)
    (stage / 'm4.stopped').write_text('1')
    try_on, _ = volumes()
    shared = any(m.get('Name') == try_on and m['Destination'] == '/var/lib/pbl6/try-on' for m in row['mounts'])
    if shared:
        write_override(stage / 'override.json')
        run(['docker', 'tag', candidate, 'pbl6-demo-try-on:latest'])
        print('Existing shared try-on volume retained in place; no private object copy required.')
        raise SystemExit(0)
    source = backup / 'm4-try-on-ephemeral'
    source.mkdir(mode=0o700)
    if exists:
        run(['docker', 'cp', row['container'] + ':/var/lib/pbl6/try-on/.', str(source)], stdout=subprocess.DEVNULL)
    try_on, _ = volumes()
    owner = json.loads((stage / 'owner.json').read_text())
    merge = """import hashlib,json,os,re,shutil,sys
from pathlib import Path
source,target=Path('/source'),Path('/target');uid,gid=map(int,sys.argv[1:]);count=0
for path in source.iterdir():
 if path.is_symlink() or not path.is_file() or not re.fullmatch(r'[a-f0-9]{32}\\.(photo|garment|result)\\.jpg|[a-f0-9]{32}\\.receipt\\.json',path.name):raise ValueError('Review unexpected private try-on object')
 destination=target/path.name
 if destination.exists():
  if destination.is_symlink() or hashlib.sha256(destination.read_bytes()).digest()!=hashlib.sha256(path.read_bytes()).digest():raise ValueError('Private object conflict; neither version was overwritten')
 else:
  with path.open('rb') as src,destination.open('xb') as out:shutil.copyfileobj(src,out)
  os.chmod(destination,0o600);os.chown(destination,uid,gid);count+=1
print(json.dumps({'private_objects_preserved':count}))"""
    output = subprocess.check_output(['docker', 'run', '--rm', '--network', 'none', '--user', '0', '--mount', 'type=bind,source=' + str(source) + ',target=/source,readonly', '--mount', 'type=volume,source=' + try_on + ',target=/target', candidate, 'python', '-c', merge, str(owner['uid']), str(owner['gid'])])
    print('M4 ephemeral try-on files reconciled into the worker volume: ' + output.decode().strip())
    write_override(stage / 'override.json')
    run(['docker', 'tag', candidate, 'pbl6-demo-try-on:latest'])

elif action == 'verify':
    try_on, ai_chat = volumes()
    for service, before in runtime.items():
        running = subprocess.check_output(base + ['-f', str(stage / 'override.json'), 'ps', '-q', service]).decode().strip()
        data = json.loads(subprocess.check_output(['docker', 'inspect', running]))[0]
        candidate_id = subprocess.check_output(['docker','image','inspect','--format','{{.Id}}',candidate]).decode().strip()
        if data['Image'] != candidate_id:raise SystemExit('Candidate image verification failed in '+service)
        env = dict(v.split('=', 1) for v in data['Config']['Env'])
        expected = dict(before['env'])
        if service == 'm4':
            expected.update(AI_CHAT_MEDIA_ENABLED='1', AI_CHAT_MEDIA_STORAGE_DIR='/var/lib/pbl6/ai-chat-media')
        if env != expected:
            raise SystemExit('Unexpected runtime environment change in ' + service)
        expected_mounts = {'/var/lib/pbl6/try-on': try_on}
        if service == 'm4':
            expected_mounts['/var/lib/pbl6/ai-chat-media'] = ai_chat
        actual = {m['Destination']: m.get('Name') for m in data['Mounts']}
        if actual != expected_mounts or not data['State']['Running']:
            raise SystemExit('Private storage/runtime verification failed for ' + service)
        run(['docker', 'exec', running, 'python', '-c', "from app.try_on.config import MODEL,Settings;assert MODEL=='gpt-image-2.6-sunburst';s=Settings.load();assert s.daily_budget==1000000 and s.monthly_budget==10000000;from app.try_on.repository import Repository;assert 'shared_spend' in Repository.stats.__code__.co_names"])
    print('M4 and try-on worker verified: shared monetary guard, original credentials/model/limits, correct persistent storage.')

elif action == 'persist':
    source = proposed_compose()
    path = Path('infrastructure/compose.yaml')
    path.write_text(source);path.chmod(0o600)
    for name in ('app', 'tests', 'migrations'):
        shutil.copytree(stage / 'backend/ai-service' / name, Path('backend/ai-service') / name, dirs_exist_ok=True)
    shutil.copyfile(stage / 'backend/ai-service/Dockerfile', 'backend/ai-service/Dockerfile')
    for name in ('endpoint-status.json', 'openapi.json'):
        shutil.copyfile(stage / 'docs/contracts' / name, Path('docs/contracts') / name)
    print('Targeted M4 source and persistent private mounts saved; other service definitions retained.')

elif action == 'restore-guard':
    restore_guard()

elif action == 'rollback':
    if private_env.exists() and not runtime['m4'].get('finance_shared'):
        try:
            protected = database("""with engine.begin() as db:
 exists=db.execute(text("SELECT to_regclass('paid_ai_call') IS NOT NULL")).scalar_one()
 count=db.execute(text("SELECT count(*) FROM paid_ai_call WHERE cost_state<>'RELEASED'")).scalar_one() if exists else 0
 if count:
  db.execute(text('UPDATE try_on_guard SET paused=true,updated_at=now() WHERE id=1'))
  db.execute(text("INSERT INTO try_on_budget_audit(id,action,actor,reference) VALUES(gen_random_uuid(),'PAUSE','ai-media-rollout',:ref)"),x)
 print(json.dumps({'kept_paused':bool(count)}))""", {'ref': 'rollback-media-cost-guard-' + ident})
            if protected['kept_paused']:
                print('Shared money guard kept paused because paid media calls exist; legacy code may not admit more paid requests.')
        except Exception:
            raise SystemExit('Cannot establish safe monetary state; review rollback before restoring legacy payment admission')
    if (backup / 'compose.yaml.before').exists():
        Path('infrastructure/compose.yaml').write_bytes((backup / 'compose.yaml.before').read_bytes())
        Path('infrastructure/compose.yaml').chmod(0o600)
    if (stage / 'm4.stopped').exists():
        write_override(stage / 'rollback.json', rollback=True)
        run(base + ['-f', str(stage / 'rollback.json'), 'up', '-d', '--no-deps', '--no-build', '--pull', 'never', 'm4', 'worker-try-on'])
    restore_guard()
    print('Previous application runtime restored; additive schema, backups and private data retained.')
else:
    raise SystemExit('Unknown AI rollout stage')
