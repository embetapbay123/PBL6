"""Reconcile phase 1/2 with the exact isolated CMS release, preserving Debian2 WIP."""
import argparse
import json
import shutil
import subprocess
import tempfile
from pathlib import Path

parser=argparse.ArgumentParser()
parser.add_argument('--runtime-source',type=Path,required=True)
parser.add_argument('--output',type=Path,required=True)
parser.add_argument('--scope',choices=['vouchers','chat'],default='vouchers')
args=parser.parse_args()
plan=Path(__file__).resolve().parents[1]
runtime=args.runtime_source.resolve();output=args.output.resolve()
if runtime.parent!=Path('C:/PBL6/artifacts') or output.parent!=runtime.parent or output.exists():
 raise SystemExit('Use existing CMS release and a new isolated artifacts directory')
base='6c364af';phase='4efa0a7';plan_revision='56dda4d'
subprocess.run(['git','worktree','add','--detach',str(output),base],cwd=plan,check=True)
changed=set(subprocess.check_output(['git','diff','--name-only',base],cwd=runtime,text=True).splitlines())
changed.update(subprocess.check_output(['git','ls-files','--others','--exclude-standard'],cwd=runtime,text=True).splitlines())
for name in sorted(changed):
 if not name.startswith(('backend/','frontend/','docs/contracts/','scripts/deploy-demo-web','infrastructure/Caddyfile')) and name not in ('.dockerignore','.gitignore'):continue
 source=runtime/name
 if not source.is_file() or source.name.startswith('.env') or source.suffix.lower() in ('.key','.pem','.dump'):raise SystemExit('Unexpected baseline source entry '+name)
 target=output/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(source,target)

paths=['backend/commerce-service/src','backend/tests/unit','backend/tests/integration','frontend/src','frontend/tests','docs/contracts']
if args.scope=='chat':
 phase=plan_revision
 paths=['backend/identity-store-service','backend/ai-service','backend/tests/unit/messaging.test.ts','backend/tests/unit/chat-media-files.test.ts','backend/tests/unit/chat-media-scope.test.ts','backend/tests/integration/chat-media-lifecycle.test.ts','backend/tests/integration/chat-media-processing.test.ts','backend/tests/integration/conversation-search.test.ts','frontend/src/api/recommendationsChat.ts','frontend/src/chat','frontend/src/features/customer/CustomerChatWidget.tsx','frontend/src/features/customer/ContactStoreButton.tsx','frontend/tests/chat-media.spec.ts','frontend/tests/ai-chat-media.spec.ts','frontend/tests/chat-search.spec.ts','frontend/tests/chat-launcher.spec.ts']
selected=subprocess.check_output(['git','diff','--name-only',base,phase,'--',*paths],cwd=plan,text=True).splitlines()
# Take contracts from the complete plan (including already-deployed CMS) and
# regenerate clients later. A schema being available does not enable media flags.
selected.extend(['docs/contracts/openapi.json','docs/contracts/endpoint-status.json'])
conflicts=[]
with tempfile.TemporaryDirectory(prefix='pbl6-debian2-merge-') as directory:
 for name in sorted(set(selected)):
  if 'generated' in name or name.endswith('contracts.test.ts'):continue
  old=subprocess.run(['git','show',base+':'+name],cwd=plan,capture_output=True)
  theirs=subprocess.check_output(['git','show',plan_revision+':'+name],cwd=plan).replace(b'\r\n',b'\n')
  target=output/name;ours=target.read_bytes().replace(b'\r\n',b'\n') if target.exists() else None
  before=old.stdout.replace(b'\r\n',b'\n') if old.returncode==0 else None
  if args.scope=='chat' and name=='backend/identity-store-service/src/main.ts':
   text=ours.decode('utf-8')
   if 'OwnChatMediaController' not in text:
    marker='MessagingController,ContextInternalController'
    if text.count(marker)!=1:raise SystemExit('Review M3 controller registration')
    text="import {OwnChatMediaController,StoreChatMediaController} from './messaging/media.controller';\n"+text.replace(marker,'MessagingController,OwnChatMediaController,StoreChatMediaController,ContextInternalController')
   target.write_text(text,encoding='utf-8');continue
  if ours==theirs or theirs==before:continue
  if ours==before or ours is None:merged=theirs
  elif before is None:conflicts.append(name);continue
  else:
   files=[Path(directory)/part for part in ('ours','base','theirs')]
   for file,data in zip(files,(ours,before,theirs)):file.write_bytes(data)
   result=subprocess.run(['git','merge-file','-p',*map(str,files)],capture_output=True)
   # git merge-file returns the conflict count (up to 127), not just one.
   if result.returncode<0 or result.returncode>=128:raise SystemExit('Merge failed: '+name)
   merged=result.stdout
   if result.returncode:conflicts.append(name)
  target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(merged)

