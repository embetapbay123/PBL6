param([switch]$PackageOnly,[string]$Password=$env:DEPLOY_PASSWORD,[string]$SshTarget='pbl6-demo',[int]$SshPort,[string]$ReleaseRoot,[ValidateSet('storefront','vouchers','chat')][string]$Suite='storefront')
$ErrorActionPreference='Stop'
$repo=Split-Path -Parent $PSScriptRoot
if($ReleaseRoot){$repo=[IO.Path]::GetFullPath($ReleaseRoot);if((Split-Path -Parent $repo) -ne 'C:\PBL6\artifacts'){throw 'Use an isolated release under artifacts.'}}
$testId=[Guid]::NewGuid().ToString('N')
$expectedTemp=[IO.Path]::GetFullPath((Join-Path ([IO.Path]::GetTempPath()) "pbl6-storefront-test-$testId"))
$temp=New-Item -ItemType Directory -Path $expectedTemp
$sshOptions=@('-o','StrictHostKeyChecking=accept-new','-o','ConnectTimeout=15')
$server=$SshTarget
if($PSBoundParameters.ContainsKey('SshPort')){$sshOptions+=@('-o',"Port=$SshPort")}
try {
 Push-Location $repo
 try {$files=@(& rg --files -uu backend/dist -g '*.js' -g '*.json')} finally {Pop-Location}
 $files+=@(& git -C $repo -c core.quotePath=false ls-files --cached --others --exclude-standard -- backend/catalog-service/migrations backend/commerce-service/migrations backend/identity-store-service/migrations | Where-Object {$_ -match '\.sql$'})
 $files+='scripts/test-storefront.sh'
 $files=@($files | ForEach-Object {$_ -replace '\\','/'} | Sort-Object -Unique)
 foreach($file in $files){if(!(Test-Path -LiteralPath (Join-Path $repo $file) -PathType Leaf)){throw "Missing isolated test input: $file"}}
 if(!(Test-Path -LiteralPath (Join-Path $repo 'backend/dist/tests/integration/storefront-lifecycle.test.js'))){throw 'Build the backend before testing storefront.'}
 [IO.File]::WriteAllText((Join-Path $temp 'files.txt'),(($files -join "`n")+"`n"),[Text.UTF8Encoding]::new($false))
 $archive=Join-Path $temp 'storefront-test.tgz'
 & tar.exe -C $repo -czf $archive --no-recursion -T (Join-Path $temp 'files.txt')
 if($LASTEXITCODE -ne 0){throw 'Storefront test package failed.'}
 if($PackageOnly){Write-Host 'STOREFRONT_TEST_PACKAGE_OK';return}
 if($Password){
  $askpass=Join-Path $temp 'askpass.cmd';$env:PBL6_SSH_PASSWORD=$Password
  [IO.File]::WriteAllText($askpass,'@powershell.exe -NoLogo -NoProfile -NonInteractive -Command "[Console]::Write([Environment]::GetEnvironmentVariable(''PBL6_SSH_PASSWORD''))"'+"`r`n",[Text.Encoding]::ASCII)
  $env:SSH_ASKPASS=$askpass;$env:SSH_ASKPASS_REQUIRE='force';$env:DISPLAY=':0'
 }
 & scp.exe @sshOptions $archive "${server}:.pbl6-storefront-test-$testId.tgz"
 if($LASTEXITCODE -ne 0){throw 'Storefront test upload failed.'}
 $activate="bash -o pipefail -c 'tar -xOzf .pbl6-storefront-test-$testId.tgz scripts/test-storefront.sh | tr -d \\r > .pbl6-storefront-test-$testId.sh && bash .pbl6-storefront-test-$testId.sh $testId $Suite'"
 & ssh.exe @sshOptions $server $activate
 if($LASTEXITCODE -ne 0){throw 'Storefront isolation checks failed; demo services were not changed.'}
} finally {
 Remove-Item Env:PBL6_SSH_PASSWORD -ErrorAction SilentlyContinue
 $resolvedTemp=[IO.Path]::GetFullPath($temp.FullName)
 if($resolvedTemp -ne $expectedTemp){throw 'Unexpected storefront test temporary path.'}
 Remove-Item -LiteralPath $resolvedTemp -Recurse -Force -ErrorAction SilentlyContinue
}
