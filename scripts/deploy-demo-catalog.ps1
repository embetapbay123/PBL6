param(
    [switch]$PackageOnly,
    [string]$Password = $env:DEPLOY_PASSWORD
)
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$deployId = [Guid]::NewGuid().ToString('N')
$expectedTemp = [IO.Path]::GetFullPath((Join-Path ([IO.Path]::GetTempPath()) "pbl6-catalog-$deployId"))
$temp = New-Item -ItemType Directory -Path $expectedTemp
$archive = Join-Path $temp.FullName 'catalog.tgz'
$server = 'realkhoa@alpine.khoav4.com'
$sshOptions = @('-o','StrictHostKeyChecking=accept-new','-o','ConnectTimeout=15')
try {
    $files = @(
        'backend/dist/catalog-service/src/catalog/catalog.repository.js',
        'backend/dist/catalog-service/src/catalog/catalog.repository.js.map',
        'backend/dist/catalog-service/src/catalog/catalog.service.js',
        'backend/dist/catalog-service/src/catalog/catalog.service.js.map',
        'backend/dist/shared/src/contracts.runtime.generated.json',
        'backend/dist/shared/src/dtos.generated.js',
        'backend/dist/shared/src/dtos.generated.js.map',
        'backend/dist/shared/src/operations.generated.js',
        'backend/dist/shared/src/operations.generated.js.map',
        'backend/dist/shared/src/fixtures.generated.json',
        'backend/catalog-service/src/catalog/catalog.repository.ts',
        'backend/catalog-service/src/catalog/catalog.service.ts',
        'backend/shared/src/contracts.runtime.generated.json',
        'backend/shared/src/dtos.generated.ts',
        'backend/shared/src/operations.generated.ts',
        'backend/shared/src/contracts.generated.d.ts',
        'backend/shared/src/fixtures.generated.json',
        'docs/contracts/openapi.json',
        'docs/contracts/endpoint-status.json',
        'scripts/deploy-demo-catalog.sh'
    )
    foreach ($file in $files) {
        if (!(Test-Path -LiteralPath (Join-Path $repo $file) -PathType Leaf)) { throw "Build backend before deploying: missing $file" }
    }
    $manifestCode = @'
from pathlib import Path
import hashlib,json,subprocess,sys
root=Path(sys.argv[1]); out=Path(sys.argv[2]); sources={}
for name in ('catalog.repository','catalog.service'):
 source='backend/catalog-service/src/catalog/'+name+'.ts'
 old=subprocess.check_output(['git','show','HEAD:'+source],cwd=root).replace(b'\r\n',b'\n')
 current=(root/source).read_bytes().replace(b'\r\n',b'\n')
 binary='backend/dist/catalog-service/src/catalog/'+name+'.js'
 if (root/binary).stat().st_mtime < (root/source).stat().st_mtime:raise SystemExit('Backend build is older than catalog source')
 sources[source]={'before':hashlib.sha256(old).hexdigest(),'after':hashlib.sha256(current).hexdigest()}
out.write_text(json.dumps({'sources':sources}))
'@
    $manifestCode | & python - $repo (Join-Path $temp.FullName 'manifest.json')
    if ($LASTEXITCODE -ne 0) { throw 'Catalog manifest failed.' }
    $list = Join-Path $temp.FullName 'files.txt'
    [IO.File]::WriteAllText($list, (($files -join "`n") + "`n"), [Text.UTF8Encoding]::new($false))
    & tar.exe -C $repo -czf $archive --no-recursion -T $list
    if ($LASTEXITCODE -ne 0) { throw 'Catalog package failed.' }
    # A second small archive avoids modifying the repository for deployment metadata.
    & tar.exe -C $temp.FullName -czf (Join-Path $temp.FullName 'manifest.tgz') manifest.json
    if ($LASTEXITCODE -ne 0) { throw 'Catalog manifest package failed.' }
    if ($PackageOnly) { Write-Host 'CATALOG_PACKAGE_OK'; return }
    if ($Password) {
        $askpass = Join-Path $temp.FullName 'askpass.cmd'
        $env:PBL6_SSH_PASSWORD = $Password
        [IO.File]::WriteAllText($askpass,'@powershell.exe -NoLogo -NoProfile -NonInteractive -Command "[Console]::Write([Environment]::GetEnvironmentVariable(''PBL6_SSH_PASSWORD''))"' + "`r`n",[Text.Encoding]::ASCII)
        $env:SSH_ASKPASS=$askpass; $env:SSH_ASKPASS_REQUIRE='force'; $env:DISPLAY=':0'
    }
    & scp.exe -P 2122 @sshOptions $archive "${server}:.pbl6-catalog-$deployId.tgz"
    if ($LASTEXITCODE -ne 0) { throw 'Catalog upload failed.' }
    & scp.exe -P 2122 @sshOptions (Join-Path $temp.FullName 'manifest.tgz') "${server}:.pbl6-catalog-$deployId-manifest.tgz"
    if ($LASTEXITCODE -ne 0) { throw 'Catalog manifest upload failed.' }
    $activate = "bash -o pipefail -c 'tar -xOzf .pbl6-catalog-$deployId.tgz scripts/deploy-demo-catalog.sh | tr -d \\r > .pbl6-catalog-$deployId.sh && bash .pbl6-catalog-$deployId.sh $deployId'"
    & ssh.exe -p 2122 @sshOptions $server $activate
    if ($LASTEXITCODE -ne 0) { throw 'Catalog rollout failed; inspect rollback output.' }
}
finally {
    Remove-Item Env:PBL6_SSH_PASSWORD -ErrorAction SilentlyContinue
    $resolvedTemp=[IO.Path]::GetFullPath($temp.FullName)
    if ($resolvedTemp -ne $expectedTemp) { throw 'Unexpected catalog temporary path.' }
    Remove-Item -LiteralPath $resolvedTemp -Recurse -Force -ErrorAction SilentlyContinue
}
