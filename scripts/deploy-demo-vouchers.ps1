param(
    [switch]$PackageOnly,
    [string]$Password = $env:DEPLOY_PASSWORD
)
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$deployId = [Guid]::NewGuid().ToString('N')
$expectedTemp = [IO.Path]::GetFullPath((Join-Path ([IO.Path]::GetTempPath()) "pbl6-vouchers-$deployId"))
$temp = New-Item -ItemType Directory -Path $expectedTemp
$archive = Join-Path $temp.FullName 'vouchers.tgz'
$server = 'realkhoa@alpine.khoav4.com'
$sshOptions = @('-o','StrictHostKeyChecking=accept-new','-o','ConnectTimeout=15')
try {
    $files = @(
        'backend/dist/commerce-service/src/order/order.service.js',
        'backend/dist/commerce-service/src/order/order.service.js.map',
        'backend/commerce-service/src/order/order.service.ts',
        'backend/dist/commerce-service/src/order/order.repository.js',
        'backend/dist/commerce-service/src/order/order.repository.js.map',
        'backend/commerce-service/src/order/order.repository.ts',
        'backend/dist/commerce-service/src/order/order.controller.js',
        'backend/dist/commerce-service/src/order/order.controller.js.map',
        'backend/commerce-service/src/order/order.controller.ts',
        'backend/dist/commerce-service/src/voucher/voucher-pricing.js',
        'backend/dist/commerce-service/src/voucher/voucher-pricing.js.map',
        'backend/commerce-service/src/voucher/voucher-pricing.ts',
        'backend/dist/shared/src/contracts.runtime.generated.json',
        'backend/dist/shared/src/dtos.generated.js',
        'backend/dist/shared/src/dtos.generated.js.map',
        'backend/dist/shared/src/operations.generated.js',
        'backend/dist/shared/src/operations.generated.js.map',
        'backend/dist/shared/src/fixtures.generated.json',
        'backend/shared/src/contracts.runtime.generated.json',
        'backend/shared/src/dtos.generated.ts',
        'backend/shared/src/operations.generated.ts',
        'backend/shared/src/contracts.generated.d.ts',
        'backend/shared/src/fixtures.generated.json',
        'backend/tests/integration/voucher-suggestions.test.ts',
        'docs/contracts/openapi.json',
        'docs/contracts/endpoint-status.json',
        'scripts/deploy-demo-vouchers.sh'
    )
    foreach ($file in $files) {
        if (!(Test-Path -LiteralPath (Join-Path $repo $file) -PathType Leaf)) { throw "Build backend before deploying: missing $file" }
    }
    $manifestCode = @'
from pathlib import Path
import hashlib,json,subprocess,sys
root=Path(sys.argv[1]); out=Path(sys.argv[2]); sources={}
for name in ('order.repository','order.service','order.controller'):
 source='backend/commerce-service/src/order/'+name+'.ts'
 old=subprocess.check_output(['git','show','HEAD:'+source],cwd=root).replace(b'\r\n',b'\n')
 current=(root/source).read_bytes().replace(b'\r\n',b'\n')
 binary='backend/dist/commerce-service/src/order/'+name+'.js'
 if (root/binary).stat().st_mtime < (root/source).stat().st_mtime:raise SystemExit('Backend build is older than vouchers source')
 sources[source]={'before':hashlib.sha256(old).hexdigest(),'after':hashlib.sha256(current).hexdigest()}
out.write_text(json.dumps({'sources':sources}))
'@
    $manifestCode | & python - $repo (Join-Path $temp.FullName 'manifest.json')
    if ($LASTEXITCODE -ne 0) { throw 'Voucher manifest failed.' }
    $list = Join-Path $temp.FullName 'files.txt'
    [IO.File]::WriteAllText($list, (($files -join "`n") + "`n"), [Text.UTF8Encoding]::new($false))
    & tar.exe -C $repo -czf $archive --no-recursion -T $list
    if ($LASTEXITCODE -ne 0) { throw 'Voucher package failed.' }
    # A second small archive avoids modifying the repository for deployment metadata.
    & tar.exe -C $temp.FullName -czf (Join-Path $temp.FullName 'manifest.tgz') manifest.json
    if ($LASTEXITCODE -ne 0) { throw 'Voucher manifest package failed.' }
    if ($PackageOnly) { Write-Host 'VOUCHERS_PACKAGE_OK'; return }
    if ($Password) {
        $askpass = Join-Path $temp.FullName 'askpass.cmd'
        $env:PBL6_SSH_PASSWORD = $Password
        [IO.File]::WriteAllText($askpass,'@powershell.exe -NoLogo -NoProfile -NonInteractive -Command "[Console]::Write([Environment]::GetEnvironmentVariable(''PBL6_SSH_PASSWORD''))"' + "`r`n",[Text.Encoding]::ASCII)
        $env:SSH_ASKPASS=$askpass; $env:SSH_ASKPASS_REQUIRE='force'; $env:DISPLAY=':0'
    }
    & scp.exe -P 2122 @sshOptions $archive "${server}:.pbl6-vouchers-$deployId.tgz"
    if ($LASTEXITCODE -ne 0) { throw 'Voucher upload failed.' }
    & scp.exe -P 2122 @sshOptions (Join-Path $temp.FullName 'manifest.tgz') "${server}:.pbl6-vouchers-$deployId-manifest.tgz"
    if ($LASTEXITCODE -ne 0) { throw 'Voucher manifest upload failed.' }
    $activate = "bash -o pipefail -c 'tar -xOzf .pbl6-vouchers-$deployId.tgz scripts/deploy-demo-vouchers.sh | tr -d \\r > .pbl6-vouchers-$deployId.sh && bash .pbl6-vouchers-$deployId.sh $deployId'"
    & ssh.exe -p 2122 @sshOptions $server $activate
    if ($LASTEXITCODE -ne 0) { throw 'Voucher rollout failed; inspect rollback output.' }
}
finally {
    Remove-Item Env:PBL6_SSH_PASSWORD -ErrorAction SilentlyContinue
    $resolvedTemp=[IO.Path]::GetFullPath($temp.FullName)
    if ($resolvedTemp -ne $expectedTemp) { throw 'Unexpected vouchers temporary path.' }
    Remove-Item -LiteralPath $resolvedTemp -Recurse -Force -ErrorAction SilentlyContinue
}
