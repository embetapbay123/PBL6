param(
    [string]$Password = $(if ($env:DEPLOY_PASSWORD) { $env:DEPLOY_PASSWORD } else { '1' })
)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$server = 'realkhoa@alpine.khoav4.com'
$sshOptions = @('-o', 'StrictHostKeyChecking=accept-new', '-o', 'ConnectTimeout=15')

$temp = [IO.Path]::GetTempPath()
$askpass = Join-Path $temp 'askpass.cmd'
[IO.File]::WriteAllText($askpass, "@echo $Password`r`n", [Text.Encoding]::ASCII)
$env:SSH_ASKPASS = $askpass
$env:SSH_ASKPASS_REQUIRE = 'force'
$env:DISPLAY = ':0'

$tarFile = Join-Path $temp 'backend-update.tar.gz'

try {
    Write-Host '1. Deploying frontend...'
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'deploy-demo-web.ps1')
    if ($LASTEXITCODE -ne 0) { throw 'Frontend deployment failed.' }

    Write-Host '2. Packaging backend and contracts...'
    Push-Location $repo
    try {
        & tar.exe --exclude="node_modules" --exclude="dist" --exclude=".git" -czf $tarFile backend docs
        if ($LASTEXITCODE -ne 0) { throw 'Packaging backend failed.' }
    }
    finally {
        Pop-Location
    }

    Write-Host '3. Uploading backend update to demo server...'
    & scp.exe -P 2122 @sshOptions $tarFile "${server}:/home/realkhoa/pbl6-demo/backend-update.tar.gz"
    if ($LASTEXITCODE -ne 0) { throw 'Backend tarball upload failed.' }

    Write-Host '4. Extracting backend files on demo server...'
    & ssh.exe -p 2122 @sshOptions $server "cd ~/pbl6-demo && tar -xzf backend-update.tar.gz && rm backend-update.tar.gz"
    if ($LASTEXITCODE -ne 0) { throw 'Extracting tarball on server failed.' }

    Write-Host '5. Rebuilding and restarting m1 (catalog-service) and m2 (commerce-service) on demo server...'
    $rebuildCmd = "cd ~/pbl6-demo && docker compose -p pbl6-demo --env-file infrastructure/.env -f infrastructure/compose.yaml build m1 m2 && docker compose -p pbl6-demo --env-file infrastructure/.env -f infrastructure/compose.yaml up -d --no-deps m1 m2"
    & ssh.exe -p 2122 @sshOptions $server $rebuildCmd
    if ($LASTEXITCODE -ne 0) { throw 'Rebuilding m1/m2 failed.' }

    Write-Host '6. Verifying search API on demo server...'
    Start-Sleep -Seconds 5
    $test = Invoke-RestMethod -Uri "https://demo.congnguyen.me/api/v1/products?q=%C3%A1o" -Method Get
    Write-Host "Search results for 'áo': $($test.total) items"
    Write-Host "First item: $($test.items[0].title)"
    if ($test.items[0].title -notlike "*Áo*") {
        Write-Warning "First item does not have 'Áo' in title: $($test.items[0].title)"
    } else {
        Write-Host "VERIFICATION_SUCCESS: First item is '$($test.items[0].title)'!"
    }

    Write-Host '7. Verifying store products search API on demo server...'
    $storeTest = Invoke-RestMethod -Uri "https://demo.congnguyen.me/api/v1/stores/d01b0f73-9130-4d8e-ba65-631ff9c6cd6a/products?q=ao+hoodie" -Method Get
    Write-Host "Store search results for 'ao hoodie' in An Nhiên Studio: $($storeTest.total) items"
    if ($storeTest.total -eq 1 -and $storeTest.items[0].title -like "*hoodie*") {
        Write-Host "VERIFICATION_SUCCESS: Found exactly 1 item '$($storeTest.items[0].title)'!"
    } else {
        Write-Warning "Store search returned unexpected: total=$($storeTest.total)"
    }
}
finally {
    Remove-Item -LiteralPath $askpass -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $tarFile -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath (Join-Path $repo 'backend-update.tar.gz') -ErrorAction SilentlyContinue
}
