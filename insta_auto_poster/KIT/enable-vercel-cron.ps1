# Vercel 유료(Pro) 구독자 전용: 예약 발행 확인을 Vercel 예약 호출(1분)로 켜고 다시 배포합니다. (2026-10-19)
# 무료(Hobby) 요금제는 하루 1번만 허용되어 배포가 실패합니다 → 무료는 사이트 설정 「⏰ 예약 발행」에서 「내 cron-job.org」를 쓰세요(기본).
# 실행: 프로그램 폴더에서  powershell -ExecutionPolicy Bypass -File KIT\enable-vercel-cron.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$path = Join-Path $root "vercel.json"
$dispatch = "/api/posts/dispatch-scheduled"
if (Test-Path $path) { $json = Get-Content $path -Raw -Encoding UTF8 | ConvertFrom-Json } else { $json = [pscustomobject]@{} }
if (-not ($json.PSObject.Properties.Name -contains "crons")) { $json | Add-Member -NotePropertyName crons -NotePropertyValue @() }
if ($json.crons | Where-Object { $_.path -eq $dispatch }) {
  Write-Host "[OK] 이미 Vercel 예약 호출(1분)이 켜져 있습니다." -ForegroundColor Green
} else {
  $json.crons = @([pscustomobject]@{ path = $dispatch; schedule = "* * * * *" }) + @($json.crons)
  $text = $json | ConvertTo-Json -Depth 5
  [System.IO.File]::WriteAllText($path, $text, (New-Object System.Text.UTF8Encoding($false)))
  Write-Host "[OK] vercel.json에 1분 예약 호출을 추가했습니다." -ForegroundColor Green
}
# 사이트가 "Vercel 예약 호출이 켜져 있음"을 알게 하는 표시(키 없는 회원도 예약 가능). 끄려면 Vercel에서 이 환경변수를 지우고 다시 배포.
"on" | npx --yes vercel@latest env add INSTA_PLATFORM_SCHEDULER production --force | Out-Null
Write-Host "[OK] 환경변수 INSTA_PLATFORM_SCHEDULER=on 등록" -ForegroundColor Green
Write-Host "다시 배포합니다(Vercel Pro가 아니면 여기서 실패합니다)..." -ForegroundColor Cyan
npx --yes vercel@latest deploy --prod --yes
if ($LASTEXITCODE -ne 0) {
  Write-Host "[주의] 배포가 실패했습니다. 무료(Hobby) 요금제라면 프로그램 폴더의 vercel.json 파일을 지우고 「내 cron-job.org」 방식을 쓰세요." -ForegroundColor Yellow
  exit 1
}
Write-Host "==== 완료: 이제 Vercel이 1분마다 예약 글을 확인합니다. 사이트 설정 ⏰ 예약 발행에서 「Vercel 예약 호출」을 고른 회원은 cron-job.org 키 없이 예약할 수 있습니다(기본은 cron-job.org 그대로). ====" -ForegroundColor Green
