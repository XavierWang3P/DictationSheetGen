# DictationSheetGen Deploy Script
param(
    [string]$RemoteHost = "gz",
    [string]$DeployPath = "/www/sites/run.i2c.icu/index/dictation",
    [string]$PublicUrl = "https://run.i2c.icu/dictation/"
)

$ErrorActionPreference = "Stop"

Write-Host "=== 1. Building Production Bundle ===" -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed, aborting deployment." -ForegroundColor Red
    exit 1
}

$distFile = Join-Path $PSScriptRoot "dist\index.html"
if (-not (Test-Path $distFile)) {
    Write-Host "Build artifact not found: $distFile" -ForegroundColor Red
    exit 1
}

Write-Host "=== 2. Uploading to Remote Server ($RemoteHost) ===" -ForegroundColor Cyan
scp $distFile "$($RemoteHost):/tmp/index.html"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Upload failed. Check SSH connection." -ForegroundColor Red
    exit 1
}

Write-Host "=== 3. Deploying to Target Directory ($DeployPath) ===" -ForegroundColor Cyan
$cmd = "sudo mkdir -p $DeployPath; sudo cp /tmp/index.html $DeployPath/index.html; sudo chmod 644 $DeployPath/index.html; sudo rm -f /tmp/index.html; sudo ln -sfn $DeployPath /www/sites/run.i2c.icu/index/DictationSheetGen"
ssh $RemoteHost $cmd
if ($LASTEXITCODE -ne 0) {
    Write-Host "Remote deployment command failed." -ForegroundColor Red
    exit 1
}

Write-Host "=== 4. Verifying Deployment ===" -ForegroundColor Cyan
ssh $RemoteHost "curl -sI $PublicUrl | head -n 5"

Write-Host ""
Write-Host "Deployment Successful!" -ForegroundColor Green
Write-Host "URL: $PublicUrl" -ForegroundColor Yellow
Write-Host "Alternative URL: https://run.i2c.icu/DictationSheetGen/" -ForegroundColor Yellow