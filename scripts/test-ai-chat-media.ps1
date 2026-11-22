param(
    [switch]$PackageOnly,
    [string]$Password = $env:DEPLOY_PASSWORD,
    [string]$SshTarget = 'pbl6-demo',
    [int]$SshPort,
    [string]$ReleaseRoot
)
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
if($ReleaseRoot){$repo=[IO.Path]::GetFullPath($ReleaseRoot);if((Split-Path -Parent $repo) -ne 'C:\PBL6\artifacts'){throw 'Use an isolated release under artifacts.'}}
$deployId = [Guid]::NewGuid().ToString('N')
$expectedTemp = [IO.Path]::GetFullPath((Join-Path ([IO.Path]::GetTempPath()) "pbl6-ai-media-check-$deployId"))
$temp = New-Item -ItemType Directory -Path $expectedTemp
$archive = Join-Path $temp.FullName 'ai-media-check.tgz'
$server = $SshTarget
$sshOptions = @('-o','StrictHostKeyChecking=accept-new','-o','ConnectTimeout=15')
if($PSBoundParameters.ContainsKey('SshPort')){$sshOptions+=@('-o',"Port=$SshPort")}
try {
    $files = @(& git -C $repo -c core.quotePath=false ls-files --cached --others --exclude-standard -- backend/ai-service/app backend/ai-service/tests backend/ai-service/migrations | Where-Object { $_ -match '\.(py|json|sql)$' -and $_ -notmatch '(__pycache__|\.pytest_cache|\.env)' })
    $files += 'scripts/test-ai-chat-media.sh','scripts/test-ai-chat-media-isolated.py'
    foreach ($file in $files) {
        if (!(Test-Path -LiteralPath (Join-Path $repo $file) -PathType Leaf)) { throw "Build backend before deploying: missing $file" }
    }
    $list = Join-Path $temp.FullName 'files.txt'
    [IO.File]::WriteAllText($list, (($files -join "`n") + "`n"), [Text.UTF8Encoding]::new($false))
    & tar.exe -C $repo -czf $archive --no-recursion -T $list
    if ($LASTEXITCODE -ne 0) { throw 'AI media package failed.' }
    if ($PackageOnly) { Write-Host 'AI_MEDIA_CHECK_PACKAGE_OK'; return }
    if ($Password) {
        $askpass = Join-Path $temp.FullName 'askpass.cmd'
        $env:PBL6_SSH_PASSWORD = $Password
        [IO.File]::WriteAllText($askpass,'@powershell.exe -NoLogo -NoProfile -NonInteractive -Command "[Console]::Write([Environment]::GetEnvironmentVariable(''PBL6_SSH_PASSWORD''))"' + "`r`n",[Text.Encoding]::ASCII)
        $env:SSH_ASKPASS=$askpass; $env:SSH_ASKPASS_REQUIRE='force'; $env:DISPLAY=':0'
    }
    & scp.exe @sshOptions $archive "${server}:.pbl6-ai-media-check-$deployId.tgz"
    if ($LASTEXITCODE -ne 0) { throw 'AI media upload failed.' }
    $activate = "bash -o pipefail -c 'tar -xOzf .pbl6-ai-media-check-$deployId.tgz scripts/test-ai-chat-media.sh | tr -d \\r > .pbl6-ai-media-check-$deployId.sh && bash .pbl6-ai-media-check-$deployId.sh $deployId'"
    & ssh.exe @sshOptions $server $activate
    if ($LASTEXITCODE -ne 0) { throw 'AI media isolation checks failed; no demo service was changed.' }
}
finally {
    Remove-Item Env:PBL6_SSH_PASSWORD -ErrorAction SilentlyContinue
    $resolvedTemp=[IO.Path]::GetFullPath($temp.FullName)
    if ($resolvedTemp -ne $expectedTemp) { throw 'Unexpected ai-media-check temporary path.' }
    Remove-Item -LiteralPath $resolvedTemp -Recurse -Force -ErrorAction SilentlyContinue
}
