# ========================================================
# AIMaster CLI 상태바 (Codex 컬러 테마) 원클릭 셋업 스크립트
# ========================================================

$ErrorActionPreference = "Stop"

$userProfile = $env:USERPROFILE
$agyDir = Join-Path $userProfile ".gemini\antigravity-cli"
$orcaHooksDir = Join-Path $userProfile ".orca\agent-hooks"
$claudeDir = Join-Path $userProfile ".claude"

Write-Host ">>> CLI 상태바 셋업을 시작합니다..." -ForegroundColor Cyan

# 1. Antigravity 디렉토리 확인 및 생성
if (-not (Test-Path $agyDir)) {
    New-Item -ItemType Directory -Path $agyDir -Force | Out-Null
}

# 2. statusline.js 복사 또는 생성
$targetJs = Join-Path $agyDir "statusline.js"
$templatePath = Join-Path $PSScriptRoot "statusline-template.js"

if (Test-Path $templatePath) {
    Copy-Item $templatePath $targetJs -Force
}

# 3. statusline.cmd 생성
$cmdPath = Join-Path $agyDir "statusline.cmd"
Set-Content -Path $cmdPath -Value "@echo off`r`nnode `"%~dp0statusline.js`"" -Encoding ascii

# 4. Antigravity settings.json에 statusLine 등록
$settingsPath = Join-Path $agyDir "settings.json"
$settings = @{}
if (Test-Path $settingsPath) {
    try {
        $settings = (Get-Content $settingsPath -Raw) | ConvertFrom-Json -AsHashtable
    } catch {}
}
if ($null -eq $settings) { $settings = @{} }

$settings["statusLine"] = @{
    "type" = "command"
    "command" = $cmdPath
    "enabled" = $true
}

$settings | ConvertTo-Json -Depth 10 | Set-Content -Path $settingsPath -Encoding utf8

# 5. Orca agent-hooks 연동 (Orca 사용 환경인 경우)
if (Test-Path $orcaHooksDir) {
    Copy-Item $targetJs (Join-Path $orcaHooksDir "antigravity-statusline.js") -Force -ErrorAction SilentlyContinue
    Write-Host "-> Orca agent-hooks 동기화 완료" -ForegroundColor DarkGray
}

# 6. Claude Code 연동 (Claude Code 사용 환경인 경우)
if (Test-Path $claudeDir) {
    Copy-Item $targetJs (Join-Path $claudeDir "statusline-extra.js") -Force -ErrorAction SilentlyContinue
    Write-Host "-> Claude Code statusline 동기화 완료" -ForegroundColor DarkGray
}

Write-Host "CLI 상태바 셋업이 완료되었습니다!" -ForegroundColor Green
Write-Host "   - 상태바 스크립트: $targetJs" -ForegroundColor White
Write-Host "   - 실행 래퍼 명령: $cmdPath" -ForegroundColor White
Write-Host "   - 설정 파일: $settingsPath" -ForegroundColor White
