param(
    [switch]$PackageOnly,
    [string]$Password = $env:DEPLOY_PASSWORD
)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$deployId = [Guid]::NewGuid().ToString('N')
$temp = New-Item -ItemType Directory -Path (Join-Path ([IO.Path]::GetTempPath()) "pbl6-web-$deployId")
$archive = Join-Path $temp.FullName 'frontend.tgz'
$list = Join-Path $temp.FullName 'files.txt'
$remoteArchive = ".pbl6-web-$deployId.tgz"
$server = 'realkhoa@alpine.khoav4.com'
$sshOptions = @('-o', 'StrictHostKeyChecking=accept-new', '-o', 'ConnectTimeout=15')

try {
    Write-Host 'Packaging local frontend files...'
    $paths = & git -C $repo -c core.quotePath=false ls-files --cached --others --exclude-standard -- frontend
    if ($LASTEXITCODE -ne 0) { throw 'Could not list frontend files.' }
    $paths = @($paths | Sort-Object -Unique | Where-Object {
        $_ -notmatch '(^|/)\.env(\.|$)' -and (Test-Path -LiteralPath (Join-Path $repo $_) -PathType Leaf)
    })
    if ($paths -notcontains 'frontend/Dockerfile') { throw 'Frontend Dockerfile missing from package.' }
    $paths += '.dockerignore', 'scripts/deploy-demo-web.sh'
    [IO.File]::WriteAllText($list, (($paths -join "`n") + "`n"), [Text.UTF8Encoding]::new($false))
    & tar.exe -C $repo -czf $archive --no-recursion -T $list
    if ($LASTEXITCODE -ne 0) { throw 'Could not create deployment package.' }

    if ($PackageOnly) {
        Write-Host "Package check passed ($($paths.Count) files)."
        return
    }

    if ($Password) {
        $askpass = Join-Path $temp.FullName 'askpass.cmd'
        $env:PBL6_SSH_PASSWORD = $Password
        [IO.File]::WriteAllText($askpass, '@powershell.exe -NoLogo -NoProfile -NonInteractive -Command "[Console]::Write([Environment]::GetEnvironmentVariable(''PBL6_SSH_PASSWORD''))"' + "`r`n", [Text.Encoding]::ASCII)
        $env:SSH_ASKPASS = $askpass
        $env:SSH_ASKPASS_REQUIRE = 'force'
        $env:DISPLAY = ':0'
    }

    Write-Host 'Uploading to demo server...'
    & scp.exe -P 2122 @sshOptions $archive "${server}:$remoteArchive"
    if ($LASTEXITCODE -ne 0) { throw 'Upload failed.' }

    Write-Host 'Building and deploying demo web...'
    $activate = "bash -o pipefail -c 'tar -xOzf $remoteArchive scripts/deploy-demo-web.sh | tr -d \\r | bash -s -- $deployId'"
    & ssh.exe -p 2122 @sshOptions $server $activate
    if ($LASTEXITCODE -ne 0) { throw 'Deployment failed. See the server output above.' }
    Write-Host 'Demo web deployed and verified at https://demo.congnguyen.me/'
}
finally {
    Remove-Item Env:PBL6_SSH_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $archive, $list -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $temp.FullName -Recurse -Force -ErrorAction SilentlyContinue
}
