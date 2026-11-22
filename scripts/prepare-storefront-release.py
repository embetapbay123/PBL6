"""Layer only phase 5 onto the current Debian2 source without changing either working tree.

The existing deployment's uncommitted features remain its baseline. They are not
silently replaced by the older bug-plan branch or included in that branch's commit.
"""
import argparse
import hashlib
import json
import shutil
import subprocess
import tempfile
from pathlib import Path

parser=argparse.ArgumentParser()
parser.add_argument('--runtime-source',type=Path,required=True)
parser.add_argument('--output',type=Path,required=True)
args=parser.parse_args()
plan=Path(__file__).resolve().parents[1]
runtime=args.runtime_source.resolve();output=args.output.resolve()
if runtime==plan or output.exists() or output.parent!=runtime/'artifacts':
 raise SystemExit('Use a new, isolated artifacts directory under the runtime checkout')
base=subprocess.check_output(['git','rev-parse','HEAD'],cwd=runtime,text=True).strip()
subprocess.run(['git','worktree','add','--detach',str(output),base],cwd=runtime,check=True)
changed=subprocess.check_output(['git','diff','--name-only','--diff-filter=ACMRT'],cwd=runtime,text=True).splitlines()
extra=subprocess.check_output(['git','ls-files','--others','--exclude-standard','--','backend/commerce-service/src/wallet','backend/commerce-service/migrations','frontend/src/features/customer/WalletPage.tsx','frontend/src/features/customer/walletService.ts','docs/implementation/demo-debian2-deployment.md'],cwd=runtime,text=True).splitlines()
snapshot={}
for name in changed+extra:
 if not name.startswith(('backend/','frontend/','docs/contracts/','scripts/deploy-demo-web','docs/implementation/demo-debian2')) and name not in ('.dockerignore','.gitignore'):
  continue
 path=runtime/name
 if not path.is_file() or '.env' in path.name or path.suffix.lower() in ('.pem','.key','.dump'):raise SystemExit('Unexpected runtime source entry')
 target=output/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(path,target)
 snapshot[name]=hashlib.sha256(path.read_bytes().replace(b'\r\n',b'\n')).hexdigest()

files=[
 'backend/catalog-service/src/catalog/catalog.mapper.ts','backend/catalog-service/src/catalog/catalog.repository.ts','backend/catalog-service/src/main.ts',
 'backend/commerce-service/src/main.ts','backend/identity-store-service/src/main.ts','backend/shared/src/internal-clients.ts',
 'frontend/src/features/customer/StorePage.tsx','frontend/src/features/seller/routes.tsx','frontend/src/live/LiveApp.tsx','frontend/src/live/SellerWorkspace.tsx','frontend/src/live/CatalogCard.tsx',
]
conflicts=[]
with tempfile.TemporaryDirectory(prefix='pbl6-storefront-merge-') as directory:
 for name in files:
  target=output/name
  if name in ('backend/commerce-service/src/main.ts','backend/identity-store-service/src/main.ts'):
   service,controller,module=('M2','StorefrontCommerceController','./report/storefront-commerce') if '/commerce-service/' in name else ('M3','StorefrontController','./store/storefront.controller')
   text=target.read_text();text="import {"+controller+"} from '"+module+"';\n"+text
   marker="bootstrap('"+service+"',";index=text.index('[',text.index(marker));text=text[:index+1]+controller+','+text[index+1:];target.write_text(text);continue
  before=Path(directory)/'base';before.write_bytes(subprocess.check_output(['git','show','ea71272:'+name],cwd=plan).replace(b'\r\n',b'\n'))
  ours=Path(directory)/'ours';ours.write_bytes(target.read_bytes().replace(b'\r\n',b'\n'))
  theirs=Path(directory)/'theirs';theirs.write_bytes((plan/name).read_bytes().replace(b'\r\n',b'\n'))
  # Changes before phase 5 are intentionally excluded from this release overlay.
  merged=subprocess.run(['git','merge-file','-p',str(ours),str(before),str(theirs)],capture_output=True)
  if merged.returncode not in (0,1):raise SystemExit('Could not merge '+name)
  target.write_bytes(merged.stdout)
  if merged.returncode:conflicts.append(name)
new_files=[
 'backend/catalog-service/src/catalog/storefront-catalog.ts','backend/catalog-service/migrations/017_product_publication.sql',
 'backend/commerce-service/src/report/storefront-commerce.ts','backend/commerce-service/migrations/028_storefront_sales_lookup.sql',
 'backend/identity-store-service/src/store/storefront.service.ts','backend/identity-store-service/src/store/storefront.controller.ts','backend/identity-store-service/migrations/016_storefront.sql',
 'backend/identity-store-service/src/messaging/media-files.ts','backend/identity-store-service/src/messaging/media-process.ts',
 'frontend/src/features/customer/StorefrontSections.tsx','frontend/src/features/customer/storefront.css','frontend/src/features/seller/StorefrontPage.tsx',
 'frontend/src/features/seller/StoreAuditPage.tsx','frontend/tests/storefront-cms.spec.ts','backend/tests/integration/storefront-lifecycle.test.ts','scripts/add_storefront_contracts.py','scripts/generate_runtime_contracts.py',
 'scripts/deploy-demo-web.ps1','scripts/deploy-demo-web.sh','backend/shared/src/request-contract.ts',
 'infrastructure/Caddyfile',
]
for name in new_files:
 target=output/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(plan/name,target)
# This transport adds scoped raw uploads/progress/binary reads and retains the
# original authentication/session logic; it does not enable other chat features.
shutil.copyfile(plan/'frontend/src/api/client.ts',output/'frontend/src/api/client.ts')
evidence=runtime/'outputs/bug-storefront-phase5-2026-11-21';evidence.mkdir(parents=True,exist_ok=True)
(evidence/'runtime-release-source.json').write_text(json.dumps({'base':base,'output':str(output),'snapshot_sha256':snapshot,'conflicts':conflicts},indent=2))
if conflicts:raise SystemExit('Resolve release-only merge conflicts: '+', '.join(conflicts))
subprocess.run(['python','scripts/add_storefront_contracts.py'],cwd=output,check=True)
subprocess.run(['python','scripts/generate_runtime_contracts.py'],cwd=output,check=True)
print('STOREFRONT_RELEASE_PREPARED '+str(output))
