param(
    [switch]$PackageOnly,
    [switch]$InspectOnly,
    [string]$Password = $env:DEPLOY_PASSWORD,
    [string]$SshTarget = 'pbl6-demo',
    [int]$SshPort,
    [string]$ReleaseRoot
)
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
if($ReleaseRoot){$repo=[IO.Path]::GetFullPath($ReleaseRoot);if((Split-Path -Parent $repo) -ne 'C:\PBL6\artifacts'){throw 'Use an isolated release under artifacts.'}}
$deployId = [Guid]::NewGuid().ToString('N')
$expectedTemp = [IO.Path]::GetFullPath((Join-Path ([IO.Path]::GetTempPath()) "pbl6-ai-media-deploy-$deployId"))
$temp = New-Item -ItemType Directory -Path $expectedTemp
$archive = Join-Path $temp.FullName 'ai-media-deploy.tgz'
$server = $SshTarget
$sshOptions = @('-o','StrictHostKeyChecking=accept-new','-o','ConnectTimeout=15')
if($PSBoundParameters.ContainsKey('SshPort')){$sshOptions+=@('-o',"Port=$SshPort")}
try {
    $files = @(& git -C $repo -c core.quotePath=false ls-files --cached --others --exclude-standard -- backend/ai-service/app backend/ai-service/tests backend/ai-service/migrations | Where-Object { $_ -match '\.(py|json|sql)$' -and $_ -notmatch '(__pycache__|\.pytest_cache|\.env)' })
    if ($LASTEXITCODE -ne 0) { throw 'Could not list AI media sources.' }
    $files += 'scripts/deploy-demo-ai-chat-media.sh','scripts/ai-chat-media-deploy.py','scripts/test-ai-chat-media-isolated.py','backend/ai-service/Dockerfile','backend/ai-service/requirements.lock.txt','docs/contracts/endpoint-status.json','docs/contracts/openapi.json','.dockerignore'
    foreach ($file in $files) {
        if (!(Test-Path -LiteralPath (Join-Path $repo $file) -PathType Leaf)) { throw "Missing AI media source: $file" }
    }
    $manifestCode = @'
from pathlib import Path
import hashlib,json,subprocess,sys
root=Path(sys.argv[1]);sources={};baseline=Path('C:/PBL6/artifacts/debian2-vouchers-release-20261122-reviewed')
for source in ('backend/ai-service/app/main.py','backend/ai-service/app/chat/runtime.py','backend/ai-service/app/chat/retention.py','backend/ai-service/app/try_on/repository.py','backend/ai-service/app/try_on/provider.py','backend/ai-service/app/try_on/config.py','backend/ai-service/app/try_on/demo.py'):
 old=(baseline/source).read_bytes().replace(b'\r\n',b'\n')
 current=(root/source).read_bytes().replace(b'\r\n',b'\n')
 sources[source]={'before':hashlib.sha256(old).hexdigest(),'after':hashlib.sha256(current).hexdigest()}
Path(sys.argv[2]).write_text(json.dumps({'sources':sources}))
'@
    $manifestCode | & python - $repo (Join-Path $temp.FullName 'manifest.json')
    if ($LASTEXITCODE -ne 0) { throw 'AI media manifest failed.' }
    & tar.exe -C $temp.FullName -czf (Join-Path $temp.FullName 'manifest.tgz') manifest.json
    if ($LASTEXITCODE -ne 0) { throw 'AI media manifest package failed.' }
    $list = Join-Path $temp.FullName 'files.txt'
    [IO.File]::WriteAllText($list, (($files -join "`n") + "`n"), [Text.UTF8Encoding]::new($false))
    & tar.exe -C $repo -czf $archive --no-recursion -T $list
    if ($LASTEXITCODE -ne 0) { throw 'AI media package failed.' }
    if ($PackageOnly) { Write-Host 'AI_MEDIA_DEPLOY_PACKAGE_OK'; return }
    if ($Password) {
        $askpass = Join-Path $temp.FullName 'askpass.cmd'
        $env:PBL6_SSH_PASSWORD = $Password
        [IO.File]::WriteAllText($askpass,'@powershell.exe -NoLogo -NoProfile -NonInteractive -Command "[Console]::Write([Environment]::GetEnvironmentVariable(''PBL6_SSH_PASSWORD''))"' + "`r`n",[Text.Encoding]::ASCII)
        $env:SSH_ASKPASS=$askpass; $env:SSH_ASKPASS_REQUIRE='force'; $env:DISPLAY=':0'
    }
    & scp.exe @sshOptions $archive "${server}:.pbl6-ai-media-deploy-$deployId.tgz"
    if ($LASTEXITCODE -ne 0) { throw 'AI media upload failed.' }
    & scp.exe @sshOptions (Join-Path $temp.FullName 'manifest.tgz') "${server}:.pbl6-ai-media-deploy-$deployId-manifest.tgz"
    if ($LASTEXITCODE -ne 0) { throw 'AI media manifest upload failed.' }
    $mode=if($InspectOnly){'inspect'}else{'deploy'}
    $activate = "bash -o pipefail -c 'tar -xOzf .pbl6-ai-media-deploy-$deployId.tgz scripts/deploy-demo-ai-chat-media.sh | tr -d \\r > .pbl6-ai-media-deploy-$deployId.sh && bash .pbl6-ai-media-deploy-$deployId.sh $deployId $mode'"
    & ssh.exe @sshOptions $server $activate
    if ($LASTEXITCODE -ne 0) { throw 'AI media rollout failed; inspect the staged checks and rollback output.' }
}
finally {
    Remove-Item Env:PBL6_SSH_PASSWORD -ErrorAction SilentlyContinue
    $resolvedTemp=[IO.Path]::GetFullPath($temp.FullName)
    if ($resolvedTemp -ne $expectedTemp) { throw 'Unexpected AI media temporary path.' }
    Remove-Item -LiteralPath $resolvedTemp -Recurse -Force -ErrorAction SilentlyContinue
}
