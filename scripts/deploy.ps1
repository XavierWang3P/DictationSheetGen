# DictationSheetGen Deploy Script
param(
    [string]$RemoteHost = "gz",
    [string]$DeployPath = "/www/sites/run.i2c.icu/index/dictation",
    [string]$PublicUrl = "https://run.i2c.icu/dictation/"
)

$ErrorActionPreference = "Stop"

function ConvertTo-PosixShellLiteral {
    param([Parameter(Mandatory = $true)][string]$Value)
    $singleQuote = [string][char]39
    $doubleQuote = [string][char]34
    $escapedSingleQuote = $singleQuote + $doubleQuote + $singleQuote + $doubleQuote + $singleQuote
    return $singleQuote + $Value.Replace($singleQuote, $escapedSingleQuote) + $singleQuote
}

if ($RemoteHost -notmatch '^(?:[A-Za-z0-9][A-Za-z0-9._-]*@)?[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?$') {
    throw "RemoteHost must be an SSH host name or user@host without command-line options."
}
if ($DeployPath -notmatch '^/(?:[A-Za-z0-9._-]+/?)+$' -or $DeployPath -match '(?:^|/)\.\.?(/|$)') {
    throw "DeployPath must be an absolute POSIX path without shell metacharacters or dot segments."
}
$publicUri = $null
if (-not [Uri]::TryCreate($PublicUrl, [UriKind]::Absolute, [ref]$publicUri) -or
    $publicUri.Scheme -notin @('http', 'https') -or
    -not [string]::IsNullOrEmpty($publicUri.UserInfo) -or
    -not [string]::IsNullOrEmpty($publicUri.Fragment)) {
    throw "PublicUrl must be an absolute HTTP(S) URL without credentials or a fragment."
}

Write-Host "=== 1. Building Production Bundle ===" -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed, aborting deployment." -ForegroundColor Red
    exit 1
}

$projectRoot = Split-Path $PSScriptRoot -Parent
$distDir = Join-Path $projectRoot "dist"
$distIndex = Join-Path $distDir "index.html"
if (-not (Test-Path $distIndex)) {
    Write-Host "Build artifact not found: $distIndex" -ForegroundColor Red
    exit 1
}

Write-Host "=== 2. Uploading to Remote Server ($RemoteHost) ===" -ForegroundColor Cyan
$deploymentId = [Guid]::NewGuid().ToString('N')
$remoteTempDir = "/tmp/dictation-dist-$deploymentId"
$publicVerifyUrl = $publicUri.AbsoluteUri + $(if ($publicUri.Query) { '&' } else { '?' }) + "deploy=$deploymentId"
$remoteTempLiteral = ConvertTo-PosixShellLiteral $remoteTempDir
$deployPathLiteral = ConvertTo-PosixShellLiteral $DeployPath
$publicUrlLiteral = ConvertTo-PosixShellLiteral $publicVerifyUrl
$deploymentIdLiteral = ConvertTo-PosixShellLiteral $deploymentId
$remoteTempPrepared = $false

