param(
    [switch]$PackageOnly,
    [string]$Password = $env:DEPLOY_PASSWORD
)
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$deployId = [Guid]::NewGuid().ToString('N')
$expectedTemp = [IO.Path]::GetFullPath((Join-Path ([IO.Path]::GetTempPath()) "pbl6-chat-media-$deployId"))
$temp = New-Item -ItemType Directory -Path $expectedTemp
$archive = Join-Path $temp.FullName 'chat-media.tgz'
$server = 'realkhoa@alpine.khoav4.com'
$sshOptions = @('-o','StrictHostKeyChecking=accept-new','-o','ConnectTimeout=15')
try {
    $files = @(
        'backend/identity-store-service/src/main.ts',
        'backend/dist/identity-store-service/src/main.js',
        'backend/dist/identity-store-service/src/main.js.map',
        'backend/identity-store-service/migrations/015_chat_attachments.sql',
        'backend/Dockerfile',
        'docs/contracts/openapi.json',
        'scripts/deploy-demo-chat-media.sh',
        'backend/tests/integration/chat-media-processing.test.ts',
        'backend/tests/integration/chat-media-lifecycle.test.ts',
        'backend/dist/tests/integration/chat-media-processing.test.js',
        'backend/dist/tests/integration/chat-media-lifecycle.test.js',
        'backend/identity-store-service/src/messaging/messaging.service.ts',
        'backend/dist/identity-store-service/src/messaging/messaging.service.js',
        'backend/dist/identity-store-service/src/messaging/messaging.service.js.map',
        'backend/identity-store-service/src/messaging/messaging.controller.ts',
        'backend/dist/identity-store-service/src/messaging/messaging.controller.js',
        'backend/dist/identity-store-service/src/messaging/messaging.controller.js.map',
        'backend/identity-store-service/src/messaging/media-files.ts',
        'backend/dist/identity-store-service/src/messaging/media-files.js',
        'backend/dist/identity-store-service/src/messaging/media-files.js.map',
        'backend/identity-store-service/src/messaging/media-scope.ts',
        'backend/dist/identity-store-service/src/messaging/media-scope.js',
        'backend/dist/identity-store-service/src/messaging/media-scope.js.map',
        'backend/identity-store-service/src/messaging/media-process.ts',
        'backend/dist/identity-store-service/src/messaging/media-process.js',
        'backend/dist/identity-store-service/src/messaging/media-process.js.map',
        'backend/identity-store-service/src/messaging/media.service.ts',
        'backend/dist/identity-store-service/src/messaging/media.service.js',
        'backend/dist/identity-store-service/src/messaging/media.service.js.map',
        'backend/identity-store-service/src/messaging/media.controller.ts',
        'backend/dist/identity-store-service/src/messaging/media.controller.js',
        'backend/dist/identity-store-service/src/messaging/media.controller.js.map',
        'backend/shared/src/request-contract.ts',
        'backend/dist/shared/src/request-contract.js',
        'backend/dist/shared/src/request-contract.js.map',
        'backend/shared/src/dtos.generated.ts',
        'backend/dist/shared/src/dtos.generated.js',
        'backend/dist/shared/src/dtos.generated.js.map',
        'backend/shared/src/operations.generated.ts',
        'backend/dist/shared/src/operations.generated.js',
        'backend/dist/shared/src/operations.generated.js.map',
        'backend/shared/src/contracts.runtime.generated.json',
        'backend/dist/shared/src/contracts.runtime.generated.json',
        'backend/shared/src/fixtures.generated.json',
        'backend/dist/shared/src/fixtures.generated.json',
        'backend/shared/src/contracts.generated.d.ts'
    )
    foreach ($file in $files) {
        if (!(Test-Path -LiteralPath (Join-Path $repo $file) -PathType Leaf)) { throw "Build backend before deploying: missing $file" }
    }
    $manifestCode = @'
from pathlib import Path
import hashlib,json,subprocess,sys
root=Path(sys.argv[1]); out=Path(sys.argv[2]); sources={}
for source in ('backend/identity-store-service/src/main.ts','backend/identity-store-service/src/messaging/messaging.service.ts','backend/identity-store-service/src/messaging/messaging.controller.ts','backend/shared/src/request-contract.ts'):
 old=subprocess.check_output(['git','show','HEAD:'+source],cwd=root).replace(b'\r\n',b'\n')
 current=(root/source).read_bytes().replace(b'\r\n',b'\n')
 if source.endswith('.ts'):
  binary=source.replace('backend/','backend/dist/',1).removesuffix('.ts')+'.js'
  if (root/binary).stat().st_mtime < (root/source).stat().st_mtime:raise SystemExit('Backend build is older than messaging source')
 sources[source]={'before':hashlib.sha256(old).hexdigest(),'after':hashlib.sha256(current).hexdigest()}
 # Reviewed active legacy validator: direct DTO lookup, pre-HEAD handling,
 # and the older three-callback exemption list. No extra route/role bypass.
 if source=='backend/shared/src/request-contract.ts':
  sources[source]['reviewed_legacy']='a35021ae3c8e9119e1415119342ed0960cd584345495f60b0ec7fd2b596fe332'
out.write_text(json.dumps({'sources':sources}))
'@
    $manifestCode | & python - $repo (Join-Path $temp.FullName 'manifest.json')
    if ($LASTEXITCODE -ne 0) { throw 'Chat media manifest failed.' }
    $list = Join-Path $temp.FullName 'files.txt'
    [IO.File]::WriteAllText($list, (($files -join "`n") + "`n"), [Text.UTF8Encoding]::new($false))
    & tar.exe -C $repo -czf $archive --no-recursion -T $list
    if ($LASTEXITCODE -ne 0) { throw 'Chat media package failed.' }
    # A second small archive avoids modifying the repository for deployment metadata.
    & tar.exe -C $temp.FullName -czf (Join-Path $temp.FullName 'manifest.tgz') manifest.json
    if ($LASTEXITCODE -ne 0) { throw 'Chat media manifest package failed.' }
    if ($PackageOnly) { Write-Host 'CHAT_MEDIA_PACKAGE_OK'; return }
    if ($Password) {
        $askpass = Join-Path $temp.FullName 'askpass.cmd'
        $env:PBL6_SSH_PASSWORD = $Password
        [IO.File]::WriteAllText($askpass,'@powershell.exe -NoLogo -NoProfile -NonInteractive -Command "[Console]::Write([Environment]::GetEnvironmentVariable(''PBL6_SSH_PASSWORD''))"' + "`r`n",[Text.Encoding]::ASCII)
        $env:SSH_ASKPASS=$askpass; $env:SSH_ASKPASS_REQUIRE='force'; $env:DISPLAY=':0'
    }
    & scp.exe -P 2122 @sshOptions $archive "${server}:.pbl6-chat-media-$deployId.tgz"
    if ($LASTEXITCODE -ne 0) { throw 'Chat media upload failed.' }
    & scp.exe -P 2122 @sshOptions (Join-Path $temp.FullName 'manifest.tgz') "${server}:.pbl6-chat-media-$deployId-manifest.tgz"
    if ($LASTEXITCODE -ne 0) { throw 'Chat media manifest upload failed.' }
    $activate = "bash -o pipefail -c 'tar -xOzf .pbl6-chat-media-$deployId.tgz scripts/deploy-demo-chat-media.sh | tr -d \\r > .pbl6-chat-media-$deployId.sh && bash .pbl6-chat-media-$deployId.sh $deployId'"
    & ssh.exe -p 2122 @sshOptions $server $activate
    if ($LASTEXITCODE -ne 0) { throw 'Chat media rollout failed; inspect rollback output.' }
}
finally {
    Remove-Item Env:PBL6_SSH_PASSWORD -ErrorAction SilentlyContinue
    $resolvedTemp=[IO.Path]::GetFullPath($temp.FullName)
    if ($resolvedTemp -ne $expectedTemp) { throw 'Unexpected chat-media temporary path.' }
    Remove-Item -LiteralPath $resolvedTemp -Recurse -Force -ErrorAction SilentlyContinue
}
