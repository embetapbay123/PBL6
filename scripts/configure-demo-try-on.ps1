param(
    [string]$Password = $env:DEPLOY_PASSWORD
)
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$operationId = [Guid]::NewGuid().ToString('N')
$temp = New-Item -ItemType Directory -Path (Join-Path ([IO.Path]::GetTempPath()) "pbl6-tryon-secret-$operationId")
$bundle = Join-Path $temp.FullName 'runtime.json'
$remoteDir = ".pbl6-tryon-secret-$operationId"
$server = 'realkhoa@alpine.khoav4.com'
$sshOptions = @('-o', 'StrictHostKeyChecking=accept-new', '-o', 'ConnectTimeout=15')
$compose = 'docker compose -p pbl6-demo --env-file infrastructure/.env -f infrastructure/compose.yaml -f infrastructure/compose.try-on.yaml'
try {
    $writer = @'
import json,sys
from pathlib import Path
source=Path(sys.argv[1])/'infrastructure/.env'
values={}
for line in source.read_text().splitlines():
 if '=' not in line or line.startswith('#'):continue
 name,value=line.split('=',1)
 if len(value)>=2 and value[0]==value[-1] and value[0] in "'\"":value=value[1:-1]
 values[name]=value
names=['OPENAI_API_KEY','TRY_ON_DEMO_MODE','TRY_ON_DEMO_PASSWORD_HASH','TRY_ON_DAILY_BUDGET_MICRO_USD','TRY_ON_MONTHLY_BUDGET_MICRO_USD']
payload={name:values.get(name,'') for name in names};payload['TRY_ON_ENABLED']='1'
if not payload['OPENAI_API_KEY'] or payload['TRY_ON_DEMO_MODE']!='1' or not payload['TRY_ON_DEMO_PASSWORD_HASH']:raise SystemExit('Configure private backend key and demo password hash first.')
Path(sys.argv[2]).write_text(json.dumps(payload))
'@
    $writer | & python - $repo $bundle
    if ($LASTEXITCODE -ne 0) { throw 'Could not prepare the private runtime bundle.' }
    if ($Password) {
        $askpass = Join-Path $temp.FullName 'askpass.cmd'
        $env:PBL6_SSH_PASSWORD = $Password
        [IO.File]::WriteAllText($askpass, '@powershell.exe -NoLogo -NoProfile -NonInteractive -Command "[Console]::Write([Environment]::GetEnvironmentVariable(''PBL6_SSH_PASSWORD''))"' + "`r`n", [Text.Encoding]::ASCII)
        $env:SSH_ASKPASS = $askpass; $env:SSH_ASKPASS_REQUIRE = 'force'; $env:DISPLAY = ':0'
    }
    & ssh.exe -p 2122 @sshOptions $server "umask 077; mkdir $remoteDir"
    if ($LASTEXITCODE -ne 0) { throw 'Could not create a private transfer directory.' }
    & scp.exe -P 2122 @sshOptions $bundle "${server}:$remoteDir/runtime.json"
    if ($LASTEXITCODE -ne 0) { throw 'Private runtime transfer failed.' }
    & scp.exe -P 2122 @sshOptions (Join-Path $PSScriptRoot 'configure-demo-try-on.py') "${server}:$remoteDir/configure.py"
    if ($LASTEXITCODE -ne 0) { throw 'Runtime helper transfer failed.' }
    # Check that the installed application contains the backend password gate before enabling anything.
    $activate = "cd ~/pbl6-demo && $compose exec -T m4 python -c 'from app.try_on.demo import require_demo_password' && python3 ../$remoteDir/configure.py --secrets-file ../$remoteDir/runtime.json && $compose up -d --no-deps --no-build --pull never m4 worker-try-on && $compose exec -T m4 python -c 'from app.try_on.config import Settings; s=Settings.load(); assert s.ready and s.demo_mode' && $compose exec -T worker-try-on python -m app.try_on.operator status"
    & ssh.exe -p 2122 @sshOptions $server $activate
    if ($LASTEXITCODE -ne 0) {
        & ssh.exe -p 2122 @sshOptions $server "cd ~/pbl6-demo && python3 ../$remoteDir/configure.py --disable && $compose up -d --no-deps --no-build --pull never m4 worker-try-on"
        throw 'Demo activation failed; generation was disabled again.'
    }
    $healthCode = @'
import httpx,time
for attempt in range(10):
 try:
  response=httpx.get("http://127.0.0.1:3104/health/ready",timeout=3)
  if response.status_code==200:break
 except httpx.HTTPError:pass
 time.sleep(2)
else:raise SystemExit("M4 readiness failed after activation")
print("M4_READY_AFTER_ACTIVATION")
'@
    # Send only non-secret health-check code on stdin; Windows OpenSSH strips nested quotes in -c arguments.
    $healthCode | & ssh.exe -p 2122 @sshOptions $server "cd ~/pbl6-demo && $compose exec -T m4 python -"
    if ($LASTEXITCODE -ne 0) {
        & ssh.exe -p 2122 @sshOptions $server "cd ~/pbl6-demo && python3 ../$remoteDir/configure.py --disable && $compose up -d --no-deps --no-build --pull never m4 worker-try-on"
        throw 'M4 readiness failed; generation was disabled again.'
    }
    Write-Host 'DEMO_RUNTIME_CONFIGURED: backend key installed, password mode enabled, approved budgets preserved.'
}
finally {
    Remove-Item Env:PBL6_SSH_PASSWORD -ErrorAction SilentlyContinue
    & ssh.exe -p 2122 @sshOptions $server "rm -rf -- $remoteDir"
    $resolvedTemp = [IO.Path]::GetFullPath($temp.FullName)
    $expectedTemp = [IO.Path]::GetFullPath((Join-Path ([IO.Path]::GetTempPath()) "pbl6-tryon-secret-$operationId"))
    if ($resolvedTemp -ne $expectedTemp) { throw 'Unexpected private temporary path.' }
    Remove-Item -LiteralPath $resolvedTemp -Recurse -Force -ErrorAction SilentlyContinue
}
