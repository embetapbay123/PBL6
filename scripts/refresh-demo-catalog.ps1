param([string]$Password = $env:DEPLOY_PASSWORD)
if (-not $Password) { throw 'Set DEPLOY_PASSWORD explicitly for this legacy helper.' }

$ErrorActionPreference='Stop'
$repo=Split-Path -Parent $PSScriptRoot
$runId=[Guid]::NewGuid().ToString('N')
$expectedTemp=[IO.Path]::GetFullPath((Join-Path ([IO.Path]::GetTempPath()) "pbl6-expand-$runId"))
$temp=New-Item -ItemType Directory -Path $expectedTemp
$server='realkhoa@alpine.khoav4.com'
$opts=@('-o','StrictHostKeyChecking=accept-new','-o','ConnectTimeout=15')
try {
 $files=@('scripts/seed_demo_expansion.cjs','scripts/seed_distinct_catalog.cjs','scripts/cleanup_test_catalog.cjs','scripts/run-distinct-catalog.sh','data/marketplace-distinct-2026.json')
 $list=Join-Path $temp.FullName 'files.txt';$archive=Join-Path $temp.FullName 'source.tgz'
 [IO.File]::WriteAllText($list,(($files -join "`n")+"`n"),[Text.UTF8Encoding]::new($false))
 & tar.exe -C $repo -czf $archive --no-recursion -T $list
 if($LASTEXITCODE -ne 0){throw 'Seed source package failed.'}
 $askpass=Join-Path $temp.FullName 'askpass.cmd'
 $env:PBL6_SSH_PASSWORD = $Password
 [IO.File]::WriteAllText($askpass,'@powershell.exe -NoLogo -NoProfile -NonInteractive -Command "[Console]::Write([Environment]::GetEnvironmentVariable(''PBL6_SSH_PASSWORD''))"' + "`r`n",[Text.Encoding]::ASCII)
 $env:SSH_ASKPASS=$askpass;$env:SSH_ASKPASS_REQUIRE='force';$env:DISPLAY=':0'
 & scp.exe -P 2122 @opts $archive "${server}:.pbl6-expand-$runId.tgz"
 if($LASTEXITCODE -ne 0){throw 'Seed upload failed.'}
 $activate="bash -o pipefail -c 'tar -xOzf .pbl6-expand-$runId.tgz scripts/run-distinct-catalog.sh | tr -d \\r > .pbl6-expand-$runId.sh && bash .pbl6-expand-$runId.sh $runId'"
 & ssh.exe -p 2122 @opts $server $activate
 if($LASTEXITCODE -ne 0){throw 'Expansion stopped. Its durable report and backups remain on the demo host; rerun only after inspecting the reported error.'}
 $localReport=Join-Path $repo 'outputs/catalog-refresh-2026-11-14/report.json'
 New-Item -ItemType Directory -Path (Split-Path -Parent $localReport) -Force | Out-Null
 & scp.exe -P 2122 @opts "${server}:pbl6-demo/artifacts/catalog-refresh-2026-v1/report.json" $localReport
 if($LASTEXITCODE -ne 0){throw 'Expansion passed but report download failed.'}
}
finally {
    Remove-Item Env:PBL6_SSH_PASSWORD -ErrorAction SilentlyContinue
 $resolved=[IO.Path]::GetFullPath($temp.FullName)
 if($resolved -ne $expectedTemp){throw 'Unexpected expansion temporary directory.'}
 Remove-Item -LiteralPath $resolved -Recurse -Force -ErrorAction SilentlyContinue
}
