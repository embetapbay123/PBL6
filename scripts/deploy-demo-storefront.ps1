param([Parameter(Mandatory=$true)][string]$ReleaseRoot,[switch]$InspectOnly,[switch]$PackageOnly,[string]$SshTarget='pbl6-demo',[ValidateSet('storefront','vouchers','chat')][string]$Scope='storefront')
$ErrorActionPreference='Stop'
$repo=Split-Path -Parent $PSScriptRoot
$release=[IO.Path]::GetFullPath($ReleaseRoot)
if((Split-Path -Parent $release) -ne 'C:\PBL6\artifacts' -or !(Test-Path -LiteralPath (Join-Path $release 'frontend/src/features/seller/StorefrontPage.tsx'))){throw 'Use the isolated, reviewed Debian2 storefront release.'}
$deployId=[Guid]::NewGuid().ToString('N')
$expectedTemp=[IO.Path]::GetFullPath((Join-Path ([IO.Path]::GetTempPath()) "pbl6-storefront-deploy-$deployId"))
$temp=New-Item -ItemType Directory -Path $expectedTemp
try {
 $prepare=@'
import hashlib,json,shutil,sys
from pathlib import Path
plan,release,target=map(Path,sys.argv[1:4]);scope=sys.argv[4];runtime=Path('C:/PBL6')
sources=['catalog-service/src/main.ts','catalog-service/src/catalog/catalog.repository.ts','catalog-service/src/catalog/catalog.mapper.ts','catalog-service/src/catalog/storefront-catalog.ts','commerce-service/src/main.ts','commerce-service/src/report/storefront-commerce.ts','identity-store-service/src/main.ts','identity-store-service/src/store/storefront.service.ts','identity-store-service/src/store/storefront.controller.ts','identity-store-service/src/messaging/media-files.ts','identity-store-service/src/messaging/media-process.ts','shared/src/internal-clients.ts','shared/src/request-contract.ts','shared/src/dtos.generated.ts','shared/src/operations.generated.ts','shared/src/contracts.runtime.generated.json','shared/src/fixtures.generated.json']
if scope=='vouchers':
 runtime=Path('C:/PBL6/artifacts/storefront-debian2-release-20261121')
 sources=['commerce-service/src/order/order.controller.ts','commerce-service/src/order/order.repository.ts','commerce-service/src/order/order.service.ts','commerce-service/src/voucher/voucher-pricing.ts','shared/src/dtos.generated.ts','shared/src/operations.generated.ts','shared/src/contracts.runtime.generated.json','shared/src/fixtures.generated.json']
if scope=='chat':
 runtime=Path('C:/PBL6/artifacts/debian2-vouchers-release-20261122-reviewed')
 sources=['identity-store-service/src/main.ts','identity-store-service/src/messaging/messaging.controller.ts','identity-store-service/src/messaging/messaging.service.ts','identity-store-service/src/messaging/media-files.ts','identity-store-service/src/messaging/media-process.ts','identity-store-service/src/messaging/media-scope.ts','identity-store-service/src/messaging/media.controller.ts','identity-store-service/src/messaging/media.service.ts','shared/src/dtos.generated.ts','shared/src/operations.generated.ts','shared/src/contracts.runtime.generated.json','shared/src/fixtures.generated.json','shared/src/request-contract.ts']
manifest={'scope':scope,'sources':{},'release':str(release),'files':[]}
for name in sources:
 source=release/'backend'/name
 if not source.is_file():raise SystemExit('Missing reviewed release source: '+name)
 previous=runtime/'backend'/name
 manifest['sources'][name]={'before':hashlib.sha256(previous.read_bytes().replace(b'\r\n',b'\n')).hexdigest() if previous.is_file() else None,'after':hashlib.sha256(source.read_bytes().replace(b'\r\n',b'\n')).hexdigest()}
 paths=[('backend/'+name,source)]
 if name.endswith('.ts'):
  compiled='backend/dist/'+name[:-3]+'.js';paths.append((compiled,release/compiled))
 elif name.endswith('.json'):paths.append(('backend/dist/'+name,release/'backend/dist'/name))
 for relative,path in paths:
  if not path.is_file():raise SystemExit('Build the release backend before packaging: '+relative)
  out=target/'overlay'/relative;out.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(path,out);manifest['files'].append(relative)
for name in ([] if scope=='vouchers' else ['identity-store-service/migrations/015_chat_attachments.sql'] if scope=='chat' else ['catalog-service/migrations/017_product_publication.sql','commerce-service/migrations/028_storefront_sales_lookup.sql','identity-store-service/migrations/016_storefront.sql']):
 path=release/'backend'/name;out=target/'overlay/backend'/name;out.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(path,out);manifest['files'].append('backend/'+name)
if scope=='chat':
 name='backend/Dockerfile';source=release/name;previous=runtime/name;out=target/'overlay'/name;shutil.copyfile(source,out);manifest['files'].append(name)
 manifest['host_sources']={name:{'before':hashlib.sha256(previous.read_bytes().replace(b'\r\n',b'\n')).hexdigest(),'after':hashlib.sha256(source.read_bytes().replace(b'\r\n',b'\n')).hexdigest()}}
(target/'manifest.json').write_text(json.dumps(manifest))
shutil.copyfile(plan/'scripts/storefront-deploy.py',target/'storefront-deploy.py')
'@
 $prepare | python - $repo $release $temp.FullName $Scope
 if($LASTEXITCODE -ne 0){throw 'Storefront release packaging failed.'}
 $archive=Join-Path $temp 'storefront.tgz'
 & tar.exe -C $temp.FullName -czf $archive overlay manifest.json storefront-deploy.py
 if($LASTEXITCODE -ne 0){throw 'Storefront archive failed.'}
 if($PackageOnly){Write-Host 'STOREFRONT_DEPLOY_PACKAGE_OK';return}
 $opts=@('-o','BatchMode=yes','-o','StrictHostKeyChecking=accept-new','-o','ConnectTimeout=15')
 & scp.exe @opts $archive "${SshTarget}:.pbl6-storefront-deploy-$deployId.tgz"
 if($LASTEXITCODE -ne 0){throw 'Storefront upload failed.'}
 $mode=if($InspectOnly){'inspect'}else{'deploy'}
 $remote=@'
import fcntl,os,subprocess,tarfile,tempfile
from pathlib import Path
ident,mode=__import__('sys').argv[1:];assert len(ident)==32 and all(c in '0123456789abcdef' for c in ident)
archive=Path.home()/('.pbl6-storefront-deploy-'+ident+'.tgz')
lock=(Path.home()/'.pbl6-demo-backend-deploy.lock').open('a');fcntl.flock(lock,fcntl.LOCK_EX)
try:
 with tempfile.TemporaryDirectory(prefix='pbl6-storefront-deploy-') as stage:
  with tarfile.open(archive) as package:package.extractall(stage,filter='data')
  result=subprocess.run(['python3',str(Path(stage)/'storefront-deploy.py'),stage,ident,mode])
  raise SystemExit(result.returncode)
finally:archive.unlink(missing_ok=True)
'@
 $remote | & ssh.exe @opts $SshTarget "python3 - $deployId $mode"
 if($LASTEXITCODE -ne 0){throw 'Storefront rollout did not pass; inspect its rollback result.'}
} finally {
 $resolved=[IO.Path]::GetFullPath($temp.FullName)
 if($resolved -ne $expectedTemp){throw 'Unexpected storefront temporary path.'}
 Remove-Item -LiteralPath $resolved -Recurse -Force -ErrorAction SilentlyContinue
}