if args.scope=='chat':
 docker=output/'backend/Dockerfile';text=docker.read_text(encoding='utf-8')
 marker='FROM node:22.15.1-bookworm-slim\n'
 if 'ARG INSTALL_CHAT_MEDIA=0' not in text:
  if text.count(marker)!=1:raise SystemExit('Review Node codec build stage')
  text=text.replace(marker,marker+'ARG INSTALL_CHAT_MEDIA=0\nRUN if [ "$INSTALL_CHAT_MEDIA" = "1" ]; then apt-get update && apt-get install -y --no-install-recommends ffmpeg util-linux && rm -rf /var/lib/apt/lists/*; fi\n')
  docker.write_text(text,encoding='utf-8')

# Carry the subsequent CMS money-copy fix without replacing unrelated WIP.
for name in ['frontend/src/features/customer/StorefrontSections.tsx','frontend/tests/storefront-cms.spec.ts']:
 (output/name).write_bytes(subprocess.check_output(['git','show',plan_revision+':'+name],cwd=plan))
store_page=output/'frontend/src/features/customer/StorePage.tsx';text=store_page.read_text(encoding='utf-8')
if 'session?.context?.user_id' not in text:
 marker='    queryKey: ["public-store-vouchers", id],\n    enabled: !!id,\n'
 if text.count(marker)!=1 or text.count('export function StorePage() {\n')!=1:raise SystemExit('Review private Store voucher admission')
 text=text.replace('import { callOperation } from "../../api/operations";','import { callOperation } from "../../api/operations";\nimport { useAuth } from "../../api/auth-context";')
 text=text.replace('export function StorePage() {\n','export function StorePage() {\n  const { session } = useAuth();\n')
 text=text.replace(marker,'    queryKey: ["public-store-vouchers", id, session?.context?.user_id],\n    enabled: !!id && !!session?.context?.roles.includes("CUSTOMER"),\n')
 store_page.write_text(text,encoding='utf-8')
for name in ['frontend/tests/store-sort-recommendations.spec.ts','frontend/tests/catalog-state.spec.ts','frontend/tests/remaining-ui-phase1.spec.ts','frontend/tests/auth-forms.spec.ts']:
 (output/name).write_bytes(subprocess.check_output(['git','show',plan_revision+':'+name],cwd=plan))
css=output/'frontend/src/styles/customer-polish.css';text=css.read_text(encoding='utf-8')
tab_start='.live-market .order-history-page .order-status-tabs > button,\n'
if tab_start not in text:
 old='.live-market .order-status-tabs a.order-returns-tab { display: inline-flex; align-items: center; padding: 12px 14px; color: #475569; font-size: 14px; font-weight: 500; border: 0; border-bottom: 2px solid transparent; background: transparent; box-shadow: none; border-radius: 0; white-space: nowrap; }'
 source=subprocess.check_output(['git','show',plan_revision+':frontend/src/styles/customer-polish.css'],cwd=plan).decode()
 start=source.index(tab_start);end=source.index('@media (max-width: 767px)',start)
 if text.count(old)!=1:raise SystemExit('Review customer order tab styles')
 css.write_text(text.replace(old,source[start:end].rstrip()),encoding='utf-8')
nav=output/'frontend/src/live/LiveApp.tsx';text=nav.read_text(encoding='utf-8')
if 'path.includes("storefront")' not in text:
 marker='                path.includes("settings") ||\n'
 if text.count(marker)!=1:raise SystemExit('Review owner navigation filter')
 nav.write_text(text.replace(marker,marker+'                path.includes("storefront") ||\n'),encoding='utf-8')

# Keep the deployed CMS internal contract; public schemas are reconciled above.
for name in ['scripts/generate_runtime_contracts.py','scripts/generate_contracts.py','scripts/test-storefront.sh','scripts/test-storefront.ps1','scripts/deploy-demo-storefront.ps1','scripts/storefront-deploy.py','scripts/deploy-demo-ai-chat-media.ps1','scripts/deploy-demo-ai-chat-media.sh','scripts/ai-chat-media-deploy.py','scripts/test-ai-chat-media.ps1','scripts/test-ai-chat-media.sh','scripts/test-ai-chat-media-isolated.py','scripts/scan_git_candidate.py','frontend/tests/runtime/demo-acceptance.cjs','backend/tests/unit/contracts.test.ts']:
 if (plan/name).is_file():shutil.copyfile(plan/name,output/name)
if any(name in conflicts for name in ('docs/contracts/openapi.json','docs/contracts/endpoint-status.json')):
 subprocess.run(['python',str(plan/'scripts/merge-debian2-contracts.py'),'--runtime-source',str(runtime),'--output',str(output)],check=True)
 conflicts=[name for name in conflicts if name not in ('docs/contracts/openapi.json','docs/contracts/endpoint-status.json')]
evidence=Path('C:/PBL6/outputs/bug-debian2-reconciliation-2026-11-22');evidence.mkdir(parents=True,exist_ok=True)
(evidence/(args.scope+'-merge-'+output.name+'.json')).write_text(json.dumps({'base':base,'phase':phase,'runtime':str(runtime),'output':str(output),'conflicts':conflicts,'review_required':True},indent=2))
print(json.dumps({'output':str(output),'conflicts':conflicts}))
if conflicts:raise SystemExit('Resolve release-only conflicts before generation/build/deployment')
