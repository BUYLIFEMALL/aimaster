# GIF 자동화 「내 PC 고속 변환」 로컬 렌더러 — 윈도우 설치(무료, 관리자 권한 불필요).
# install-windows.bat 을 더블클릭하면 이 스크립트가 실행된다. (이 파일은 BOM 있는 UTF-8 — PowerShell 5.1 한글 표시용)
# 하는 일: ① host.ps1·host.bat 을 %LOCALAPPDATA%\BuylifeGifRenderer 로 복사 ② ffmpeg 찾기(없으면 winget 으로 Gyan.FFmpeg 설치)
#          ③ 크롬 연결 등록(HKCU\Software\Google\Chrome\NativeMessagingHosts\xyz.buylife.gif_renderer)
$ErrorActionPreference = 'Stop'
$HostName = 'xyz.buylife.gif_renderer'
$ExtId = 'efgimakonmphcdojhiegemjmpbokpcgk'
# 배포 ZIP 은 이 스크립트 옆에 host\ 가 있고, 저장소에서는 한 단계 위(local-renderer\host)에 있다.
$Src = if (Test-Path (Join-Path $PSScriptRoot 'host\host.ps1')) { $PSScriptRoot } else { Split-Path -Parent $PSScriptRoot }
$Dest = Join-Path $env:LOCALAPPDATA 'BuylifeGifRenderer'

Write-Host '▶ GIF 자동화 내 PC 고속 변환 — 설치를 시작합니다.'
New-Item -ItemType Directory -Path $Dest -Force | Out-Null
Copy-Item (Join-Path $Src 'host\host.ps1') $Dest -Force
Copy-Item (Join-Path $Src 'host\host.bat') $Dest -Force

function Find-Ffmpeg {
  $cmd = Get-Command ffmpeg -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $link = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Links\ffmpeg.exe'
  if (Test-Path $link) { return $link }
  $pkg = Get-ChildItem (Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages') -Filter ffmpeg.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($pkg) { return $pkg.FullName }
  return $null
}

$ffmpeg = Find-Ffmpeg
if (-not $ffmpeg) {
  $winget = Get-Command winget -ErrorAction SilentlyContinue
  if ($winget) {
    Write-Host '▶ ffmpeg 가 없어 winget 으로 설치합니다(무료, 몇 분 걸릴 수 있습니다).'
    & winget install --id Gyan.FFmpeg -e --scope user --accept-source-agreements --accept-package-agreements
    $ffmpeg = Find-Ffmpeg
  }
}
if (-not $ffmpeg) {
  Write-Host '✖ ffmpeg 를 찾지 못했습니다. https://www.gyan.dev/ffmpeg/builds/ 에서 받아 ffmpeg.exe 를' -ForegroundColor Red
  Write-Host "  $Dest 폴더에 넣은 뒤 이 설치를 다시 실행해 주세요." -ForegroundColor Red
  exit 1
}

$utf8 = New-Object System.Text.UTF8Encoding($false)
[IO.File]::WriteAllText((Join-Path $Dest 'config.json'), (@{ ffmpeg = $ffmpeg } | ConvertTo-Json -Compress), $utf8)
$manifestPath = Join-Path $Dest "$HostName.json"
$manifest = [ordered]@{
  name            = $HostName
  description     = 'VideoToGIF local renderer'
  path            = (Join-Path $Dest 'host.bat')
  type            = 'stdio'
  allowed_origins = @("chrome-extension://$ExtId/")
}
[IO.File]::WriteAllText($manifestPath, ($manifest | ConvertTo-Json), $utf8)
$key = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$HostName"
New-Item -Path $key -Force | Out-Null
Set-Item -Path $key -Value $manifestPath

Write-Host "✔ 설치했습니다. ffmpeg: $ffmpeg" -ForegroundColor Green
Write-Host '  이제 크롬에서 「GIF 자동화 · 내 PC 고속 변환」 확장을 켜고 GIF 자동화 화면을 새로고침하세요.'
