# =====================================================================
# 대화형 설치 스크립트 (Windows PowerShell) — 강의용 설치 키트 2026-10-18
# 실행 방법: 프로그램 폴더(이 KIT 폴더의 한 단계 위)에서
#   powershell -ExecutionPolicy Bypass -File KIT\setup.ps1
# 하는 일: ① Node.js 확인 ② 패키지 설치 ③ 설정값 입력 → .env.local 생성
#          ④ 내 컴퓨터에서 빌드 확인 ⑤ (원하면) Vercel 배포 + 환경변수 등록
# 비밀번호·키는 이 컴퓨터의 .env.local 과 본인 Vercel 프로젝트에만 저장됩니다.
# =====================================================================
$ErrorActionPreference = "Stop"
$ProgramDir = Split-Path $PSScriptRoot -Parent
Set-Location $ProgramDir
$KitInfo = Get-Content (Join-Path $PSScriptRoot "kit.json") -Raw -Encoding UTF8 | ConvertFrom-Json

function Say($text) { Write-Host $text -ForegroundColor Cyan }
function Ok($text) { Write-Host "  [OK] $text" -ForegroundColor Green }
function Warn($text) { Write-Host "  [주의] $text" -ForegroundColor Yellow }
function Ask($question, $default) {
  if ($default) { $answer = Read-Host "$question [$default]" } else { $answer = Read-Host $question }
  if ([string]::IsNullOrWhiteSpace($answer)) { return $default }
  return $answer.Trim()
}

Say ""
Say "==== $($KitInfo.title) 설치를 시작합니다 ===="
Say "폴더: $ProgramDir"

# ① Node.js
Say "`n[1/5] Node.js 확인"
try { $nodeVersion = (node -v) } catch { $nodeVersion = $null }
if (-not $nodeVersion) {
  Warn "Node.js가 없습니다. https://nodejs.org 에서 LTS(22 이상)를 설치한 뒤 이 창을 닫고 다시 실행하세요."
  exit 1
}
$major = [int]($nodeVersion.TrimStart("v").Split(".")[0])
if ($major -lt 20) { Warn "Node.js $nodeVersion 은 너무 낮습니다. 20 이상(권장 22 LTS)으로 올려 주세요."; exit 1 }
Ok "Node.js $nodeVersion"

# ② 패키지 설치
Say "`n[2/5] 패키지 설치 (처음에는 몇 분 걸립니다)"
npm install
if ($LASTEXITCODE -ne 0) { Warn "npm install 실패. 위 오류를 확인하세요."; exit 1 }
Ok "패키지 설치 완료"

