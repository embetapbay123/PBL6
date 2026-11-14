[CmdletBinding()]
param(
    [string]$CollectionPath,
    [string]$EnvironmentPath,
    [string]$BaseUrl
)

$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false

$repoRoot = Split-Path -Parent $PSScriptRoot
if (-not $CollectionPath) {
    $CollectionPath = Join-Path $repoRoot 'docs\kiem-thu\PBL6_API_Test.postman_collection.json'
}

$collection = (Resolve-Path -LiteralPath $CollectionPath).Path
$npx = (Get-Command npx.cmd -CommandType Application | Select-Object -First 1).Source
$newmanArgs = @('--yes', 'newman@6.2.1', 'run', $collection, '--timeout-request', '15000')

if ($EnvironmentPath) {
    $environment = (Resolve-Path -LiteralPath $EnvironmentPath).Path
    $newmanArgs += @('--environment', $environment)
}

if ($BaseUrl) {
    $newmanArgs += @('--env-var', "base_url=$($BaseUrl.TrimEnd('/'))")
}

$runId = '{0}-{1}' -f (Get-Date -Format 'yyyyMMdd-HHmmss'), [guid]::NewGuid().ToString('N').Substring(0, 8)
$reportDirectory = Join-Path $repoRoot "artifacts\postman\$runId"
New-Item -ItemType Directory -Path $reportDirectory -Force | Out-Null
$reportPath = Join-Path $reportDirectory 'junit.xml'
$newmanArgs += @('--reporters', 'cli,junit', '--reporter-junit-export', $reportPath)

& $npx @newmanArgs
$runExitCode = $LASTEXITCODE

if (Test-Path -LiteralPath $reportPath -PathType Leaf) {
    Write-Host "JUnit report: $reportPath"
}

exit $runExitCode