try {
    $prepareCommand = "set -eu; umask 077; mkdir -- $remoteTempLiteral"
    & ssh $RemoteHost $prepareCommand
    if ($LASTEXITCODE -ne 0) {
        throw "Unable to prepare the remote temporary directory."
    }
    $remoteTempPrepared = $true

    & scp -r -- $distDir "$($RemoteHost):$remoteTempDir/"
    if ($LASTEXITCODE -ne 0) {
        throw "Upload failed. Check SSH connection."
    }

    Write-Host "=== 3. Staging and Atomically Switching ($DeployPath) ===" -ForegroundColor Cyan
    $deployCommand = @(
        'set -eu'
        "temp=$remoteTempLiteral"
        "target=$deployPathLiteral"
        "public_url=$publicUrlLiteral"
        "deployment_id=$deploymentIdLiteral"
        'parent=${target%/*}'
        'if [ -z "$parent" ]; then parent=/; fi'
        'releases="$parent/.dictation-releases"'
        'release="$releases/$deployment_id"'
        'candidate_link="$parent/.dictation-link-$deployment_id"'
        'rollback_link="$parent/.dictation-rollback-$deployment_id"'
        'previous_link="$parent/.dictation-previous"'
        'previous_tmp="$parent/.dictation-previous-$deployment_id"'
        'lock_dir="$parent/.dictation-deploy.lock"'
        'legacy_holder='
        'old_target='
        'activation=none'
        'lock_acquired=0'
        'atomic_exchange() {'
        '  sudo python3 - "$1" "$2" <<''PY'''
        'import ctypes'
        'import os'
        'import sys'
        'libc = ctypes.CDLL(None, use_errno=True)'
        'renameat2 = getattr(libc, "renameat2", None)'
        'if renameat2 is None:'
        '    raise SystemExit("renameat2 is unavailable on this server")'
        'renameat2.argtypes = [ctypes.c_int, ctypes.c_char_p, ctypes.c_int, ctypes.c_char_p, ctypes.c_uint]'
        'renameat2.restype = ctypes.c_int'
        'if renameat2(-100, os.fsencode(sys.argv[1]), -100, os.fsencode(sys.argv[2]), 2) != 0:'
        '    error = ctypes.get_errno()'
        '    raise OSError(error, os.strerror(error))'
        'PY'
        '}'
        'cleanup() {'
        '  status=$?'
        '  trap - EXIT'
        '  set +e'
        '  if [ "$status" -ne 0 ]; then'
        '    rollback_status=0'
        '    release_safe_to_remove=0'
        '    case "$activation" in'
        '      symlink)'
        '        sudo rm -f -- "$rollback_link"'
        '        if sudo ln -s -- "$old_target" "$rollback_link" && sudo mv -Tf -- "$rollback_link" "$target"; then release_safe_to_remove=1; else rollback_status=1; fi'
        '        ;;'
        '      exchange)'
        '        if atomic_exchange "$target" "$legacy_holder" && sudo rm -f -- "$legacy_holder"; then release_safe_to_remove=1; else rollback_status=1; fi'
        '        ;;'
        '      new)'
        '        if sudo rm -f -- "$target"; then release_safe_to_remove=1; else rollback_status=1; fi'
        '        ;;'
        '      none)'
        '        release_safe_to_remove=1'
        '        ;;'
        '    esac'
        '    if [ "$release_safe_to_remove" -eq 1 ]; then sudo rm -rf -- "$release"; else echo "Retaining candidate release because it may still be live: $release" >&2; fi'
        '    if [ "$rollback_status" -ne 0 ]; then echo "Deployment failed and automatic rollback was incomplete." >&2; fi'
        '  fi'
        '  sudo rm -f -- "$candidate_link" "$rollback_link" "$previous_tmp"'
        '  if [ "$lock_acquired" -eq 1 ]; then sudo rmdir -- "$lock_dir" || true; fi'
        '  rm -rf -- "$temp"'
        '  exit "$status"'
        '}'
        'trap cleanup EXIT'
        'test -s "$temp/dist/index.html"'
        'sudo mkdir -p -- "$parent"'
        'if ! sudo mkdir -- "$lock_dir"; then echo "Another deployment is already running: $lock_dir" >&2; exit 1; fi'
        'lock_acquired=1'
        'sudo mkdir -p -- "$releases"'
        'sudo test ! -e "$release"'
        'sudo mkdir -- "$release"'
        'sudo cp -R -- "$temp/dist/." "$release/"'
        'sudo chmod -R u=rwX,go=rX -- "$release"'
        'sudo test -s "$release/index.html"'
        '(cd "$temp/dist" && find . -type f -print0 | sort -z | xargs -0 sha256sum) > "$temp/source.sha256"'
        '(cd "$release" && find . -type f -print0 | sort -z | xargs -0 sha256sum) > "$temp/release.sha256"'
        'diff -u "$temp/source.sha256" "$temp/release.sha256"'
        'sudo chmod -R a-w -- "$release"'
        'sudo rm -f -- "$candidate_link"'
        'sudo ln -s -- "$release" "$candidate_link"'
        'if sudo test -L "$target"; then'
        '  old_target=$(sudo readlink -- "$target")'
        '  sudo mv -Tf -- "$candidate_link" "$target"'
        '  activation=symlink'
        'elif sudo test -e "$target"; then'
        '  command -v python3 >/dev/null 2>&1 || { echo "python3 is required for the first atomic migration" >&2; exit 1; }'
        '  sudo python3 - <<''PY'''
        'import ctypes'
        'if getattr(ctypes.CDLL(None), "renameat2", None) is None:'
        '    raise SystemExit("renameat2 is unavailable on this server")'
        'PY'
        '  legacy_holder="$candidate_link"'
        '  atomic_exchange "$target" "$legacy_holder"'
        '  activation=exchange'
        'else'
        '  sudo mv -T -- "$candidate_link" "$target"'
        '  activation=new'
        'fi'
        'sudo test -s "$target/index.html"'
        'curl --fail --silent --show-error --location --head --max-time 20 -- "$public_url" >/dev/null'
        'if [ "$activation" = exchange ]; then'
        '  legacy_release="$releases/legacy-$deployment_id"'
        '  sudo test ! -e "$legacy_release"'
        '  sudo mv -T -- "$legacy_holder" "$legacy_release"'
        '  legacy_holder="$legacy_release"'
        '  old_target="$legacy_release"'
        'fi'
        'if [ -n "$old_target" ]; then'
        '  sudo rm -f -- "$previous_tmp"'
        '  sudo ln -s -- "$old_target" "$previous_tmp"'
        '  sudo mv -Tf -- "$previous_tmp" "$previous_link"'
        'fi'
        'activation=none'
    ) -join "`n"
    & ssh $RemoteHost $deployCommand
    if ($LASTEXITCODE -ne 0) {
        throw "Remote deployment or asset verification failed."
    }

    # 公网校验已在远端切换事务内完成；若校验失败，远端 EXIT trap 会先恢复上一版再返回失败。
    Write-Host "=== 4. Public Deployment Verified ===" -ForegroundColor Cyan
} finally {
    if ($remoteTempPrepared) {
        & ssh $RemoteHost "rm -rf -- $remoteTempLiteral" 2>$null | Out-Null
    }
}

Write-Host ""
Write-Host "Deployment Successful!" -ForegroundColor Green
Write-Host "URL: $PublicUrl" -ForegroundColor Yellow