# ③ 설정값
Say "`n[3/5] 설정값 입력 (Supabase → Project Settings → API 화면을 옆에 열어 두세요)"
$envFile = Join-Path $ProgramDir ".env.local"
$writeEnv = $true
if (Test-Path $envFile) {
  $re = Ask "이미 .env.local 이 있습니다. 새로 만들까요? (y/n)" "n"
  if ($re -ne "y") { $writeEnv = $false; Ok "기존 .env.local 을 그대로 씁니다." }
}
if ($writeEnv) {
  $project = Ask "Vercel 프로젝트 이름(영문 소문자·숫자·-, 예: my-$($KitInfo.shortName))" "my-$($KitInfo.shortName)"
  $siteUrl = Ask "사이트 주소(모르면 그대로 Enter, 배포 후 다시 맞춥니다)" "https://$project.vercel.app"
  $brand = Ask "화면에 표시할 내 이름/브랜드(예: 홍길동 마케팅, 비우면 표시 안 함)" ""
  $supabaseUrl = Ask "Supabase Project URL (https://xxxx.supabase.co)" ""
  $anonKey = Ask "Supabase anon(public) 또는 Publishable key" ""
  $serviceKey = Ask "Supabase service_role 또는 Secret key (절대 공개 금지)" ""
  $bytes = New-Object byte[] 24; [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $cronSecret = -join ($bytes | ForEach-Object { $_.ToString("x2") })
  $lines = @(
    "# $($KitInfo.title) — 독립 운영 설정 (setup.ps1 이 만든 파일, 절대 공개·커밋 금지)",
    "NEXT_PUBLIC_STANDALONE_MODE=true",
    "NEXT_PUBLIC_SITE_URL=$siteUrl",
    "NEXT_PUBLIC_SUPABASE_URL=$supabaseUrl",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY=$anonKey",
    "SUPABASE_SERVICE_ROLE_KEY=$serviceKey",
    "CRON_SECRET=$cronSecret",
    "NEXT_PUBLIC_BRAND_NAME=$brand",
    "VERCEL_PROJECT_NAME=$project"
  )
  [System.IO.File]::WriteAllLines($envFile, $lines, (New-Object System.Text.UTF8Encoding $false))
  Ok ".env.local 생성 (CRON_SECRET 자동 생성: 예약 게시 연결 때 사용 — 파일에서 확인)"
}

# ④ 빌드 확인
Say "`n[4/5] 내 컴퓨터에서 빌드 확인"
npm run build
if ($LASTEXITCODE -ne 0) { Warn "빌드 실패. 위 오류와 KIT\README.md 의 '자주 막히는 곳'을 확인하세요."; exit 1 }
Ok "빌드 성공"

# ⑤ Vercel 배포
Say "`n[5/5] Vercel 배포"
$deploy = Ask "지금 Vercel에 배포할까요? (y/n)" "y"
if ($deploy -ne "y") { Say "나중에 이 스크립트를 다시 실행하거나 KIT\README.md 4단계를 따라 배포하세요."; exit 0 }

$envMap = @{}
Get-Content $envFile -Encoding UTF8 | Where-Object { $_ -match "^[A-Z_]+=" } | ForEach-Object { $k, $v = $_ -split "=", 2; $envMap[$k] = $v }
$project = $envMap["VERCEL_PROJECT_NAME"]

Say "브라우저가 열리면 본인 Vercel 계정으로 로그인하세요."
npx --yes vercel@latest login
npx --yes vercel@latest link --yes --project $project
if ($LASTEXITCODE -ne 0) { Warn "Vercel 프로젝트 연결 실패. 프로젝트 이름을 바꿔 다시 시도하세요."; exit 1 }

function Push-Env($name, $value) {
  if ([string]::IsNullOrWhiteSpace($value)) { return }
  $value | npx --yes vercel@latest env add $name production --force | Out-Null
  Ok "환경변수 $name 등록"
}
foreach ($k in @("NEXT_PUBLIC_STANDALONE_MODE","NEXT_PUBLIC_SITE_URL","NEXT_PUBLIC_BRAND_NAME","NEXT_PUBLIC_SUPABASE_URL","NEXT_PUBLIC_SUPABASE_ANON_KEY","SUPABASE_SERVICE_ROLE_KEY","CRON_SECRET")) { Push-Env $k $envMap[$k] }

npx --yes vercel@latest deploy --prod --yes
if ($LASTEXITCODE -ne 0) { Warn "배포 실패. 위 오류를 확인하세요."; exit 1 }

Say "`nVercel 대시보드 → 이 프로젝트 → Settings → Domains 에 보이는 주소를 확인하세요."
$realUrl = Ask "실제 사이트 주소" $envMap["NEXT_PUBLIC_SITE_URL"]
if ($realUrl -ne $envMap["NEXT_PUBLIC_SITE_URL"]) {
  (Get-Content $envFile -Encoding UTF8) -replace "^NEXT_PUBLIC_SITE_URL=.*", "NEXT_PUBLIC_SITE_URL=$realUrl" | Set-Content $envFile -Encoding UTF8
  Push-Env "NEXT_PUBLIC_SITE_URL" $realUrl
  Say "주소가 바뀌어 한 번 더 배포합니다."
  npx --yes vercel@latest deploy --prod --yes
}

Say "`n==== 설치 완료 ===="
Say "사이트: $realUrl"
Say "Meta 앱 콜백 주소: $realUrl$($KitInfo.callbackPath)"
Say "다음 단계: KIT\README.md 의 5단계(Meta 앱 설정)부터 진행하세요."
