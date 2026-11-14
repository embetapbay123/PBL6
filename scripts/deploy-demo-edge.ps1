param(
    [switch]$PackageOnly,
    [string]$Password = $env:DEPLOY_PASSWORD
)
if (-not $Password) { throw 'Set DEPLOY_PASSWORD explicitly for this legacy helper.' }

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$deployId = [Guid]::NewGuid().ToString('N')
$taskTemp = New-Item -ItemType Directory -Path (Join-Path ([IO.Path]::GetTempPath()) "pbl6-edge-$deployId")
$archive = Join-Path $taskTemp.FullName 'edge.tgz'
$server = 'realkhoa@alpine.khoav4.com'
$sshOptions = @('-o', 'StrictHostKeyChecking=accept-new', '-o', 'ConnectTimeout=15')
try {
    $paths = & git -C $repo -c core.quotePath=false ls-files --cached --others --exclude-standard -- backend/ai-service docs/contracts
    if ($LASTEXITCODE -ne 0) { throw 'Could not list gateway guard sources.' }
    $paths = @($paths | Sort-Object -Unique | Where-Object {
        $_ -notmatch '(^|/)\.env(\.|$)' -and $_ -notmatch '(^|/)(__pycache__|\.pytest_cache|\.venv|node_modules)(/|$)' -and
        (Test-Path -LiteralPath (Join-Path $repo $_) -PathType Leaf)
    })
    $paths += '.dockerignore', 'infrastructure/compose.edge-guard.yaml', 'scripts/install_edge_guard.py', 'scripts/deploy-demo-edge.sh', 'scripts/verify_edge_guard.py'
    $list = Join-Path $taskTemp.FullName 'files.txt'
    [IO.File]::WriteAllText($list, (($paths -join "`n") + "`n"), [Text.UTF8Encoding]::new($false))
    & tar.exe -C $repo -czf $archive --no-recursion -T $list
    if ($LASTEXITCODE -ne 0) { throw 'Could not package gateway guard.' }
    if ($PackageOnly) { Write-Host "Gateway guard package passed ($($paths.Count) files)."; return }
    $askpass = Join-Path $taskTemp.FullName 'askpass.cmd'
    $env:PBL6_SSH_PASSWORD = $Password
    [IO.File]::WriteAllText($askpass, '@powershell.exe -NoLogo -NoProfile -NonInteractive -Command "[Console]::Write([Environment]::GetEnvironmentVariable(''PBL6_SSH_PASSWORD''))"' + "`r`n", [Text.Encoding]::ASCII)
    $env:SSH_ASKPASS=$askpass; $env:SSH_ASKPASS_REQUIRE='force'; $env:DISPLAY=':0'
    & scp.exe -P 2122 @sshOptions $archive "${server}:.pbl6-edge-$deployId.tgz"
    if ($LASTEXITCODE -ne 0) { throw 'Gateway guard upload failed.' }
    $activate = "bash -o pipefail -c 'tar -xOzf .pbl6-edge-$deployId.tgz scripts/deploy-demo-edge.sh | tr -d \\r > .pbl6-edge-$deployId.sh && bash .pbl6-edge-$deployId.sh $deployId'"
    & ssh.exe -p 2122 @sshOptions $server $activate
    if ($LASTEXITCODE -ne 0) { throw 'Gateway rollout failed; inspect its rollback result.' }
    Write-Host 'Demo gateway rate limits deployed and public smoke passed.'
}
finally {
    Remove-Item Env:PBL6_SSH_PASSWORD -ErrorAction SilentlyContinue
    $resolved = [IO.Path]::GetFullPath($taskTemp.FullName)
    $expected = [IO.Path]::GetFullPath((Join-Path ([IO.Path]::GetTempPath()) "pbl6-edge-$deployId"))
    if ($resolved -ne $expected) { throw 'Unexpected deployment temporary path.' }
    Remove-Item -LiteralPath $resolved -Recurse -Force -ErrorAction SilentlyContinue
}
