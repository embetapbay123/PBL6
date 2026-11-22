"""Run AI checks on a private PostgreSQL tmpfs, with no provider keys or public ports."""
import argparse,os,re
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('stage',type=Path);parser.add_argument('image');parser.add_argument('--image-source',action='store_true');args=parser.parse_args()
if not args.stage.is_dir() or not re.fullmatch(r'(?:pbl6-ai-media-check:test-|pbl6-demo-try-on:deploy-)[a-f0-9]{32}',args.image):raise SystemExit('Review isolated AI test target')
os.environ['AI_MEDIA_CHECK_STAGE']=str(args.stage);os.environ['AI_MEDIA_CHECK_CANDIDATE']=args.image
import json,os,secrets,subprocess,time,uuid
from pathlib import Path
p=Path(os.environ['AI_MEDIA_CHECK_STAGE']);ident=uuid.uuid4().hex
base=['docker','compose','-p','pbl6-demo','--env-file','infrastructure/.env','-f','infrastructure/compose.yaml']
pg=subprocess.check_output(base+['ps','-q','postgres']).decode().strip();image=json.loads(subprocess.check_output(['docker','inspect',pg]))[0]['Image']
network='pbl6-ai-test-'+ident;container=network+'-postgres';client=network+'-client';password=secrets.token_urlsafe(32)
private=p/'test.env';private.write_text('M4_DATABASE_URL=postgresql://postgres:'+password+'@pg:5432/m4_test\nAI_CHAT_MEDIA_NATIVE_TEST=1\n');private.chmod(0o600)
pg_env=p/'postgres.env';pg_env.write_text('POSTGRES_USER=postgres\nPOSTGRES_DB=m4_test\nPOSTGRES_PASSWORD='+password+'\nPGDATA=/tmp/pbl6-pgdata\n');pg_env.chmod(0o600)
mounts=[]
if not args.image_source:
 for name in ('app','tests','migrations'):
  mounts+=['--mount','type=bind,source='+str(p/'backend/ai-service'/name)+',target=/app/'+name+',readonly']
image_env=dict(v.split('=',1) for v in json.loads(subprocess.check_output(['docker','image','inspect',args.image]))[0]['Config'].get('Env',[]))
if any(image_env.get(key) for key in ('OPENAI_API_KEY','DEEPSEEK_API_KEY','CHAT_API_KEY')):raise SystemExit('Remove baked provider credentials before running isolated tests')
created_network=False;created_container=False
try:
 subprocess.run(['docker','network','create','--internal','--label','com.pbl6.test-id='+ident,network],check=True,stdout=subprocess.DEVNULL);created_network=True
 subprocess.run(['docker','run','-d','--name',container,'--label','com.pbl6.test-id='+ident,'--network',network,'--network-alias','pg','--env-file',str(pg_env),'--tmpfs','/tmp:rw,nosuid,nodev,size=805306368','--memory','512m','--cpus','1',image,'postgres','-c','shared_buffers=32MB','-c','max_connections=30'],check=True,stdout=subprocess.DEVNULL);created_container=True
 for _ in range(30):
  if subprocess.run(['docker','exec',container,'pg_isready','-h','127.0.0.1','-U','postgres','-d','m4_test'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode==0:break
  time.sleep(1)
 else:raise ValueError('Private PostgreSQL test service did not become ready')
 # No production database, Redis, provider credentials, user storage or public ports.
 subprocess.run(['docker','run','--rm','--name',client,'--label','com.pbl6.test-id='+ident,'--network',network,'--env-file',str(private),*mounts,'--read-only','--tmpfs','/tmp:rw,nosuid,nodev,size=536870912','--memory','512m','--cpus','1','--pids-limit','128','--cap-drop','ALL','--security-opt','no-new-privileges','-e','PYTHONDONTWRITEBYTECODE=1',os.environ['AI_MEDIA_CHECK_CANDIDATE'],'python','-m','pytest','-p','no:cacheprovider','--ignore=tests/test_chat_media_native.py','-q'],check=True)
finally:
 found=subprocess.run(['docker','inspect',client],capture_output=True)
 if found.returncode==0:
  row=json.loads(found.stdout)[0]
  if row['Config']['Labels'].get('com.pbl6.test-id')!=ident:raise ValueError('Refuse unrelated test client cleanup')
  subprocess.run(['docker','rm','-f','-v',client],check=True,stdout=subprocess.DEVNULL)
 if created_container:
  row=json.loads(subprocess.check_output(['docker','inspect',container]))[0]
  if row['Config']['Labels'].get('com.pbl6.test-id')!=ident:raise ValueError('Refuse unrelated test container cleanup')
  subprocess.run(['docker','rm','-f','-v',container],check=True,stdout=subprocess.DEVNULL)
 if created_network:
  row=json.loads(subprocess.check_output(['docker','network','inspect',network]))[0]
  if row['Labels'].get('com.pbl6.test-id')!=ident:raise ValueError('Refuse unrelated test network cleanup')
  subprocess.run(['docker','network','rm',network],check=True,stdout=subprocess.DEVNULL)
