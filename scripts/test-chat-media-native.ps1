param(
    [switch]$PackageOnly,
    [string]$Password = $env:DEPLOY_PASSWORD
)
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$deployId = [Guid]::NewGuid().ToString('N')
$expectedTemp = [IO.Path]::GetFullPath((Join-Path ([IO.Path]::GetTempPath()) "pbl6-media-native-$deployId"))
$temp = New-Item -ItemType Directory -Path $expectedTemp
$archive = Join-Path $temp.FullName 'media-native.tgz'
$server = 'realkhoa@alpine.khoav4.com'
$sshOptions = @('-o','StrictHostKeyChecking=accept-new','-o','ConnectTimeout=15')
try {
    $files = @(
        'backend/dist/identity-store-service/src/messaging/media-files.js',
        'backend/dist/identity-store-service/src/messaging/media-files.js.map',
        'backend/dist/identity-store-service/src/messaging/media-process.js',
        'backend/dist/identity-store-service/src/messaging/media-process.js.map',
        'backend/dist/tests/integration/chat-media-processing.test.js',
        'backend/dist/tests/integration/chat-media-processing.test.js.map',
        'backend/identity-store-service/src/messaging/media-files.ts',
        'backend/identity-store-service/src/messaging/media-process.ts',
        'backend/tests/integration/chat-media-processing.test.ts',
        'backend/tests/integration/chat-media-lifecycle.test.ts',
        'backend/dist/tests/integration/chat-media-lifecycle.test.js',
        'backend/dist/tests/integration/chat-media-lifecycle.test.js.map',
        'backend/identity-store-service/src/messaging/media-scope.ts',
        'backend/identity-store-service/src/messaging/media.service.ts',
        'backend/identity-store-service/src/messaging/media.controller.ts',
        'backend/identity-store-service/src/messaging/messaging.service.ts',
        'backend/dist/identity-store-service/src/messaging/media-scope.js',
        'backend/dist/identity-store-service/src/messaging/media.service.js',
        'backend/dist/identity-store-service/src/messaging/media.controller.js',
        'backend/shared/src/request-contract.ts',
        'backend/shared/src/contracts.runtime.generated.json',
        'backend/shared/src/dtos.generated.ts',
        'backend/dist/shared/src/request-contract.js',
        'backend/dist/shared/src/contracts.runtime.generated.json',
        'backend/dist/shared/src/dtos.generated.js',
        'backend/dist/identity-store-service/src/messaging/messaging.service.js',
        'backend/identity-store-service/migrations/015_chat_attachments.sql',
        'scripts/test-chat-media-native.sh'
    )
    foreach ($file in $files) {
        if (!(Test-Path -LiteralPath (Join-Path $repo $file) -PathType Leaf)) { throw "Build backend before deploying: missing $file" }
    }
    $list = Join-Path $temp.FullName 'files.txt'
    [IO.File]::WriteAllText($list, (($files -join "`n") + "`n"), [Text.UTF8Encoding]::new($false))
    & tar.exe -C $repo -czf $archive --no-recursion -T $list
    if ($LASTEXITCODE -ne 0) { throw 'Native media package failed.' }
    if ($PackageOnly) { Write-Host 'MEDIA_NATIVE_PACKAGE_OK'; return }
    if ($Password) {
        $askpass = Join-Path $temp.FullName 'askpass.cmd'
        $env:PBL6_SSH_PASSWORD = $Password
        [IO.File]::WriteAllText($askpass,'@powershell.exe -NoLogo -NoProfile -NonInteractive -Command "[Console]::Write([Environment]::GetEnvironmentVariable(''PBL6_SSH_PASSWORD''))"' + "`r`n",[Text.Encoding]::ASCII)
        $env:SSH_ASKPASS=$askpass; $env:SSH_ASKPASS_REQUIRE='force'; $env:DISPLAY=':0'
    }
    & scp.exe -P 2122 @sshOptions $archive "${server}:.pbl6-media-native-$deployId.tgz"
    if ($LASTEXITCODE -ne 0) { throw 'Native media upload failed.' }
    $activate = "bash -o pipefail -c 'tar -xOzf .pbl6-media-native-$deployId.tgz scripts/test-chat-media-native.sh | tr -d \\r > .pbl6-media-native-$deployId.sh && bash .pbl6-media-native-$deployId.sh $deployId'"
    & ssh.exe -p 2122 @sshOptions $server $activate
    if ($LASTEXITCODE -ne 0) { throw 'Native media isolation checks failed; no demo service was changed.' }
}
finally {
    Remove-Item Env:PBL6_SSH_PASSWORD -ErrorAction SilentlyContinue
    $resolvedTemp=[IO.Path]::GetFullPath($temp.FullName)
    if ($resolvedTemp -ne $expectedTemp) { throw 'Unexpected media-native temporary path.' }
    Remove-Item -LiteralPath $resolvedTemp -Recurse -Force -ErrorAction SilentlyContinue
}
