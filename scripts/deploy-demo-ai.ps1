param(
    [switch]$PackageOnly,
    [string]$Password = $env:DEPLOY_PASSWORD
)
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$deployId = [Guid]::NewGuid().ToString('N')
$temp = New-Item -ItemType Directory -Path (Join-Path ([IO.Path]::GetTempPath()) "pbl6-ai-$deployId")
$archive = Join-Path $temp.FullName 'ai.tgz'
$list = Join-Path $temp.FullName 'files.txt'
$remoteArchive = ".pbl6-ai-$deployId.tgz"
$server = 'realkhoa@alpine.khoav4.com'
$sshOptions = @('-o', 'StrictHostKeyChecking=accept-new', '-o', 'ConnectTimeout=15')
try {
    $paths = & git -C $repo -c core.quotePath=false ls-files --cached --others --exclude-standard -- backend/ai-service docs/contracts
    if ($LASTEXITCODE -ne 0) { throw 'Could not list M4 sources.' }
    $paths = @($paths | Sort-Object -Unique | Where-Object {
        $_ -notmatch '(^|/)\.env(\.|$)' -and
        $_ -notmatch '(^|/)(__pycache__|\.pytest_cache|\.venv|node_modules)(/|$)' -and
        (Test-Path -LiteralPath (Join-Path $repo $_) -PathType Leaf)
    })
    $paths += '.dockerignore', 'infrastructure/compose.try-on.yaml', 'scripts/deploy-demo-ai.sh'
    [IO.File]::WriteAllText($list, (($paths -join "`n") + "`n"), [Text.UTF8Encoding]::new($false))
    & tar.exe -C $repo -czf $archive --no-recursion -T $list
    if ($LASTEXITCODE -ne 0) { throw 'Could not package M4.' }
    if ($PackageOnly) { Write-Host "M4 package passed ($($paths.Count) files)."; return }
    if ($Password) {
        $askpass = Join-Path $temp.FullName 'askpass.cmd'
        $env:PBL6_SSH_PASSWORD = $Password
        [IO.File]::WriteAllText($askpass, '@powershell.exe -NoLogo -NoProfile -NonInteractive -Command "[Console]::Write([Environment]::GetEnvironmentVariable(''PBL6_SSH_PASSWORD''))"' + "`r`n", [Text.Encoding]::ASCII)
        $env:SSH_ASKPASS = $askpass; $env:SSH_ASKPASS_REQUIRE = 'force'; $env:DISPLAY = ':0'
    }
    Write-Host 'Uploading M4 sources and targeted rollout...'
    & scp.exe -P 2122 @sshOptions $archive "${server}:$remoteArchive"
    if ($LASTEXITCODE -ne 0) { throw 'M4 upload failed.' }
    Write-Host 'Building M4, applying migrations and checking public endpoints...'
    # Execute a file: Docker may consume stdin, so never pipe this script into bash.
    $activate = "bash -o pipefail -c 'tar -xOzf $remoteArchive scripts/deploy-demo-ai.sh | tr -d \\r > .pbl6-ai-$deployId.sh && bash .pbl6-ai-$deployId.sh $deployId'"
    & ssh.exe -p 2122 @sshOptions $server $activate
    if ($LASTEXITCODE -ne 0) { throw 'M4 deployment failed; inspect the rollback result above.' }
    Write-Host 'Demo M4 and try-on worker deployed; public checks passed. Generation remains disabled until configured.'
}
finally {
    Remove-Item Env:PBL6_SSH_PASSWORD -ErrorAction SilentlyContinue
    # Check the absolute cleanup target before recursive removal.
    $resolvedTemp = [IO.Path]::GetFullPath($temp.FullName)
    $expectedTemp = [IO.Path]::GetFullPath((Join-Path ([IO.Path]::GetTempPath()) "pbl6-ai-$deployId"))
    if ($resolvedTemp -ne $expectedTemp) { throw 'Unexpected temporary deployment path.' }
    Remove-Item -LiteralPath $resolvedTemp -Recurse -Force -ErrorAction SilentlyContinue
}
